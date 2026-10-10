import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { actOnGroup, newGroup, tokenHash } from "../lib/group-orders/store";
import {
  startGroupPayment,
  handleGroupSession,
  handleFailedGroupSession,
  reconcileGroup,
} from "../lib/group-orders/payments";
import { swishInstruction } from "../lib/group-orders/swish";
import { POST as swishCallback } from "../app/api/group-orders/swish-callback/route";
import type { GroupRow } from "../lib/group-orders/model";
import { groupBody, validWorkerSecret } from "../lib/group-orders/http";

test("group service: concurrent guests, payment retries, partial payment, cancellation and late webhooks", async (t) => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://group-test.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "isolated-test-key";
  process.env.NEXT_PUBLIC_SITE_URL = "https://restaurant.test";
  process.env.CRON_SECRET = "a".repeat(64);
  process.env.SWISH_BACKEND_URL = "https://swish-test.invalid";
  process.env.SWISH_INTERNAL_SECRET = "internal-test-secret";
  const swish = new Map<string, Record<string, unknown>>();
  let swishCreates = 0,
    swishRefunds = 0,
    uncertainSwish = false;
  const options = {
    card_enabled: true,
    swish_enabled: true,
    cash_enabled: true,
    pickup_enabled: true,
    delivery_enabled: true,
  };
  const rows = new Map<string, GroupRow>();
  const products = [
    {
      id: randomUUID(),
      name: "Caesar",
      price: 129.5,
      is_available: true,
      track_stock: true,
      stock_quantity: 20,
    },
  ];
  let fulfilled = 0;
  let failSessionSave = false;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.hostname === "swish-test.invalid") {
        const body = JSON.parse(String(init?.body));
        if (!swish.has(body.id)) {
          if (body.operation === "create") swishCreates++;
          else if (body.operation === "refund") swishRefunds++;
          else throw new Error("Missing payment");
          swish.set(body.id, {
            id: body.id,
            currency: "SEK",
            amount: (body.amount / 100).toFixed(2),
            payeePaymentReference: body.reference,
            originalPaymentReference: body.originalPaymentReference,
            status: body.operation === "refund" ? "DEBITED" : "CREATED",
          });
          if (uncertainSwish) {
            uncertainSwish = false;
            throw new Error("Lost Swish response");
          }
        }
        const result = swish.get(body.id)!;
        if (body.operation === "cancel" && result.status === "CREATED")
          result.status = "CANCELLED";
        return new Response(JSON.stringify(result));
      }
      assert.equal(
        url.hostname,
        "group-test.invalid",
        "tests must never access production",
      );
      const table = url.pathname.split("/").at(-1);
      const headers = new Headers(init?.headers);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      const method = init?.method || "GET";
      const id = url.searchParams.get("id")?.replace("eq.", "");
      let result: unknown = [];
      if (table === "group_orders") {
        if (method === "POST") {
          rows.set(body.id, structuredClone(body));
          result = body;
        } else {
          const row = id ? rows.get(id) : undefined;
          if (method === "PATCH") {
            if (
              failSessionSave &&
              body.state?.payments.some(
                (payment: { sessionId?: string }) => payment.sessionId,
              )
            ) {
              failSessionSave = false;
              return new Response(
                JSON.stringify({ message: "Simulated database failure" }),
                { status: 503 },
              );
            }
            if (
              row &&
              row.version ===
                Number(url.searchParams.get("version")?.replace("eq.", ""))
            ) {
              Object.assign(row, structuredClone(body));
              result = structuredClone(row);
            } else result = null;
          } else result = row ? [structuredClone(row)] : [];
        }
      } else if (table === "products") result = products;
      else if (table === "restaurant_shift_state") result = [{ is_open: true }];
      else if (table === "business_settings") result = [options];
      else if (table === "finalize_group_order") {
        const row = rows.get(body.p_id)!;
        if (
          row.version === body.p_version &&
          row.state.status === "paying" &&
          row.state.payments.every(
            (payment) =>
              payment.status ===
              (row.state.paymentMethod === "cash" ? "pay_on_site" : "paid"),
          )
        ) {
          row.state.status = "submitted";
          row.version++;
          fulfilled++;
        }
        result = row.state.status === "submitted";
      } else throw new Error(`Unexpected table: ${table}`);
      if (
        headers.get("accept")?.includes("vnd.pgrst.object") &&
        Array.isArray(result)
      )
        result = result[0] || null;
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  const sessions = new Map<string, Stripe.Checkout.Session>();
  const refunds = new Map<string, Stripe.Refund>();
  const byKey = new Map<string, Stripe.Checkout.Session>();
  let created = 0;
  let refundCalls = 0;
  let refundPending = false;
  const stripe = {
    checkout: {
      sessions: {
        create: async (
          params: Stripe.Checkout.SessionCreateParams,
          options: Stripe.RequestOptions,
        ) => {
          if (byKey.has(options.idempotencyKey!))
            return structuredClone(byKey.get(options.idempotencyKey!)!);
          const session = {
            id: `cs_${created++}`,
            url: "https://checkout.stripe.com/test",
            status: "open",
            currency: "sek",
            payment_status: "unpaid",
            payment_intent: null,
            amount_total: params.line_items![0].price_data!.unit_amount,
            metadata: params.metadata,
          } as Stripe.Checkout.Session;
          sessions.set(session.id, session);
          byKey.set(options.idempotencyKey!, session);
          return structuredClone(session);
        },
        retrieve: async (id: string) => structuredClone(sessions.get(id)!),
        expire: async (id: string) => {
          const session = sessions.get(id)!;
          if (session.status !== "open") throw new Error("Already complete");
          session.status = "expired";
          return structuredClone(session);
        },
      },
    },
    refunds: {
      create: async (
        _params: Stripe.RefundCreateParams,
        options: Stripe.RequestOptions,
      ) => {
        if (refunds.has(options.idempotencyKey!))
          return refunds.get(options.idempotencyKey!)!;
        const refund = {
          id: `re_${++refundCalls}`,
          status: refundPending ? "pending" : "succeeded",
        } as Stripe.Refund;
        refunds.set(options.idempotencyKey!, refund);
        return refund;
      },
      retrieve: async (id: string) =>
        Array.from(refunds.values()).find((refund) => refund.id === id),
    },
  } as unknown as Stripe;
  async function prepared(
    mode: "host" | "split",
    paymentMethod: "card" | "swish" | "cash" = "card",
  ) {
    const row = await newGroup(
      { name: "Lunch", memberName: "Host", mode },
      "host-secret",
    );
    const host = tokenHash("host-secret"),
      guest = tokenHash("guest-secret");
    await actOnGroup(row.id, guest, { action: "join", name: "Guest" });
    const items = [{ productId: products[0].id, quantity: 1, note: "" }];
    await Promise.all([
      actOnGroup(row.id, host, { action: "items", revision: 0, items }),
      actOnGroup(row.id, guest, { action: "items", revision: 0, items }),
    ]);
    assert.equal(
      rows
        .get(row.id)!
        .state.members.filter((member) => member.items.length === 1).length,
      2,
    );
    await assert.rejects(
      actOnGroup(row.id, guest, { action: "items", revision: 0, items }),
      /conflict/,
    );
    await assert.rejects(
      actOnGroup(row.id, guest, { action: "cancel" }),
      /hostOnly/,
    );
    await Promise.all([
      actOnGroup(row.id, host, { action: "ready", revision: 1, ready: true }),
      actOnGroup(row.id, guest, { action: "ready", revision: 1, ready: true }),
    ]);
    await actOnGroup(row.id, host, {
      action: "lock",
      paymentMethod,
      version: rows.get(row.id)!.version,
      customer: { name: "Host", phone: "0701234567", deliveryType: "pickup" },
    });
    await assert.rejects(
      actOnGroup(row.id, guest, { action: "items", revision: 2, items }),
      /locked/,
    );
    return { id: row.id, host, guest };
  }
  function pay(session: Stripe.Checkout.Session) {
    session.status = "complete";
    session.payment_status = "paid";
    session.payment_intent = `pi_${session.id}`;
    return structuredClone(session);
  }
  const split = await prepared("split");
  await assert.rejects(
    startGroupPayment(split.id, split.host, stripe, undefined, {
      amount: 1,
      method: "card",
    }),
    /conflict/,
  );
  assert.equal(created, 0);
  await Promise.all([
    startGroupPayment(split.id, split.host, stripe),
    startGroupPayment(split.id, split.host, stripe),
  ]);
  assert.equal(created, 1, "double-click must reuse the same Checkout Session");
  const first = pay(
    sessions.get(rows.get(split.id)!.state.payments[0].sessionId!)!,
  );
  await handleGroupSession(first, stripe);
  assert.equal(fulfilled, 0, "partial payment cannot fulfill the order");
  await startGroupPayment(split.id, split.guest, stripe);
  const second = pay(
    sessions.get(rows.get(split.id)!.state.payments[1].sessionId!)!,
  );
  await Promise.all([
    handleGroupSession(second, stripe),
    handleGroupSession(second, stripe),
  ]);
  await reconcileGroup(split.id, stripe);
  assert.equal(fulfilled, 1);
  await assert.rejects(
    actOnGroup(split.id, split.host, { action: "cancel" }),
    /alreadySubmitted/,
  );

  const abandoned = await prepared("split");
  await startGroupPayment(abandoned.id, abandoned.host, stripe);
  const paid = pay(
    sessions.get(rows.get(abandoned.id)!.state.payments[0].sessionId!)!,
  );
  await handleGroupSession(paid, stripe);
  await startGroupPayment(abandoned.id, abandoned.guest, stripe);
  await actOnGroup(abandoned.id, abandoned.host, { action: "cancel" });
  await reconcileGroup(abandoned.id, stripe);
  await handleGroupSession(paid, stripe); // delayed webhook after a successful refund
  await reconcileGroup(abandoned.id, stripe);
  assert.equal(refundCalls, 1);
  assert.equal(rows.get(abandoned.id)!.state.payments[0].status, "refunded");
  assert.equal(rows.get(abandoned.id)!.state.payments[1].status, "expired");
  assert.equal(fulfilled, 1);

  const hostPay = await prepared("host");
  await assert.rejects(
    startGroupPayment(hostPay.id, hostPay.guest, stripe),
    /hostOnly/,
  );
  await startGroupPayment(hostPay.id, hostPay.host, stripe);
  const hostSession = sessions.get(
    rows.get(hostPay.id)!.state.payments[0].sessionId!,
  )!;
  assert.equal(hostSession.amount_total, 25900);
  await handleGroupSession(pay(hostSession), stripe);
  assert.equal(fulfilled, 2);

  const failed = await prepared("split");
  await startGroupPayment(failed.id, failed.host, stripe);
  await handleGroupSession(
    pay(sessions.get(rows.get(failed.id)!.state.payments[0].sessionId!)!),
    stripe,
  );
  await startGroupPayment(failed.id, failed.guest, stripe);
  const failedSession = sessions.get(
    rows.get(failed.id)!.state.payments[1].sessionId!,
  )!;
  await handleFailedGroupSession(
    { ...failedSession, status: "expired" },
    stripe,
  );
  assert.equal(rows.get(failed.id)!.state.status, "cancelled");
  assert.equal(refundCalls, 2);
  assert.equal(fulfilled, 2);

  const uncertain = await prepared("host");
  const countBefore = created;
  failSessionSave = true;
  await assert.rejects(
    startGroupPayment(uncertain.id, uncertain.host, stripe),
    /unavailable/,
  );
  await startGroupPayment(uncertain.id, uncertain.host, stripe);
  assert.equal(
    created,
    countBefore + 1,
    "DB failure after Stripe creation must not create a second charge",
  );
  await handleGroupSession(
    pay(sessions.get(rows.get(uncertain.id)!.state.payments[0].sessionId!)!),
    stripe,
  );
  assert.equal(fulfilled, 3);

  const timeout = await prepared("split");
  await startGroupPayment(timeout.id, timeout.host, stripe);
  await handleGroupSession(
    pay(sessions.get(rows.get(timeout.id)!.state.payments[0].sessionId!)!),
    stripe,
  );
  rows.get(timeout.id)!.state.paymentDeadline = new Date(
    Date.now() - 1000,
  ).toISOString();
  refundPending = true;
  await reconcileGroup(timeout.id, stripe);
  const refundedShare = rows.get(timeout.id)!.state.payments[0];
  assert.equal(rows.get(timeout.id)!.state.status, "cancelled");
  assert.equal(refundedShare.status, "refunding");
  Array.from(refunds.values()).find(
    (refund) => refund.id === refundedShare.refundId,
  )!.status = "succeeded";
  await reconcileGroup(timeout.id, stripe);
  assert.equal(rows.get(timeout.id)!.state.payments[0].status, "refunded");
  assert.equal(fulfilled, 3);

  // Swish-only settings must not require a Stripe key or enable card payments.
  options.card_enabled = false;
  const swishGroup = await prepared("split", "swish");
  await assert.rejects(
    startGroupPayment(swishGroup.id, swishGroup.host, undefined, "invalid"),
    /invalidPhone/,
  );
  uncertainSwish = true;
  await assert.rejects(
    startGroupPayment(swishGroup.id, swishGroup.host, undefined, "0701234567"),
    /Lost Swish response/,
  );
  await startGroupPayment(
    swishGroup.id,
    swishGroup.host,
    undefined,
    "0701234567",
  );
  assert.equal(swishCreates, 1);
  const shares = rows.get(swishGroup.id)!.state.payments;
  const firstSwish = swish.get(swishInstruction(shares[0].id))!;
  // A forged callback claiming PAID must not override a provider GET returning CREATED.
  const callback = await swishCallback(
    new Request(
      `https://restaurant.test/api/group-orders/swish-callback?groupId=${swishGroup.id}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: firstSwish.id, status: "PAID" }),
      },
    ),
  );
  assert.equal(callback.status, 200);
  assert.equal(rows.get(swishGroup.id)!.state.payments[0].status, "pending");
  firstSwish.status = "PAID";
  firstSwish.paymentReference = "SWISHFIRST";
  await reconcileGroup(swishGroup.id);
  assert.equal(rows.get(swishGroup.id)!.state.status, "paying");
  await startGroupPayment(
    swishGroup.id,
    swishGroup.guest,
    undefined,
    "0701234568",
  );
  const secondSwish = swish.get(swishInstruction(shares[1].id))!;
  secondSwish.status = "PAID";
  secondSwish.paymentReference = "SWISHSECOND";
  await Promise.all([
    reconcileGroup(swishGroup.id),
    reconcileGroup(swishGroup.id),
  ]);
  assert.equal(
    fulfilled,
    4,
    "one order after both Swish shares, even with duplicate notifications",
  );
  const swishCancel = await prepared("split", "swish");
  await startGroupPayment(
    swishCancel.id,
    swishCancel.host,
    undefined,
    "0701234567",
  );
  const cancelShares = rows.get(swishCancel.id)!.state.payments;
  Object.assign(swish.get(swishInstruction(cancelShares[0].id))!, {
    status: "PAID",
    paymentReference: "SWISHCANCEL",
  });
  await reconcileGroup(swishCancel.id);
  await startGroupPayment(
    swishCancel.id,
    swishCancel.guest,
    undefined,
    "0701234568",
  );
  await actOnGroup(swishCancel.id, swishCancel.host, { action: "cancel" });
  await reconcileGroup(swishCancel.id);
  assert.equal(rows.get(swishCancel.id)!.state.payments[0].status, "refunding");
  assert.equal(rows.get(swishCancel.id)!.state.payments[1].status, "expired");
  swish.get(swishInstruction(cancelShares[0].id, true))!.status = "PAID";
  await reconcileGroup(swishCancel.id);
  await reconcileGroup(swishCancel.id);
  assert.equal(rows.get(swishCancel.id)!.state.payments[0].status, "refunded");
  assert.equal(swishRefunds, 1);
  const cash = await prepared("split", "cash");
  await startGroupPayment(cash.id, cash.host);
  assert.equal(fulfilled, 4);
  assert.equal(rows.get(cash.id)!.state.payments[0].status, "pay_on_site");
  await startGroupPayment(cash.id, cash.guest);
  assert.equal(fulfilled, 5);
  assert.equal(rows.get(cash.id)!.state.status, "submitted");
  options.cash_enabled = false;
  await assert.rejects(prepared("host", "cash"), /optionUnavailable/);
  options.card_enabled = true;

  const expiredSelection = await newGroup(
    { name: "Deadline", memberName: "Host", mode: "host" },
    "late-host",
  );
  rows.get(expiredSelection.id)!.state.deadline = new Date(
    Date.now() - 1000,
  ).toISOString();
  const confirmed = await actOnGroup(
    expiredSelection.id,
    tokenHash("late-host"),
    { action: "ready", ready: true, revision: 0 },
  );
  assert.equal(confirmed.state.members[0].ready, true);
  await assert.rejects(
    actOnGroup(expiredSelection.id, tokenHash("late-host"), {
      action: "ready",
      ready: false,
      revision: 1,
    }),
    /deadlinePassed/,
  );

  const soldOut = await newGroup(
    { name: "Stock", memberName: "Host", mode: "host" },
    "stock-host",
  );
  await actOnGroup(soldOut.id, tokenHash("stock-host"), {
    action: "items",
    revision: 0,
    items: [{ productId: products[0].id, quantity: 2 }],
  });
  products[0].is_available = false;
  const reduced = await actOnGroup(soldOut.id, tokenHash("stock-host"), {
    action: "items",
    revision: 1,
    items: [{ productId: products[0].id, quantity: 1 }],
  });
  assert.equal(reduced.state.members[0].items[0].quantity, 1);
  const removed = await actOnGroup(soldOut.id, tokenHash("stock-host"), {
    action: "items",
    revision: 2,
    items: [],
  });
  assert.equal(removed.state.members[0].items.length, 0);

  await assert.rejects(
    groupBody(
      new Request("https://restaurant.test/api/group-orders", {
        method: "POST",
        headers: {
          origin: "https://evil.test",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    ),
    /forbidden/,
  );
  assert.equal(
    await validWorkerSecret(
      new Request("https://restaurant.test", {
        headers: { authorization: `Bearer ${"b".repeat(64)}` },
      }),
    ),
    false,
  );
  assert.equal(
    await validWorkerSecret(
      new Request("https://restaurant.test", {
        headers: { authorization: `Bearer ${"a".repeat(64)}` },
      }),
    ),
    true,
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import {
  actOnGroup,
  newGroup,
  tokenHash,
  checkoutSettings,
} from "../lib/group-orders/store";
import {
  startGroupPayment,
  handleGroupSession,
  handleFailedGroupSession,
  reconcileGroup,
} from "../lib/group-orders/payments";
import { swishInstruction } from "../lib/group-orders/swish";
import { POST as swishCallback } from "../app/api/group-orders/swish-callback/route";
import type { CatalogProduct, GroupRow } from "../lib/group-orders/model";
import { groupBody, validWorkerSecret } from "../lib/group-orders/http";

test("group service: concurrent guests, payment retries, partial payment, cancellation and late webhooks", async (t) => {
  t.mock.method(Date, "now", () => Date.parse("2026-10-11T07:00:00Z"));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://group-test.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "isolated-test-key";
  process.env.NEXT_PUBLIC_SITE_URL = "https://restaurant.test";
  process.env.CRON_SECRET = "a".repeat(64);
  process.env.SWISH_BACKEND_URL = "https://swish-test.invalid";
  process.env.SWISH_INTERNAL_SECRET = "internal-test-secret";
  process.env.GROUP_SWISH_ENABLED = "true";
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
  const groupsByCreateToken = new Map<string, GroupRow>();
  const products: CatalogProduct[] = [
    {
      id: randomUUID(),
      name: "Caesar",
      category: "sallad",
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
      if (table === "create_group_with_capacity") {
        assert.equal(body.p_token_hash, body.p_state.members[0].tokenHash);
        assert.equal(body.p_count, body.p_state.participantCount);
        assert.equal(body.p_pickup, body.p_state.pickupAt);
        result = groupsByCreateToken.get(body.p_token_hash);
        if (!result) {
          result = {
            id: body.p_id,
            version: 1,
            state: structuredClone(body.p_state),
          };
          groupsByCreateToken.set(
            body.p_token_hash,
            structuredClone(result as GroupRow),
          );
          rows.set(body.p_id, structuredClone(result as GroupRow));
        }
      } else if (table === "group_orders") {
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
  delete process.env.GROUP_SWISH_ENABLED;
  await assert.rejects(
    checkoutSettings("pickup", "swish"),
    /optionUnavailable/,
  );
  await checkoutSettings("pickup", "card");
  process.env.GROUP_SWISH_ENABLED = "true";
  await checkoutSettings("pickup", "swish");
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
    const hostSecret = `host-secret-${randomUUID()}`;
    const row = await newGroup(
      {
        pickupAt: "2026-10-11T08:40:00Z",
        participantCount: 3,
        name: "Lunch",
        memberName: "Host",
        mode,
        ...(paymentMethod !== "card" ? { paymentMethod } : {}),
      },
      hostSecret,
    );
    const host = tokenHash(hostSecret),
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

  const portionGroup = await newGroup(
    {
      pickupAt: "2026-10-11T08:40:00Z",
      participantCount: 3,
      name: "Portions",
      memberName: "Host",
      mode: "host",
    },
    "portion-limit-host",
  );
  const portionHost = tokenHash("portion-limit-host"),
    portionGuest = tokenHash("portion-limit-guest");
  await actOnGroup(portionGroup.id, portionHost, {
    action: "items",
    revision: 0,
    items: [{ productId: products[0].id, quantity: 2 }],
  });
  await actOnGroup(portionGroup.id, portionGuest, {
    action: "join",
    name: "Guest",
  });
  await actOnGroup(portionGroup.id, portionGuest, {
    action: "items",
    revision: 0,
    items: [{ productId: products[0].id, quantity: 1 }],
  });
  await assert.rejects(
    actOnGroup(portionGroup.id, portionGuest, {
      action: "items",
      revision: 1,
      items: [{ productId: products[0].id, quantity: 2 }],
    }),
    /groupPortionLimit/,
  );

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
  // Disabling new Swish checkout must not stop verification/refunds already in flight.
  process.env.GROUP_SWISH_ENABLED = "false";
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
  await assert.rejects(
    startGroupPayment(swishGroup.id, swishGroup.guest, undefined, "0701234568"),
    /optionUnavailable/,
  );
  process.env.GROUP_SWISH_ENABLED = "true";
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
  process.env.GROUP_SWISH_ENABLED = "false";
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
    {
      pickupAt: "2026-10-11T08:40:00Z",
      participantCount: 3,
      name: "Deadline",
      memberName: "Host",
      mode: "host",
    },
    "late-host",
  );
  rows.get(expiredSelection.id)!.state.deadline = new Date(
    Date.now() - 1000,
  ).toISOString();
  await assert.rejects(
    actOnGroup(expiredSelection.id, tokenHash("late-host"), {
      action: "ready",
      ready: true,
      revision: 0,
    }),
    /deadlinePassed/,
  );

  const soldOut = await newGroup(
    {
      pickupAt: "2026-10-11T08:40:00Z",
      participantCount: 3,
      name: "Stock",
      memberName: "Host",
      mode: "host",
    },
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

  products[0].is_available = true;
  products[0].modifier_groups = [
    {
      id: "filling",
      name: "Filling",
      min: 1,
      max: 1,
      options: [
        { id: "plain", name: "Plain", price: 0 },
        { id: "extra", name: "Extra", price: 3000 },
      ],
    },
  ];
  const configured = await newGroup(
    {
      pickupAt: "2026-10-11T08:40:00Z",
      participantCount: 3,
      name: "Choices",
      memberName: "Host",
      mode: "host",
      spendLimit: 15000,
    },
    "choices-host",
  );
  const configuredHash = tokenHash("choices-host");
  await assert.rejects(
    actOnGroup(configured.id, configuredHash, {
      action: "items",
      revision: 0,
      items: [{ productId: products[0].id, quantity: 1 }],
    }),
    /invalidSelection/,
  );
  await actOnGroup(configured.id, configuredHash, {
    action: "items",
    revision: 0,
    items: [
      {
        productId: products[0].id,
        quantity: 1,
        selections: [{ groupId: "filling", optionIds: ["plain"] }],
      },
    ],
  });
  await assert.rejects(
    actOnGroup(configured.id, configuredHash, {
      action: "items",
      revision: 1,
      items: [
        {
          productId: products[0].id,
          quantity: 1,
          selections: [{ groupId: "filling", optionIds: ["extra"] }],
        },
      ],
    }),
    /spendLimitExceeded/,
  );
  const configuredRow = rows.get(configured.id)!;
  assert.equal(
    configuredRow.state.members[0].items[0].selections?.[0].optionIds[0],
    "plain",
    "same-quantity variant changes must be re-priced before saving",
  );
  await actOnGroup(configured.id, configuredHash, {
    action: "items",
    revision: 1,
    items: [
      {
        productId: products[0].id,
        quantity: 1,
        selections: [{ groupId: "filling", optionIds: ["plain"] }],
        note: "No onion",
      },
    ],
  });
  assert.equal(
    rows.get(configured.id)!.state.members[0].items[0].note,
    "No onion",
  );

  // A guest pays before the organiser is ready; payment survives the final group lock.
  products[0].modifier_groups = [];
  options.cash_enabled = true;
  options.card_enabled = true;
  const independent = await newGroup(
    {
      pickupAt: "2026-10-11T08:40:00Z",
      participantCount: 3,
      name: "Independent",
      memberName: "Host",
      mode: "split",
    },
    "early-host",
  );
  const independentState = rows.get(independent.id)!.state;
  assert.equal(independentState.individualCheckout, true);
  assert.equal(independentState.customer, null);
  assert.equal(independentState.paymentDeadline, independentState.expiresAt);
  assert.equal(independentState.deadline, independentState.expiresAt);
  const earlyHost = tokenHash("early-host"),
    earlyGuest = tokenHash("early-guest");
  await actOnGroup(independent.id, earlyGuest, {
    action: "join",
    name: "Early guest",
  });
  const earlyItems = [{ productId: products[0].id, quantity: 1 }];
  await actOnGroup(independent.id, earlyGuest, {
    action: "items",
    revision: 0,
    items: earlyItems,
  });
  await actOnGroup(independent.id, earlyGuest, {
    action: "ready",
    revision: 1,
    ready: true,
  });
  const earlyPayment = structuredClone(
    rows.get(independent.id)!.state.payments[0],
  );
  const fulfilledBeforeEarly = fulfilled;
  await Promise.all([
    startGroupPayment(independent.id, earlyGuest, stripe),
    startGroupPayment(independent.id, earlyGuest, stripe),
  ]);
  assert.equal(
    rows.get(independent.id)!.state.status,
    "open",
    "other participants must still be able to choose",
  );
  assert.equal(rows.get(independent.id)!.state.members[0].ready, false);
  const earlySession = sessions.get(
    rows.get(independent.id)!.state.payments[0].sessionId!,
  )!;
  await handleGroupSession(pay(earlySession), stripe);
  assert.equal(
    fulfilled,
    fulfilledBeforeEarly,
    "an early share must not prematurely submit a partial kitchen order",
  );
  assert.equal(rows.get(independent.id)!.state.payments[0].status, "paid");
  await assert.rejects(
    actOnGroup(independent.id, earlyGuest, {
      action: "ready",
      revision: 2,
      ready: false,
    }),
    /selectionPaid/,
  );
  await assert.rejects(
    actOnGroup(independent.id, earlyGuest, {
      action: "items",
      revision: 2,
      items: [],
    }),
    /selectionPaid/,
  );
  await assert.rejects(
    actOnGroup(independent.id, earlyHost, {
      action: "remove",
      version: rows.get(independent.id)!.version,
      memberId: rows.get(independent.id)!.state.members[1].id,
    }),
    /selectionPaid/,
  );
  products[0].price = 150;
  await actOnGroup(independent.id, earlyHost, {
    action: "items",
    revision: 0,
    items: earlyItems,
  });
  await actOnGroup(independent.id, earlyHost, {
    action: "ready",
    revision: 1,
    ready: true,
  });
  await assert.rejects(
    actOnGroup(independent.id, earlyHost, {
      action: "lock",
      version: rows.get(independent.id)!.version,
      paymentMethod: "cash",
      customer: { name: "Host", phone: "0701234567", deliveryType: "pickup" },
    }),
    /conflict/,
  );
  await actOnGroup(independent.id, earlyHost, {
    action: "lock",
    version: rows.get(independent.id)!.version,
    paymentMethod: "card",
    customer: { name: "Host", phone: "0701234567", deliveryType: "pickup" },
  });
  const frozen = rows
    .get(independent.id)!
    .state.payments.find((p) => p.id === earlyPayment.id)!;
  assert.equal(
    frozen.amount,
    earlyPayment.amount,
    "the paid participant's price must stay frozen after catalog changes",
  );
  assert.equal(frozen.status, "paid");
  await startGroupPayment(independent.id, earlyHost, stripe);
  const hostShare = rows
    .get(independent.id)!
    .state.payments.find(
      (p) => p.memberId === rows.get(independent.id)!.state.hostId,
    )!;
  assert.equal(hostShare.amount, 15000);
  await handleGroupSession(pay(sessions.get(hostShare.sessionId!)!), stripe);
  assert.equal(fulfilled, fulfilledBeforeEarly + 1);
  assert.equal(rows.get(independent.id)!.state.status, "submitted");

  // Cancellation while only one guest paid must refund that exact share once.
  const cancelledEarly = await newGroup(
    {
      pickupAt: "2026-10-11T09:00:00Z",
      participantCount: 3,
      name: "Cancel early",
      memberName: "Host",
      mode: "split",
      paymentMethod: "card",
      customer: { name: "Host", phone: "0701234567", deliveryType: "pickup" },
    },
    "cancel-early-host",
  );
  const cancelEarlyHash = tokenHash("cancel-early-host");
  await actOnGroup(cancelledEarly.id, cancelEarlyHash, {
    action: "items",
    revision: 0,
    items: earlyItems,
  });
  await actOnGroup(cancelledEarly.id, cancelEarlyHash, {
    action: "ready",
    revision: 1,
    ready: true,
  });
  await startGroupPayment(cancelledEarly.id, cancelEarlyHash, stripe);
  await handleGroupSession(
    pay(
      sessions.get(rows.get(cancelledEarly.id)!.state.payments[0].sessionId!)!,
    ),
    stripe,
  );
  await actOnGroup(cancelledEarly.id, cancelEarlyHash, { action: "cancel" });
  const refundsBeforeEarly = refundCalls;
  refundPending = false;
  await reconcileGroup(cancelledEarly.id, stripe);
  await reconcileGroup(cancelledEarly.id, stripe);
  assert.equal(refundCalls, refundsBeforeEarly + 1);
  assert.equal(
    rows.get(cancelledEarly.id)!.state.payments[0].status,
    "refunded",
  );
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

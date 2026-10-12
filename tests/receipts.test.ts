import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import { isAuthorizedStripeReceipt } from "../lib/orders/stripe-receipt-access";
import {
  generateReceiptPdf,
  receiptFilename,
  type ReceiptOrder,
} from "../lib/orders/receipt-pdf";
import {
  loadOrderReceipt,
  paidReceiptSession,
  sendReceiptEmail,
  ReceiptError,
} from "../lib/orders/receipt-service";
import { groupReceiptPayment } from "../lib/group-orders/receipt";
import { createGroup, type GroupRow } from "../lib/group-orders/model";
import { POST as emailRoute } from "../app/api/orders/send-receipt/route";

const receipt: ReceiptOrder = {
  id: "order-1",
  order_number: "order-1",
  display_order_number: "125",
  order_date: "2026-10-12",
  payment_method: "card",
  payment_status: "paid",
  payment_reference: "pi_1",
  stripe_session_id: "cs_test_12345",
  stripe_payment_intent_id: "pi_1",
  total_gross: 350,
  total_net: 330.19,
  total_vat: 19.81,
  vat_rate: 6,
  address: "SSAB, Luleå",
  items: [
    {
      name: "Polsk Kebab - Nöt",
      quantity: 2,
      price: 175,
      line_total_gross: 350,
    },
  ],
  created_at: "2026-10-12T10:35:00Z",
  paid_at: "2026-10-12T10:35:00Z",
};
const session = {
  id: receipt.stripe_session_id!,
  payment_status: "paid",
  metadata: { orderId: receipt.order_number! },
};
test("receipt access binds the paid order and Stripe session in both directions", () => {
  assert.ok(isAuthorizedStripeReceipt(receipt, session));
  for (const change of [
    { payment_status: "unpaid" },
    { payment_method: "cash" },
    { stripe_session_id: "cs_other" },
    { order_number: "other" },
  ])
    assert.equal(
      isAuthorizedStripeReceipt({ ...receipt, ...change }, session),
      false,
    );
  for (const change of [
    { id: "cs_other" },
    { payment_status: "unpaid" },
    { metadata: null },
    { metadata: { orderId: "other" } },
  ])
    assert.equal(
      isAuthorizedStripeReceipt(receipt, { ...session, ...change }),
      false,
    );
});

test("Stripe receipts require successful captured payment and reject refunded charges", async () => {
  const paid = {
    ...session,
    currency: "sek",
    payment_intent: {
      id: "pi_1",
      status: "succeeded",
      latest_charge: { paid: true, amount_refunded: 0, created: 1791801300 },
    },
  };
  const fake = (data: unknown) =>
    ({
      checkout: { sessions: { retrieve: async () => data } },
    }) as unknown as Stripe;
  assert.equal(
    (await paidReceiptSession(session.id, fake(paid))).intentId,
    "pi_1",
  );
  for (const data of [
    { ...paid, currency: "eur" },
    { ...paid, payment_status: "unpaid" },
    { ...paid, payment_intent: "pi_1" },
    {
      ...paid,
      payment_intent: {
        ...paid.payment_intent,
        latest_charge: { paid: true, amount_refunded: 1 },
      },
    },
    {
      ...paid,
      payment_intent: { ...paid.payment_intent, status: "processing" },
    },
  ])
    await assert.rejects(
      paidReceiptSession(session.id, fake(data)),
      ReceiptError,
    );
  await assert.rejects(paidReceiptSession("invalid", fake(paid)), ReceiptError);
});

test("order receipt rejects wrong or missing capability before contacting Stripe and never updates customer email", async (t) => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://receipt-test.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, options?: RequestInit) => {
      assert.equal(new URL(String(input)).hostname, "receipt-test.invalid");
      assert.equal(options?.method || "GET", "GET");
      return new Response(JSON.stringify(receipt), {
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  await assert.rejects(
    loadOrderReceipt(receipt.order_number!, null),
    (error: unknown) => error instanceof ReceiptError && error.status === 403,
  );
  await assert.rejects(
    loadOrderReceipt(receipt.order_number!, "cs_other"),
    ReceiptError,
  );
  await assert.rejects(loadOrderReceipt("../123", session.id), ReceiptError);
});

test("group payer receipts use only their own immutable lines, host mode includes all paid items", () => {
  const host = {
    id: "host",
    tokenHash: "host-secret",
    name: "Host",
    ready: true,
    revision: 0,
    items: [],
  };
  const state = createGroup(
    {
      name: "SSAB",
      mode: "split",
      locale: "sv",
      participantCount: 2,
      pickupAt: "2026-10-12T09:00:00Z",
    },
    host,
    "order-id",
    Date.parse("2026-10-12T08:00:00Z"),
  );
  state.paymentMethod = "card";
  state.members.push({
    ...host,
    id: "guest",
    tokenHash: "guest-secret",
    name: "Guest",
  });
  state.lines = ["host", "guest"].map((memberId) => ({
    productId: "food",
    quantity: 1,
    note: "",
    name: `Food ${memberId}`,
    unitAmount: 10000,
    memberId,
    memberName: memberId,
  }));
  state.payments = ["host", "guest"].map((memberId) => ({
    id: memberId,
    memberId,
    amount: 10000,
    status: "paid",
    sessionId: `cs_${memberId}`,
    intentId: `pi_${memberId}`,
  }));
  const row: GroupRow = { id: "group", version: 1, state };
  assert.deepEqual(
    groupReceiptPayment(row, "guest-secret").lines.map((l) => l.name),
    ["Food guest"],
  );
  assert.throws(() => groupReceiptPayment(row, "unknown"));
  for (const status of [
    "pending",
    "refunding",
    "refunded",
    "expired",
  ] as const) {
    state.payments[1].status = status;
    assert.throws(() => groupReceiptPayment(row, "guest-secret"));
  }
  state.mode = "host";
  state.payments = [{ ...state.payments[0], amount: 20000 }];
  assert.equal(groupReceiptPayment(row, "host-secret").lines.length, 2);
  assert.throws(() => groupReceiptPayment(row, "guest-secret"));
  state.payments[0].amount = 10000;
  assert.throws(() => groupReceiptPayment(row, "host-secret"));
});

test("PDF receipts render deterministically, handle multi-page orders and sanitize attachment names", async () => {
  const pdf = await generateReceiptPdf(receipt);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.deepEqual(await generateReceiptPdf(receipt), pdf);
  const large = await generateReceiptPdf({
    ...receipt,
    items: Array.from({ length: 60 }, (_, i) => ({
      name: `${i} Polsk kebab med kyckling, extra ost, vitlökssås och alla tillval`,
      quantity: 1,
      price: 5,
    })),
  });
  assert.ok(large.length > pdf.length * 2);
  assert.equal(
    receiptFilename({
      ...receipt,
      display_order_number: '../bad\r\n"name',
    }).includes("\n"),
    false,
  );
});

test("receipt email sends one bounded PDF attachment with idempotency, no host-header fetch or customer mutation", async (t) => {
  process.env.RESEND_API_KEY = "test-only";
  process.env.RECEIPT_FROM_EMAIL = "Receipt <receipt@example.test>";
  const keys: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(url, "https://api.resend.com/emails");
      assert.ok(init?.signal);
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.to, ["person@example.test"]);
      assert.equal(body.attachments.length, 1);
      assert.equal(
        Buffer.from(body.attachments[0].content, "base64")
          .subarray(0, 5)
          .toString(),
        "%PDF-",
      );
      keys.push((init?.headers as Record<string, string>)["Idempotency-Key"]);
      return new Response(JSON.stringify({ id: "email_test" }), {
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  await sendReceiptEmail(receipt, " Person@example.test ");
  await sendReceiptEmail(receipt, "person@example.test");
  assert.equal(keys[0], keys[1]);
  await assert.rejects(sendReceiptEmail(receipt, "invalid"), ReceiptError);
  delete process.env.RESEND_API_KEY;
  await assert.rejects(
    sendReceiptEmail(receipt, "person@example.test"),
    (error: unknown) =>
      error instanceof ReceiptError && error.code === "emailUnavailable",
  );
});

test("malformed receipt requests fail with validation errors instead of a server crash", async () => {
  for (const input of ["null", "{", "[]", '{"orderNumber":23}']) {
    const response = await emailRoute(
      new Request("https://restaurant.test/api/orders/send-receipt", {
        method: "POST",
        body: input,
      }),
    );
    assert.equal(response.status, 400);
  }
});

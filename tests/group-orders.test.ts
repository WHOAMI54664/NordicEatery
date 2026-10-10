import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import {
  createGroup,
  parseItems,
  parseCustomer,
  priceGroup,
  publicGroup,
  requireMember,
  requireHost,
  requireOpen,
  lockGroup,
  type GroupMember,
} from "../lib/group-orders/model";
import {
  confirmGroupPayment,
  sessionParams,
} from "../lib/group-orders/payments";

const now = Date.now();
const member = (name = "Alex"): GroupMember => ({
  id: randomUUID(),
  tokenHash: `secret-${name}`,
  name,
  items: [],
  ready: true,
  revision: 0,
});
const product = {
  id: randomUUID(),
  name: "Caesar",
  price: 129.5,
  is_available: true,
  track_stock: true,
  stock_quantity: 10,
};
const customer = parseCustomer({
  name: "Alex",
  phone: "+46701234567",
  email: "",
  deliveryType: "pickup",
  address: "",
  comment: "",
});
function group(mode: "host" | "split" = "host") {
  const host = member();
  host.items = [{ productId: product.id, quantity: 1, note: "No croutons" }];
  const guest = member("Guest");
  guest.items = [{ productId: product.id, quantity: 2, note: "" }];
  const state = createGroup(
    { name: "Team lunch", mode, locale: "en" },
    host,
    randomUUID(),
    now,
  );
  state.members.push(guest);
  return state;
}
test("input rejects invalid quantities, duplicate products and oversized notes", () => {
  for (const quantity of [0, -1, 1.5, 21, "2", Infinity, null])
    assert.throws(() => parseItems([{ productId: product.id, quantity }]));
  assert.throws(() =>
    parseItems([
      { productId: product.id, quantity: 1 },
      { productId: product.id, quantity: 2 },
    ]),
  );
  assert.throws(() =>
    parseItems([{ productId: product.id, quantity: 1, note: "a".repeat(201) }]),
  );
  assert.deepEqual(
    parseItems([
      { productId: product.id, quantity: 2, price: 0, memberId: "other" },
    ]),
    [{ productId: product.id, quantity: 2, note: "" }],
  );
});
test("server prices, aggregate stock and per-member limits are enforced", () => {
  const state = group();
  const lines = priceGroup(state.members, [product], null);
  assert.equal(lines[0].unitAmount, 12950);
  assert.equal(
    lines.reduce((total, line) => total + line.unitAmount * line.quantity, 0),
    38850,
  );
  assert.throws(() =>
    priceGroup(state.members, [{ ...product, stock_quantity: 2 }], null),
  );
  assert.throws(() =>
    priceGroup(state.members, [{ ...product, is_available: false }], null),
  );
  assert.throws(() => priceGroup(state.members, [product], 20000));
  assert.throws(() =>
    priceGroup(state.members, [{ ...product, price: NaN }], null),
  );
});
test("host payment and split shares preserve exact ore totals and participant attribution", () => {
  const host = lockGroup(group(), customer, [product], randomUUID, now);
  assert.equal(host.payments.length, 1);
  assert.equal(host.payments[0].amount, 38850);
  const split = lockGroup(group("split"), customer, [product], randomUUID, now);
  assert.deepEqual(
    split.payments.map((payment) => payment.amount),
    [12950, 25900],
  );
  assert.equal(split.lines[0].note, "No croutons");
  assert.equal(split.lines[1].memberName, "Guest");
  assert.equal(Date.parse(split.paymentDeadline!) - now, 3600000);
});
test("guests cannot act as host; invitation responses expose no credentials or contact details", () => {
  const state = lockGroup(group(), customer, [product], randomUUID, now);
  const row = { id: randomUUID(), version: 1, state };
  assert.throws(() => requireMember(state, "unknown"));
  assert.throws(() => requireHost(state, state.members[1]));
  assert.equal(publicGroup(row, "unknown").members.length, 0);
  assert.equal(publicGroup(row, state.members[1].tokenHash).customer, null);
  const serialized = JSON.stringify(
    publicGroup(row, state.members[1].tokenHash),
  );
  for (const secret of [
    state.members[0].tokenHash,
    state.members[1].tokenHash,
    customer.phone,
    state.orderId,
    state.payments[0].id,
  ])
    assert.ok(!serialized.includes(secret));
});
test("deadline prevents edits, but a ready group can still be locked after choosing ends", () => {
  const state = group();
  state.deadline = new Date(now - 1).toISOString();
  assert.throws(() => requireOpen(state, now));
  assert.equal(
    lockGroup(state, customer, [product], randomUUID, now).status,
    "locked",
  );
  state.members[1].ready = false;
  assert.throws(() => lockGroup(state, customer, [product], randomUUID, now));
});
test("payment confirmation rejects wrong amounts, currency, session or intent; replays preserve refunds", () => {
  const state = lockGroup(group(), customer, [product], randomUUID, now);
  const payment = state.payments[0];
  payment.attemptedAt = new Date(now).toISOString();
  const session = {
    id: "cs_test_1",
    payment_intent: "pi_test_1",
    payment_status: "paid",
    amount_total: payment.amount,
    currency: "sek",
    metadata: { group_payment_id: payment.id },
  } as unknown as Stripe.Checkout.Session;
  for (const change of [
    { amount_total: 1 },
    { currency: "eur" },
    { payment_intent: null },
    { metadata: { group_payment_id: "wrong" } },
  ])
    assert.throws(() =>
      confirmGroupPayment(structuredClone(state), {
        ...session,
        ...change,
      } as Stripe.Checkout.Session),
    );
  confirmGroupPayment(state, session);
  assert.equal(payment.status, "paid");
  assert.throws(() =>
    confirmGroupPayment(state, { ...session, id: "cs_other" }),
  );
  assert.throws(() =>
    confirmGroupPayment(state, { ...session, payment_intent: "pi_other" }),
  );
  payment.status = "refunded";
  confirmGroupPayment(state, session);
  assert.equal(payment.status, "refunded");
});
test("Stripe checkout uses immutable server amount and does not include personal contact data", () => {
  const state = lockGroup(group("split"), customer, [product], randomUUID, now);
  const params = sessionParams(randomUUID(), state, state.payments[1]);
  assert.equal(params.line_items?.[0].price_data?.unit_amount, 25900);
  assert.deepEqual(params.payment_method_types, ["card"]);
  assert.ok(!JSON.stringify(params).includes(customer.phone));
  assert.ok(!JSON.stringify(params).includes(state.members[0].tokenHash));
});

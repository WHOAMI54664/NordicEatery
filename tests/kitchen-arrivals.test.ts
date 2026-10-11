import assert from "node:assert/strict";
import { test } from "node:test";
import { kitchenArrivals } from "../lib/kitchen-arrivals";

test("kitchen sound ignores initial snapshot, duplicates, unpaid online orders and status edits", () => {
  const cash = {
    id: "cash",
    status: "new",
    payment_method: "cash",
    payment_status: "unpaid",
  };
  const card = {
    id: "card",
    status: "new",
    payment_method: "card",
    payment_status: "awaiting_payment",
  };
  const baseline = kitchenArrivals(null, [cash, card]);
  assert.deepEqual(baseline.arrivals, []);
  assert.deepEqual(kitchenArrivals(baseline.ids, [cash, card]).arrivals, []);
  const paid = { ...card, payment_status: "paid" };
  const arrived = kitchenArrivals(baseline.ids, [cash, paid]);
  assert.deepEqual(
    arrived.arrivals.map((o) => o.id),
    ["card"],
  );
  assert.deepEqual(kitchenArrivals(arrived.ids, [cash, paid]).arrivals, []);
  assert.deepEqual(
    kitchenArrivals(arrived.ids, [
      { ...cash, status: "preparing" },
      { ...paid, status: "ready" },
    ]).arrivals,
    [],
  );
  assert.deepEqual(
    kitchenArrivals(arrived.ids, [
      cash,
      paid,
      { ...cash, id: "new-group" },
    ]).arrivals.map((o) => o.id),
    ["new-group"],
  );
  assert.deepEqual(
    kitchenArrivals(arrived.ids, [
      { ...cash, status: "cancelled" },
      { ...paid, payment_status: "refunded" },
    ]).arrivals,
    [],
  );
});

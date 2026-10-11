import assert from "node:assert/strict";
import test from "node:test";
import {
  canShowGroupPickup,
  GROUP_PICKUP_MAP_URL,
} from "../lib/group-orders/pickup";

type PickupGroup = Parameters<typeof canShowGroupPickup>[0];
const group: PickupGroup = {
  me: { id: "guest", isHost: false },
  mode: "split",
  status: "open",
  deliveryType: "pickup",
  payments: [
    { memberId: "host", status: "paid", amount: 10000, started: true },
    { memberId: "guest", status: "pending", amount: 10000, started: true },
  ],
};

test("group pickup appears after the member pays independently, without waiting for the host", () => {
  assert.equal(canShowGroupPickup(group), false);
  const paid: PickupGroup = {
    ...group,
    payments: group.payments.map((p) => ({ ...p, status: "paid" })),
  };
  assert.equal(canShowGroupPickup(paid), true);
  assert.equal(canShowGroupPickup({ ...paid, status: "submitted" }), true);
  assert.equal(canShowGroupPickup({ ...paid, status: "cancelled" }), false);
  assert.equal(
    canShowGroupPickup({ ...paid, orderStatus: "cancelled" }),
    false,
  );
  assert.equal(canShowGroupPickup({ ...paid, me: null }), false);
  assert.equal(
    canShowGroupPickup({ ...paid, deliveryType: "delivery" }),
    false,
  );
  for (const status of [
    "pending",
    "pay_on_site",
    "expired",
    "refunding",
    "refunded",
  ] as const) {
    assert.equal(
      canShowGroupPickup({
        ...paid,
        payments: [{ ...paid.payments[1], status }],
      }),
      false,
    );
  }
});

test("host payment unlocks pickup directions for all group members", () => {
  assert.equal(canShowGroupPickup({ ...group, mode: "host" }), true);
  assert.equal(
    canShowGroupPickup({ ...group, mode: "host", payments: [] }),
    false,
  );
});

test("group pickup uses the customer's exact coordinates and a fixed HTTPS maps destination", () => {
  const url = new URL(GROUP_PICKUP_MAP_URL);
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.pathname, "/maps/search/");
  assert.equal(url.searchParams.get("query"), "65.557719,22.237107");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { validPickupTime, stockholmDateTime } from "../lib/group-orders/slots";
import { createGroup, lockGroup } from "../lib/group-orders/model";

test("Stockholm daily slots honor DST, midnight, exact time and expiry", () => {
  assert.equal(
    validPickupTime("2026-10-11T08:40:00Z", Date.parse("2026-10-11T07:00:00Z")),
    true,
  );
  assert.equal(
    validPickupTime("2026-12-11T09:40:00Z", Date.parse("2026-12-11T07:00:00Z")),
    true,
  );
  assert.equal(
    validPickupTime("2026-12-11T08:40:00Z", Date.parse("2026-12-11T07:00:00Z")),
    true,
  );
  assert.equal(
    validPickupTime("2026-10-11T08:40:00Z", Date.parse("2026-10-11T08:40:00Z")),
    false,
  );
  assert.equal(
    validPickupTime("2026-10-11T07:20:00Z", Date.parse("2026-10-11T07:00:00Z")),
    false,
  );
  assert.equal(
    validPickupTime("2026-10-12T08:40:00Z", Date.parse("2026-10-11T07:00:00Z")),
    false,
  );
  assert.equal(
    validPickupTime("2026-10-11T08:40:01Z", Date.parse("2026-10-11T07:00:00Z")),
    false,
  );
  assert.equal(stockholmDateTime("2026-10-11T22:00:00Z").date, "2026-10-12");
  const host = {
    id: randomUUID(),
    tokenHash: "host",
    name: "Host",
    ready: true,
    revision: 0,
    items: [{ productId: "dish", quantity: 1, note: "" }],
  };
  const now = Date.parse("2026-10-11T08:00:00Z");
  const group = createGroup(
    {
      name: "Lunch",
      mode: "host",
      pickupAt: "2026-10-11T08:40:00Z",
      deadline: "2026-10-11T09:00:00Z",
    },
    host,
    randomUUID(),
    now,
  );
  assert.equal(group.expiresAt, "2026-10-11T08:20:00.000Z");
  assert.equal(Date.parse(group.deadline!), Date.parse(group.expiresAt));
  const locked = lockGroup(
    group,
    {
      name: "Host",
      phone: "0701234567",
      email: "",
      deliveryType: "pickup",
      address: "Pickup",
      comment: "",
    },
    [{ id: "dish", name: "Dish", price: 100, is_available: true }],
    randomUUID,
    now,
  );
  assert.equal(
    Date.parse(locked.paymentDeadline!),
    Date.parse(group.expiresAt),
  );
});

test("SQL slots: unique reservation, cancellation, rollover, private notifications and retry leases", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE group_orders(id uuid PRIMARY KEY, state jsonb, status text GENERATED ALWAYS AS(state->>'status') STORED);
      CREATE TABLE orders(id uuid PRIMARY KEY, group_order_id uuid REFERENCES group_orders(id));
      CREATE FUNCTION public.slot_test_now() RETURNS timestamptz LANGUAGE sql STABLE AS $$ SELECT current_setting('test.clock')::timestamptz $$;
      SET test.clock='2026-10-11T07:00:00Z';`);
    // Virtual database clock only; production SQL/constraints/triggers are unchanged.
    const migration = (
      await readFile("supabase-migration-group-slots.sql", "utf8")
    )
      .replaceAll("now()", "public.slot_test_now()")
      .replaceAll("clock_timestamp()", "public.slot_test_now()");
    await db.exec(migration);
    await db.exec(migration);
    const availability = async () =>
      (
        await db.query<{
          result: {
            date: string;
            slots: { pickupAt: string; available: boolean }[];
          };
        }>("SELECT group_pickup_availability() result")
      ).rows[0].result;
    const first = await availability();
    assert.equal(first.date, "2026-10-11");
    assert.ok(first.slots.every((s) => s.available));
    const state = (pickupAt: string) => ({
      pickupAt,
      status: "open",
      expiresAt: pickupAt,
    });
    const ids = [randomUUID(), randomUUID()];
    const results = await Promise.allSettled(
      ids.map((id) =>
        db.query("INSERT INTO group_orders(id,state) VALUES($1,$2)", [
          id,
          state(first.slots[0].pickupAt),
        ]),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.match(
      String(
        (results.find((r) => r.status === "rejected") as PromiseRejectedResult)
          .reason,
      ),
      /group_orders_one_pickup_slot/,
    );
    const reservedId = ids[results.findIndex((r) => r.status === "fulfilled")];
    await assert.rejects(
      db.query("UPDATE group_orders SET state=$2 WHERE id=$1", [
        reservedId,
        state(first.slots[1].pickupAt),
      ]),
      /slotImmutable/,
    );
    await db.query("INSERT INTO orders(id,group_order_id) VALUES($1,$2)", [
      randomUUID(),
      reservedId,
    ]);
    assert.equal(
      (
        await db.query<{ pickup_at: Date }>("SELECT pickup_at FROM orders")
      ).rows[0].pickup_at.toISOString(),
      "2026-10-11T08:40:00.000Z",
    );
    await db.query("INSERT INTO group_orders(id,state) VALUES($1,$2)", [
      randomUUID(),
      state(first.slots[1].pickupAt),
    ]);
    assert.ok((await availability()).slots.every((s) => !s.available));
    await db.exec(
      "SELECT subscribe_group_slot_email('example@example.test','sv'); SELECT subscribe_group_slot_email('example@example.test','ru');",
    );
    assert.equal(
      (await db.query("SELECT * FROM group_slot_notifications")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("SELECT * FROM claim_group_slot_email()")).rows.length,
      0,
    );
    await db.query(
      "UPDATE group_orders SET state=jsonb_set(state,'{status}','\"cancelled\"') WHERE id=$1",
      [reservedId],
    );
    assert.equal((await availability()).slots[0].available, true);
    const claimed = (
      await db.query<{ id: string; unsubscribe_token: string }>(
        "SELECT * FROM claim_group_slot_email()",
      )
    ).rows[0];
    assert.ok(claimed.id);
    assert.equal(
      (await db.query("SELECT * FROM claim_group_slot_email()")).rows.length,
      0,
    );
    await db.exec("SET test.clock='2026-10-11T07:06:00Z'");
    assert.equal(
      (await db.query<{ id: string }>("SELECT * FROM claim_group_slot_email()"))
        .rows[0].id,
      claimed.id,
    );
    await db.query("SELECT unsubscribe_group_slot_email($1)", [
      claimed.unsubscribe_token,
    ]);
    assert.equal(
      (await db.query("SELECT * FROM claim_group_slot_email()")).rows.length,
      0,
    );
    await db.exec("SET test.clock='2026-10-11T09:00:00Z'");
    assert.ok((await availability()).slots.every((s) => !s.available));
    await assert.rejects(
      db.query("INSERT INTO group_orders(id,state) VALUES($1,$2)", [
        randomUUID(),
        state("2026-10-11T09:00:00Z"),
      ]),
      /slotUnavailable/,
    );
    await db.exec("SET test.clock='2026-10-11T22:00:00Z'");
    assert.equal((await availability()).date, "2026-10-12");
    assert.ok((await availability()).slots.every((s) => s.available));
    await db.exec(
      "SELECT subscribe_group_slot_email('retry@example.test','en')",
    );
    await db.query("SELECT * FROM claim_group_slot_email()");
    await db.exec("SET test.clock='2026-10-12T22:00:00Z'");
    assert.equal(
      (await db.query("SELECT * FROM claim_group_slot_email()")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          "SELECT status FROM group_slot_notifications WHERE email='retry@example.test'",
        )
      ).rows[0].status,
      "failed",
    );
    const protectedId = randomUUID();
    const protectedState = {
      ...state((await availability()).slots[0].pickupAt),
      individualCheckout: true,
      paymentMethod: "card",
      members: [{ id: "member", items: [{ productId: "dish", quantity: 1 }] }],
      payments: [
        {
          id: "payment",
          memberId: "member",
          amount: 10000,
          attemptedAt: "2026-10-12T22:00:00Z",
          status: "paid",
        },
      ],
      lines: [
        {
          memberId: "member",
          productId: "dish",
          unitAmount: 10000,
          quantity: 1,
        },
      ],
    };
    await db.query("INSERT INTO group_orders(id,state) VALUES($1,$2)", [
      protectedId,
      protectedState,
    ]);
    for (const changed of [
      { ...protectedState, payments: [] },
      { ...protectedState, members: [] },
      { ...protectedState, lines: [] },
      { ...protectedState, paymentMethod: "cash" },
    ])
      await assert.rejects(
        db.query("UPDATE group_orders SET state=$2 WHERE id=$1", [
          protectedId,
          changed,
        ]),
        /selectionPaid/,
      );
    await db.query("UPDATE group_orders SET state=$2 WHERE id=$1", [
      protectedId,
      {
        ...protectedState,
        status: "cancelled",
        payments: [{ ...protectedState.payments[0], status: "refunded" }],
      },
    ]);
    await db.exec("SET ROLE anon");
    for (const query of [
      "SELECT * FROM group_slot_notifications",
      "SELECT group_pickup_availability()",
      "SELECT * FROM claim_group_slot_email()",
      "SELECT subscribe_group_slot_email('x@y.test','en')",
    ])
      await assert.rejects(db.query(query), /permission denied/);
  } finally {
    await db.close();
  }
});

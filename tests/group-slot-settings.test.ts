import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  parseScheduleSlots,
  type GroupSchedule,
} from "../lib/group-orders/schedule";
import {
  isGroupAvailability,
  validPickupTime,
  type GroupAvailability,
} from "../lib/group-orders/slots";

test("configurable slots validate unique minute times and allow a paused schedule", () => {
  assert.deepEqual(parseScheduleSlots([]), []);
  assert.deepEqual(
    parseScheduleSlots([
      { time: "14:15", enabled: false },
      { time: "09:05", enabled: true },
    ]),
    [
      { time: "09:05", enabled: true },
      { time: "14:15", enabled: false },
    ],
  );
  for (const value of [
    null,
    {},
    [{ time: "24:00", enabled: true }],
    [{ time: "9:05", enabled: true }],
    [{ time: "09:05:01", enabled: true }],
    [{ time: "09:05", enabled: "true" }],
    [
      { time: "09:05", enabled: true },
      { time: "09:05", enabled: false },
    ],
    Array.from({ length: 49 }, (_, i) => ({
      time: `${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}`,
      enabled: true,
    })),
  ]) {
    assert.equal(parseScheduleSlots(value), null);
  }
  assert.equal(isGroupAvailability({ date: "2026-10-11", slots: [] }), true);
  const slot = {
    time: "14:15",
    pickupAt: "2026-10-11T12:15:00Z",
    available: true,
  };
  assert.equal(
    isGroupAvailability({ date: "2026-10-11", slots: [slot] }),
    true,
  );
  assert.equal(
    isGroupAvailability({ date: "2026-10-11", slots: [slot, slot] }),
    false,
  );
  assert.equal(
    isGroupAvailability({
      date: "2026-10-11",
      slots: [{ ...slot, time: "14:16" }],
    }),
    false,
  );
  assert.equal(
    validPickupTime("2026-02-31T08:40:00Z", Date.parse("2026-03-03T07:00:00Z")),
    false,
  );
  assert.equal(
    validPickupTime(slot.pickupAt, Date.parse("2026-10-11T07:00:00Z")),
    true,
  );
});

test("SQL schedule edits preserve bookings, serialize revisions, enforce permissions and drive notifications", async () => {
  const db = new PGlite();
  const owner = randomUUID(),
    cook = randomUUID();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE profiles(id uuid PRIMARY KEY,role text);
      CREATE TABLE group_orders(id uuid PRIMARY KEY,state jsonb,status text GENERATED ALWAYS AS(state->>'status') STORED);
      CREATE TABLE orders(id uuid PRIMARY KEY,group_order_id uuid REFERENCES group_orders(id));
      CREATE FUNCTION public.slot_test_now() RETURNS timestamptz LANGUAGE sql STABLE AS $$ SELECT current_setting('test.clock')::timestamptz $$;
      SET test.clock='2026-10-11T07:00:00Z';`);
    await db.query("INSERT INTO profiles VALUES($1,'owner'),($2,'cook')", [
      owner,
      cook,
    ]);
    const virtual = (s: string) =>
      s
        .replaceAll("now()", "public.slot_test_now()")
        .replaceAll("clock_timestamp()", "public.slot_test_now()");
    await db.exec(
      virtual(await readFile("supabase-migration-group-slots.sql", "utf8")),
    );
    const migration = virtual(
      await readFile("supabase-migration-group-slot-settings.sql", "utf8"),
    );
    await db.exec(migration);
    const get = async () =>
      (
        await db.query<{ result: GroupSchedule }>(
          "SELECT get_group_slot_schedule() result",
        )
      ).rows[0].result;
    const available = async () =>
      (
        await db.query<{ result: GroupAvailability }>(
          "SELECT group_pickup_availability() result",
        )
      ).rows[0].result;
    const save = async (version: number, slots: unknown, actor = owner) =>
      (
        await db.query<{ result: GroupSchedule }>(
          "SELECT save_group_slot_schedule($1,$2,$3) result",
          [version, slots, actor],
        )
      ).rows[0].result;
    const insert = async (pickupAt: string) => {
      const id = randomUUID(),
        state = { pickupAt, expiresAt: pickupAt, status: "open" };
      await db.query("INSERT INTO group_orders VALUES($1,$2)", [id, state]);
      return { id, state };
    };
    assert.equal((await get()).version, 1);
    const booked = await insert("2026-10-11T08:40:00Z");
    assert.equal((await available()).slots[0].available, false);
    const initialEdit = [
      { time: "10:50", enabled: true },
      { time: "11:00", enabled: false },
      { time: "14:15", enabled: true },
    ];
    const saved = await save(1, initialEdit);
    assert.equal(saved.version, 2);
    await db.exec(migration);
    assert.deepEqual(
      await get(),
      saved,
      "reapplying must not reset edited settings",
    );
    assert.deepEqual(
      (await available()).slots.map((s) => s.time),
      ["10:50", "14:15"],
    );
    assert.deepEqual(
      (
        await db.query<{ state: unknown }>(
          "SELECT state FROM group_orders WHERE id=$1",
          [booked.id],
        )
      ).rows[0].state,
      booked.state,
    );
    await db.query(
      'UPDATE group_orders SET state=state || \'{"status":"locked"}\' WHERE id=$1',
      [booked.id],
    );
    await db.query("INSERT INTO orders VALUES($1,$2)", [
      randomUUID(),
      booked.id,
    ]);
    assert.equal(
      (
        await db.query<{ pickup_at: Date }>("SELECT pickup_at FROM orders")
      ).rows[0].pickup_at.toISOString(),
      "2026-10-11T08:40:00.000Z",
    );
    await assert.rejects(insert("2026-10-11T09:00:00Z"), /slotUnavailable/);
    await assert.rejects(insert("2026-10-11T08:40:00Z"), /slotUnavailable/);
    await insert("2026-10-11T12:15:00Z");
    await assert.rejects(
      insert("2026-10-11T12:15:00Z"),
      /group_orders_one_pickup_slot/,
    );
    await assert.rejects(save(2, initialEdit, cook), /forbidden/);
    for (const value of [
      null,
      [{ time: "24:00", enabled: true }],
      [
        { time: "10:50", enabled: true },
        { time: "10:50", enabled: false },
      ],
      [{ time: "10:50", enabled: null }],
    ]) {
      await assert.rejects(save(2, value), /invalidSchedule/);
    }
    const concurrent = await Promise.allSettled([
      save(2, [{ time: "15:00", enabled: true }]),
      save(2, [{ time: "16:00", enabled: true }]),
    ]);
    assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
    assert.match(
      String(
        (
          concurrent.find(
            (r) => r.status === "rejected",
          ) as PromiseRejectedResult
        ).reason,
      ),
      /scheduleConflict/,
    );
    assert.equal((await get()).version, 3);
    await save(3, []);
    assert.deepEqual(await available(), { date: "2026-10-11", slots: [] });
    await db.exec(
      "SELECT subscribe_group_slot_email('schedule@example.test','sv')",
    );
    assert.equal(
      (await db.query("SELECT * FROM claim_group_slot_email()")).rows.length,
      0,
    );
    await save(4, [{ time: "15:00", enabled: true }]);
    assert.equal(
      (await db.query("SELECT * FROM claim_group_slot_email()")).rows.length,
      1,
    );
    await save(5, [
      { time: "02:30", enabled: true },
      { time: "03:30", enabled: true },
    ]);
    await db.exec("SET test.clock='2026-03-29T00:00:00Z'");
    const spring = await available();
    assert.deepEqual(spring.slots, [
      { time: "03:30", pickupAt: "2026-03-29T01:30:00Z", available: true },
    ]);
    await db.exec("SET test.clock='2026-10-25T00:00:00Z'");
    assert.equal((await available()).slots[0].pickupAt, "2026-10-25T01:30:00Z");
    await assert.rejects(insert("2026-10-25T00:30:00Z"), /slotUnavailable/);
    await insert("2026-10-25T01:30:00Z");
    for (const role of ["anon", "authenticated", "service_role"]) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(
        db.query("SELECT * FROM group_slot_schedule"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("UPDATE group_slot_schedule SET slots='[]'"),
        /permission denied/,
      );
      if (role !== "service_role") {
        await assert.rejects(get(), /permission denied/);
        await assert.rejects(save(6, []), /permission denied/);
      } else {
        assert.equal((await get()).version, 6);
        await assert.rejects(save(6, [], cook), /forbidden/);
        assert.equal((await save(6, [])).version, 7);
      }
      await db.exec("RESET ROLE");
    }
  } finally {
    await db.close();
  }
});

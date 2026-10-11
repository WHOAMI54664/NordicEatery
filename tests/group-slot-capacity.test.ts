import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createGroup } from "../lib/group-orders/model";
import {
  isGroupAvailability,
  reservableSeats,
  validParticipantCount,
  type GroupAvailability,
  type GroupReservation,
} from "../lib/group-orders/slots";

const pickup = "2026-10-11T08:40:00Z";
const now = Date.parse("2026-10-11T07:00:00Z");
const member = (hash: string) => ({
  id: randomUUID(),
  tokenHash: hash,
  name: "Leader",
  ready: false,
  revision: 0,
  items: [],
});

test("seat counts include the leader and never trust invalid availability or extra people", () => {
  for (const count of [1, 3, 10])
    assert.equal(validParticipantCount(count), true);
  for (const count of [0, -1, 11, 1.5, "3", null, NaN]) {
    assert.equal(validParticipantCount(count), false);
    assert.throws(
      () =>
        createGroup(
          {
            name: "Team",
            mode: "host",
            pickupAt: pickup,
            participantCount: count,
          },
          member("a".repeat(64)),
          randomUUID(),
          now,
        ),
      /invalidParticipantCount/,
    );
  }
  const slot = {
    time: "10:40",
    pickupAt: pickup,
    available: true,
    capacity: 10,
    remaining: 7,
  };
  const held = {
    id: randomUUID(),
    version: 1,
    pickupAt: pickup,
    participantCount: 3,
    expiresAt: "2026-10-11T07:10:00Z",
  };
  assert.equal(reservableSeats(slot, null, now), 7);
  assert.equal(reservableSeats(slot, held, now), 10);
  assert.equal(reservableSeats(slot, held, now + 600001), 7);
  assert.equal(
    isGroupAvailability({
      date: "2026-10-11",
      slots: [slot],
      reservation: held,
    }),
    true,
  );
  assert.equal(
    isGroupAvailability({
      date: "2026-10-11",
      slots: [{ ...slot, remaining: 11 }],
    }),
    false,
  );
  assert.equal(
    isGroupAvailability({
      date: "2026-10-11",
      slots: [slot],
      reservation: { ...held, participantCount: 11 },
    }),
    false,
  );
});

test("SQL seat holds serialize capacity, expire, move, convert once and preserve existing groups", async () => {
  const db = new PGlite();
  const hash = (char: string) => char.repeat(64);
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE profiles(id uuid PRIMARY KEY,role text);
      CREATE TABLE group_orders(id uuid PRIMARY KEY,version integer NOT NULL DEFAULT 1,state jsonb,status text GENERATED ALWAYS AS(state->>'status') STORED);
      CREATE TABLE orders(id uuid PRIMARY KEY,group_order_id uuid REFERENCES group_orders(id));
      CREATE FUNCTION public.capacity_test_now() RETURNS timestamptz LANGUAGE sql STABLE AS $$ SELECT current_setting('test.clock')::timestamptz $$;
      SET test.clock='2026-10-11T07:00:00Z';`);
    const virtual = (s: string) =>
      s
        .replaceAll("now()", "public.capacity_test_now()")
        .replaceAll("clock_timestamp()", "public.capacity_test_now()");
    for (const file of [
      "supabase-migration-group-slots.sql",
      "supabase-migration-group-slot-settings.sql",
    ])
      await db.exec(virtual(await readFile(file, "utf8")));
    const legacyId = randomUUID();
    const legacy = { pickupAt: pickup, status: "open", expiresAt: pickup };
    await db.query("INSERT INTO group_orders(id,state) VALUES($1,$2)", [
      legacyId,
      legacy,
    ]);
    const migration = virtual(
      await readFile("supabase-migration-group-slot-capacity.sql", "utf8"),
    );
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual(
      (
        await db.query<{ state: unknown }>(
          "SELECT state FROM group_orders WHERE id=$1",
          [legacyId],
        )
      ).rows[0].state,
      legacy,
    );
    const availability = async (token?: string) =>
      (
        await db.query<{ result: GroupAvailability }>(
          token
            ? "SELECT group_slot_availability($1) result"
            : "SELECT group_pickup_availability() result",
          token ? [token] : [],
        )
      ).rows[0].result;
    const reserve = async (
      token: string,
      count: number,
      held: GroupReservation | null = null,
      time = pickup,
    ) =>
      (
        await db.query<{ result: GroupAvailability }>(
          "SELECT reserve_group_seats($1,$2,$3,$4,$5) result",
          [token, time, count, held?.id ?? null, held?.version ?? null],
        )
      ).rows[0].result;
    const release = async (token: string, held: GroupReservation) =>
      (
        await db.query<{ result: GroupAvailability }>(
          "SELECT release_group_seats($1,$2,$3) result",
          [token, held.id, held.version],
        )
      ).rows[0].result;
    assert.equal((await availability()).slots[0].remaining, 0);
    await assert.rejects(reserve(hash("a"), 1), /capacityExhausted/);
    await db.query(
      'UPDATE group_orders SET state=state || \'{"status":"cancelled"}\' WHERE id=$1',
      [legacyId],
    );
    let a = (await reserve(hash("a"), 3)).reservation!;
    assert.equal((await availability()).slots[0].remaining, 7);
    await assert.rejects(reserve(hash("b"), 8), /capacityExhausted/);
    const b = (await reserve(hash("b"), 7)).reservation!;
    assert.equal((await availability()).slots[0].available, false);
    assert.equal((await availability(hash("a"))).slots[0].available, true);
    assert.equal(
      (await availability(hash("a"))).reservation?.participantCount,
      3,
    );
    await assert.rejects(reserve(hash("a"), 4, a), /capacityExhausted/);
    assert.equal(
      (await availability(hash("a"))).reservation?.participantCount,
      3,
    );
    const staleA = a;
    a = (await reserve(hash("a"), 3, a, "2026-10-11T09:00:00Z")).reservation!;
    assert.equal((await availability()).slots[0].remaining, 3);
    assert.equal((await availability()).slots[1].remaining, 7);
    await assert.rejects(reserve(hash("a"), 2, staleA), /reservationConflict/);
    await release(hash("a"), staleA);
    assert.equal(
      (await availability(hash("a"))).reservation?.id,
      a.id,
      "stale release must not remove latest hold",
    );
    a = (await reserve(hash("a"), 3, a)).reservation!;
    await release(hash("b"), b);
    const competing = await Promise.allSettled([
      reserve(hash("c"), 4),
      reserve(hash("d"), 4),
    ]);
    assert.equal(competing.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await availability()).slots[0].remaining, 3);
    await db.exec("SET test.clock='2026-10-11T07:10:01Z'");
    assert.equal(
      (await availability()).slots[0].remaining,
      10,
      "expiry releases capacity without cron",
    );
    assert.equal((await availability(hash("a"))).reservation, null);

    a = (await reserve(hash("a"), 3)).reservation!;
    const newB = (await reserve(hash("b"), 7)).reservation!;
    const create = async (
      token: string,
      held: GroupReservation,
      id = randomUUID(),
    ) => {
      const state = createGroup(
        {
          name: "Team",
          mode: "host",
          pickupAt: held.pickupAt,
          participantCount: held.participantCount,
        },
        member(token),
        randomUUID(),
        now + 601000,
      );
      return (
        await db.query<{
          result: { id: string; state: Record<string, unknown> };
        }>("SELECT create_reserved_group($1,$2,$3,$4,$5) result", [
          id,
          state,
          token,
          held.id,
          held.version,
        ])
      ).rows[0].result;
    };
    await assert.rejects(create(hash("f"), a), /reservationExpired/);
    const groupA = await create(hash("a"), a);
    assert.equal(
      (await availability()).slots[0].remaining,
      0,
      "conversion must not double count or release seats",
    );
    assert.equal(
      (await create(hash("a"), a)).id,
      groupA.id,
      "retry returns the same group",
    );
    assert.equal((await availability(hash("a"))).reservation, null);
    const currentMembers = groupA.state.members as ReturnType<typeof member>[];
    const joined = [...currentMembers, member(hash("c")), member(hash("d"))];
    await db.query(
      "UPDATE group_orders SET state=jsonb_set(state,'{members}',$2) WHERE id=$1",
      [groupA.id, JSON.stringify(joined)],
    );
    await assert.rejects(
      db.query(
        "UPDATE group_orders SET state=jsonb_set(state,'{members}',$2) WHERE id=$1",
        [groupA.id, JSON.stringify([...joined, member(hash("e"))])],
      ),
      /groupFull/,
    );
    await assert.rejects(
      db.query(
        "UPDATE group_orders SET state=state || '{\"participantCount\":4}' WHERE id=$1",
        [groupA.id],
      ),
      /reservationImmutable/,
    );
    await db.query(
      'UPDATE group_orders SET state=state || \'{"status":"cancelled"}\' WHERE id=$1',
      [groupA.id],
    );
    assert.equal((await availability()).slots[0].remaining, 3);
    await assert.rejects(
      db.query(
        'UPDATE group_orders SET state=state || \'{"status":"open"}\' WHERE id=$1',
        [groupA.id],
      ),
      /reservationImmutable/,
    );
    const groupB = await create(hash("b"), newB);
    await db.query(
      'UPDATE group_orders SET state=state || \'{"status":"submitted"}\' WHERE id=$1',
      [groupB.id],
    );
    assert.equal((await availability()).slots[0].remaining, 3);
    const c = (await reserve(hash("c"), 3)).reservation!;
    const owner = randomUUID();
    await db.query("INSERT INTO profiles VALUES($1,'owner')", [owner]);
    await db.query("SELECT save_group_slot_schedule(1,'[]',$1)", [owner]);
    await assert.rejects(create(hash("c"), c), /slotUnavailable/);
    assert.deepEqual((await availability()).slots, []);
    await release(hash("c"), c);
    for (const role of ["anon", "authenticated", "service_role"]) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(
        db.query("SELECT * FROM group_slot_reservations"),
        /permission denied/,
      );
      if (role !== "service_role") {
        await assert.rejects(availability(hash("a")), /permission denied/);
        await assert.rejects(reserve(hash("a"), 1), /permission denied/);
        await assert.rejects(create(hash("a"), a), /permission denied/);
        await assert.rejects(release(hash("a"), a), /permission denied/);
      } else assert.deepEqual((await availability(hash("a"))).slots, []);
      await db.exec("RESET ROLE");
    }
  } finally {
    await db.close();
  }
});

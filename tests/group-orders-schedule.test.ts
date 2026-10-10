import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("group worker schedule requires its own environment URL and sends only due work", async () => {
  const db = new PGlite();
  try {
    // PGlite has no hosted pg_cron/pg_net; record their calls without any network.
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA extensions;
      CREATE FUNCTION extensions.gen_random_bytes(integer) RETURNS bytea LANGUAGE SQL AS $$
        SELECT decode(repeat('a1', $1), 'hex');
      $$;
      CREATE SCHEMA vault;
      CREATE TABLE vault.secrets(name text PRIMARY KEY, decrypted_secret text);
      CREATE VIEW vault.decrypted_secrets AS SELECT * FROM vault.secrets;
      CREATE FUNCTION vault.create_secret(text, text, text) RETURNS uuid LANGUAGE SQL AS $$
        INSERT INTO vault.secrets VALUES ($2, $1);
        SELECT gen_random_uuid();
      $$;
      CREATE SCHEMA cron;
      CREATE TABLE cron.jobs(name text PRIMARY KEY, schedule text, command text);
      CREATE VIEW cron.job AS SELECT name AS jobname, true AS active FROM cron.jobs;
      CREATE FUNCTION cron.schedule(text, text, text) RETURNS bigint LANGUAGE SQL AS $$
        INSERT INTO cron.jobs VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET schedule = $2, command = $3;
        SELECT 1::bigint;
      $$;
      CREATE SCHEMA net;
      CREATE TABLE net.requests(url text, headers jsonb, timeout_milliseconds integer);
      CREATE FUNCTION net.http_get(url text, headers jsonb, timeout_milliseconds integer)
        RETURNS bigint LANGUAGE SQL AS $$
        INSERT INTO net.requests VALUES ($1, $2, $3);
        SELECT 1::bigint;
      $$;
      CREATE TABLE public.group_orders(status text, next_check_at timestamptz);
    `);
    const sql = readFileSync("supabase-schedule-group-orders.sql", "utf8")
      .replace("CREATE EXTENSION IF NOT EXISTS pg_cron;", "")
      .replace(
        "CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;",
        "",
      );
    async function rejected(message: RegExp) {
      await assert.rejects(db.exec(sql), message);
      await db.exec("ROLLBACK");
    }
    await rejected(/Configure nordic_group_order_worker_url/);
    assert.equal(
      (await db.query("SELECT * FROM vault.secrets")).rows.length,
      0,
    );
    await db.exec(
      `INSERT INTO vault.secrets VALUES ('nordic_group_order_worker_url', 'http://staging.test/api/cron/group-orders')`,
    );
    await rejected(/Configure nordic_group_order_worker_url/);
    await db.exec(
      `UPDATE vault.secrets SET decrypted_secret = 'https://staging.test/api/cron/group-orders' WHERE name = 'nordic_group_order_worker_url'`,
    );
    await db.exec(sql);
    await db.exec(sql); // Reapplying updates the named job, not a second schedule.
    assert.equal(
      (await db.query("SELECT * FROM vault.secrets")).rows.length,
      2,
    );
    assert.deepEqual(
      (
        await db.query(
          "SELECT group_order_worker_ready() AS ready, authorize_group_order_worker($1) AS valid, authorize_group_order_worker($2) AS invalid",
          ["a1".repeat(32), "b2".repeat(32)],
        )
      ).rows,
      [{ ready: true, valid: true, invalid: false }],
    );
    await db.exec("SET ROLE anon");
    await assert.rejects(
      db.query("SELECT group_order_worker_ready()"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("SELECT authorize_group_order_worker($1)", ["a1".repeat(32)]),
      /permission denied/,
    );
    await db.exec("RESET ROLE");
    const { rows: jobs } = await db.query<{
      schedule: string;
      command: string;
    }>("SELECT * FROM cron.jobs");
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].schedule, "* * * * *");
    await db.exec(jobs[0].command);
    assert.equal((await db.query("SELECT * FROM net.requests")).rows.length, 0);
    await db.exec(
      `INSERT INTO public.group_orders VALUES ('submitted', now()), ('paying', now() + interval '1 day')`,
    );
    await db.exec(jobs[0].command);
    assert.equal((await db.query("SELECT * FROM net.requests")).rows.length, 0);
    await db.exec(
      `INSERT INTO public.group_orders VALUES ('cancelled', now() - interval '1 minute')`,
    );
    await db.exec(jobs[0].command);
    const { rows: requests } = await db.query("SELECT * FROM net.requests");
    assert.deepEqual(requests, [
      {
        url: "https://staging.test/api/cron/group-orders",
        headers: { Authorization: `Bearer ${"a1".repeat(32)}` },
        timeout_milliseconds: 60000,
      },
    ]);
    await db.exec("DELETE FROM cron.jobs");
    assert.deepEqual(
      (await db.query("SELECT group_order_worker_ready() AS ready")).rows,
      [{ ready: false }],
    );
  } finally {
    await db.close();
  }
});

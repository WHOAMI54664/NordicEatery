import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { summarizeZReport, type ZReport } from "../lib/reports/z-report";
import { generateZReportPdf } from "../lib/reports/z-report-pdf";
import { deliverZReport } from "../lib/reports/send-z-reports";

const sample: ZReport = {
  id: 54,
  opened_at: "2026-06-28T17:17:00Z",
  closed_at: "2026-06-30T23:18:00Z",
  snapshot: {
    company: {
      name: "Nordic Eatery AB",
      address: "Sturegatan 18C 96133",
      location: "Boden, Sverige",
    },
    transactions: [
      {
        kind: "sale",
        orderId: "one",
        method: "card",
        rate: 6,
        gross: 11361,
        net: 10717.67,
        vat: 643.33,
        discount: 0,
        fee: 0,
        items: [
          { category: "Food", quantity: 64, gross: 8651 },
          { category: "Sides", quantity: 13, gross: 355 },
          { category: "Sodas", quantity: 65, gross: 1625 },
          { category: "Vegan", quantity: 6, gross: 730 },
        ],
      },
    ],
    grand: { sales: 438497.4, refunds: 320 },
    cancelled: { count: 0, gross: 0 },
    unfinished: { count: 0, gross: 0 },
  },
};

test("Z-report reconciles categories, tax and payments to paid totals, including discounts and refunds", () => {
  const report = structuredClone(sample);
  report.snapshot.transactions[0].gross = 11351;
  report.snapshot.transactions[0].discount = 10;
  report.snapshot.transactions.push({
    kind: "refund",
    orderId: "previous-shift",
    method: "swish",
    rate: 6,
    gross: 100,
    net: 94.34,
    vat: 5.66,
    discount: 0,
    fee: 0,
    items: [],
  });
  const s = summarizeZReport(report);
  assert.equal(
    s.categories.reduce((n, r) => n + r.gross, 0),
    1135100,
  );
  assert.equal(
    s.payments.reduce((n, r) => n + r.amount, 0),
    1125100,
  );
  assert.equal(s.total, 1125100);
  assert.equal(s.quantity, 148);
  assert.equal(s.discount, 1000);
  assert.equal(s.refundCount, 1);
  report.snapshot.transactions[0].net = null;
  assert.equal(summarizeZReport(report).taxes[0].net, null);
});

test("Z-report PDF is deterministic and sends a real PDF attachment with a stable retry key", async () => {
  const first = await generateZReportPdf(sample),
    second = await generateZReportPdf(sample);
  assert.deepEqual(first, second);
  assert.equal(first.subarray(0, 4).toString(), "%PDF");
  const requests: RequestInit[] = [];
  const request: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    requests.push(init!);
    return new Response(JSON.stringify({ id: "accepted" }), { status: 200 });
  };
  for (let i = 0; i < 2; i++)
    assert.equal(
      await deliverZReport(
        { ...sample, email: "reports@example.com" },
        { apiKey: "test", from: "reports@example.com" },
        request,
      ),
      "accepted",
    );
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(
    new Headers(requests[0].headers).get("Idempotency-Key"),
    "shift-z-report-54",
  );
  const body = JSON.parse(String(requests[0].body));
  assert.deepEqual(body.to, ["reports@example.com"]);
  assert.deepEqual(Buffer.from(body.attachments[0].content, "base64"), first);
  assert.ok(requests[0].signal);
  await assert.rejects(
    deliverZReport(
      { ...sample, email: "reports@example.com" },
      { apiKey: "test", from: "reports@example.com" },
      async () => new Response("{}", { status: 500 }),
    ),
    /rejected/,
  );
  await assert.rejects(
    deliverZReport(
      { ...sample, email: "reports@example.com" },
      { apiKey: "test", from: "reports@example.com" },
      async () => new Response("{}"),
    ),
    /acknowledgement/,
  );
});

test("shift close atomically snapshots sales once, carries late payments/refunds, and leases private email work", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT nullif(current_setting(''test.user_id'',true),'''')::uuid';
      CREATE TABLE profiles(id uuid PRIMARY KEY,role text);
      GRANT SELECT ON profiles TO authenticated;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      CREATE TABLE business_settings(id uuid PRIMARY KEY,business_name text,brand_name text,address text,location text);
      INSERT INTO business_settings VALUES('00000000-0000-0000-0000-000000000001','Nordic Eatery','Nordic Eatery','Address','Sweden');
      CREATE TABLE restaurant_shift_state(id int PRIMARY KEY,is_open boolean,opened_at timestamptz,closed_at timestamptz,opened_by uuid,closed_by uuid);
      INSERT INTO restaurant_shift_state VALUES(1,true,'2026-10-13T08:00Z',null,null,null);
      CREATE TABLE products(id uuid PRIMARY KEY,category text);
      CREATE TABLE orders(id uuid PRIMARY KEY,order_channel text,currency text,payment_status text,paid_at timestamptz,created_at timestamptz,
        total_gross numeric,total_price numeric,total_net numeric,total_vat numeric,vat_rate numeric,
        refunded_gross numeric DEFAULT 0,refunded_net numeric DEFAULT 0,refunded_vat numeric DEFAULT 0,
        discount_gross numeric DEFAULT 0,delivery_fee_gross numeric DEFAULT 0,items jsonb DEFAULT '[]',payment_method text,status text DEFAULT 'new');
      INSERT INTO orders(id,order_channel,payment_status,paid_at,created_at,total_gross,total_net,total_vat,vat_rate,payment_method)
        VALUES('00000000-0000-0000-0000-000000000010','website','paid','2026-10-12T09:00Z','2026-10-12T09:00Z',106,100,6,6,'card');`);
    const migration = await readFile(
      new URL("../supabase-migration-shift-z-reports.sql", import.meta.url),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    assert.equal(
      (await db.query("SELECT * FROM z_report_order_totals")).rows.length,
      1,
    );
    await assert.rejects(
      db.exec("INSERT INTO z_report_settings VALUES(1,'bad-email')"),
      /email_check/,
    );
    await db.exec(`INSERT INTO products VALUES('00000000-0000-0000-0000-000000000099','drinks');
      INSERT INTO orders(id,order_channel,payment_status,paid_at,created_at,total_gross,total_net,total_vat,vat_rate,payment_method,items)
        VALUES('00000000-0000-0000-0000-000000000011','website','paid','2026-10-13T09:00Z','2026-10-13T09:00Z',53,50,3,6,'swish',
        '[{"id":"00000000-0000-0000-0000-000000000099","quantity":2,"price":26.5}]');
      UPDATE restaurant_shift_state SET is_open=false,closed_at='2026-10-13T12:00Z' WHERE id=1;`);
    let reports = (
      await db.query<ZReport>("SELECT * FROM shift_z_reports ORDER BY id")
    ).rows;
    assert.equal(reports.length, 1);
    assert.equal(summarizeZReport(reports[0]).gross, 5300);
    assert.equal(
      reports[0].snapshot.transactions[0].items[0].category,
      "drinks",
    );
    assert.equal(summarizeZReport(reports[0]).grandSales, 15900);
    await db.exec(
      "UPDATE restaurant_shift_state SET is_open=false,closed_at='2026-10-13T13:00Z';",
    );
    assert.equal(
      (await db.query("SELECT * FROM shift_z_reports")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query<{ closed_at: Date }>(
          "SELECT closed_at FROM restaurant_shift_state",
        )
      ).rows[0].closed_at.toISOString(),
      "2026-10-13T12:00:00.000Z",
    );
    assert.equal(
      (await db.query("SELECT * FROM claim_shift_z_report()")).rows.length,
      0,
    );
    await db.exec(
      "INSERT INTO z_report_settings VALUES(1,'reports@example.com')",
    );
    let claims = (
      await db.query<{ id: number; email: string }>(
        "SELECT * FROM claim_shift_z_report()",
      )
    ).rows;
    assert.equal(claims.length, 1);
    assert.equal(claims[0].email, "reports@example.com");
    assert.equal(
      (await db.query("SELECT * FROM claim_shift_z_report()")).rows.length,
      0,
    );
    await db.exec(
      "UPDATE z_report_settings SET email='changed@example.com'; UPDATE shift_z_reports SET lease_until=now()-interval '1 second'",
    );
    claims = (
      await db.query<{ id: number; email: string }>(
        "SELECT * FROM claim_shift_z_report()",
      )
    ).rows;
    assert.equal(claims[0].email, "reports@example.com");
    await db.exec(
      "UPDATE shift_z_reports SET first_attempt_at=now()-interval '24 hours',lease_until=now()-interval '1 second'",
    );
    assert.equal(
      (await db.query("SELECT * FROM claim_shift_z_report()")).rows.length,
      0,
    );
    assert.equal(
      (await db.query<{ status: string }>("SELECT status FROM shift_z_reports"))
        .rows[0].status,
      "failed",
    );
    await db.exec(`UPDATE restaurant_shift_state SET is_open=true,opened_at='2026-10-14T08:00Z';
      UPDATE restaurant_shift_state SET is_open=true,opened_at='2026-10-14T09:00Z';
      UPDATE orders SET refunded_gross=10.6,refunded_net=10,refunded_vat=0.6 WHERE id='00000000-0000-0000-0000-000000000010';
      INSERT INTO orders(id,order_channel,payment_status,paid_at,created_at,total_gross,total_net,total_vat,vat_rate,payment_method)
        VALUES('00000000-0000-0000-0000-000000000012','website','paid','2026-10-13T11:59Z','2026-10-13T11:50Z',106,100,6,6,'card');
      UPDATE products SET category='Changed';
      UPDATE restaurant_shift_state SET is_open=false,closed_at='2026-10-14T12:00Z';`);
    reports = (
      await db.query<ZReport>(
        "SELECT id,opened_at::text,closed_at::text,snapshot FROM shift_z_reports ORDER BY id",
      )
    ).rows;
    const next = summarizeZReport(reports[1]);
    assert.equal(next.gross, 10600);
    assert.equal(next.refunds, 1060);
    assert.equal(next.grandSales, 26500);
    assert.equal(next.grandRefunds, 1060);
    assert.equal(next.receipts, 1);
    assert.equal(
      reports[0].snapshot.transactions[0].items[0].category,
      "drinks",
    );
    assert.equal(
      new Date(reports[1].opened_at).toISOString(),
      "2026-10-14T08:00:00.000Z",
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(
        db.query("SELECT * FROM shift_z_reports"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("SELECT * FROM claim_shift_z_report()"),
        /permission denied/,
      );
      await db.exec("RESET ROLE");
    }
    await db.exec("SET ROLE anon");
    await assert.rejects(
      db.query("SELECT * FROM z_report_settings"),
      /permission denied/,
    );
    await db.exec("RESET ROLE; SET ROLE authenticated");
    assert.equal(
      (await db.query("SELECT * FROM z_report_settings")).rows.length,
      0,
    );
    await assert.rejects(
      db.exec("INSERT INTO z_report_settings VALUES(1,'intruder@example.com')"),
      /row-level security/,
    );
    await db.exec("RESET ROLE");
    await db.exec(
      "INSERT INTO profiles VALUES('00000000-0000-0000-0000-000000000002','owner'); SET test.user_id='00000000-0000-0000-0000-000000000002'; SET ROLE authenticated",
    );
    assert.equal(
      (await db.query("SELECT * FROM z_report_settings")).rows.length,
      1,
    );
    await db.exec(
      "UPDATE z_report_settings SET email='owner@example.com'; RESET ROLE",
    );
    // A failed snapshot must roll back closing the shift and every checkpoint.
    await db.exec(
      "UPDATE restaurant_shift_state SET is_open=true,opened_at='2026-10-15T08:00Z'",
    );
    await db.exec(
      "ALTER TABLE shift_z_reports ADD CONSTRAINT force_failure CHECK(id<0) NOT VALID",
    );
    await assert.rejects(
      db.exec(
        "UPDATE restaurant_shift_state SET is_open=false,closed_at='2026-10-15T12:00Z'",
      ),
      /force_failure/,
    );
    assert.equal(
      (
        await db.query<{ is_open: boolean }>(
          "SELECT is_open FROM restaurant_shift_state",
        )
      ).rows[0].is_open,
      true,
    );
  } finally {
    await db.close();
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  createGroup,
  lockGroup,
  type GroupState,
} from "../lib/group-orders/model";

// Isolated PostgreSQL. No environment files or production credentials are loaded.
test("group migration: private access, version conflicts, atomic fulfillment and cancellation", async () => {
  const db = new PGlite();
  try {
    const numericColumns = [
      "vat_rate",
      "subtotal_gross",
      "subtotal_net",
      "subtotal_vat",
      "delivery_fee_gross",
      "delivery_fee_net",
      "delivery_fee_vat",
      "discount_gross",
      "discount_net",
      "discount_vat",
      "loyalty_reward_used",
      "total_gross",
      "total_net",
      "total_vat",
      "refunded_gross",
      "refunded_net",
      "refunded_vat",
    ];
    const textColumns = [
      "order_number",
      "display_order_number",
      "customer_name",
      "customer_phone",
      "customer_email",
      "address",
      "comment",
      "payment_method",
      "payment_status",
      "order_channel",
      "sale_type",
      "currency",
      "payment_reference",
      "refund_status",
    ];
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TYPE public.delivery_type AS ENUM ('delivery', 'pickup');
      CREATE TYPE public.order_status AS ENUM ('new', 'preparing', 'ready', 'completed', 'cancelled');
      CREATE TABLE public.orders (id uuid PRIMARY KEY, items jsonb, order_date date, loyalty_opt_in boolean, paid_at timestamptz, updated_at timestamptz, total_price integer NOT NULL, delivery_type public.delivery_type NOT NULL, status public.order_status NOT NULL, ${numericColumns.map((name) => `${name} numeric`).join(",")}, ${textColumns.map((name) => `${name} text`).join(",")});
      CREATE TABLE public.order_daily_counters (order_date date PRIMARY KEY, last_number integer, updated_at timestamptz);
      CREATE TABLE public.restaurant_shift_state (id integer PRIMARY KEY, is_open boolean);
      INSERT INTO public.restaurant_shift_state VALUES (1,true);
      CREATE TABLE public.business_settings (card_enabled boolean, delivery_enabled boolean, pickup_enabled boolean, swish_enabled boolean DEFAULT true, cash_enabled boolean DEFAULT true);
      INSERT INTO public.business_settings (card_enabled,delivery_enabled,pickup_enabled) VALUES (true,true,true);
      CREATE TABLE public.products (id uuid PRIMARY KEY, name text, price numeric, is_available boolean, track_stock boolean, stock_quantity integer);
    `);
    await db.exec(
      await readFile("supabase-migration-paid-order-numbers.sql", "utf8"),
    );
    const migration = await readFile(
      "supabase-migration-group-orders.sql",
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration); // Additive migration can safely be re-applied.
    const product = {
      id: randomUUID(),
      name: "Caesar",
      price: 129.5,
      is_available: true,
      track_stock: true,
      stock_quantity: 10,
    };
    await db.query("INSERT INTO products VALUES ($1,$2,$3,true,true,10)", [
      product.id,
      product.name,
      product.price,
    ]);
    function state() {
      const host = {
        id: randomUUID(),
        tokenHash: "hash",
        name: "Host",
        ready: true,
        revision: 0,
        items: [{ productId: product.id, quantity: 1, note: "No croutons" }],
      };
      const guest = {
        ...host,
        id: randomUUID(),
        tokenHash: "guest",
        name: "Guest",
      };
      const draft = createGroup(
        { name: "Lunch", mode: "split", locale: "en" },
        host,
        randomUUID(),
        Date.now(),
      );
      draft.members.push(guest);
      const result = lockGroup(
        draft,
        {
          name: "Host",
          phone: "0701234567",
          email: "",
          address: "Pickup",
          deliveryType: "pickup",
          comment: "",
        },
        [product],
        randomUUID,
        Date.now(),
      );
      result.status = "paying";
      result.payments.forEach((payment, index) => {
        payment.status = "paid";
        payment.intentId = `pi_${index}`;
        payment.sessionId = `cs_${index}`;
        payment.attemptedAt = new Date().toISOString();
      });
      return result;
    }
    async function insert(value: GroupState) {
      const id = randomUUID();
      await db.query("INSERT INTO group_orders (id,state) VALUES ($1,$2)", [
        id,
        value,
      ]);
      return id;
    }
    const complete = state();
    const id = await insert(complete);
    await db.exec("SET ROLE anon");
    await assert.rejects(
      db.query("SELECT * FROM group_orders"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("SELECT finalize_group_order($1,1)", [id]),
      /permission denied/,
    );
    await db.exec("RESET ROLE");
    await db.query("SELECT finalize_group_order($1,1)", [id]);
    await db.query("SELECT finalize_group_order($1,1)", [id]);
    const orders = await db.query<{
      total_gross: string;
      items: Array<{ member_name: string; note: string }>;
      display_order_number: string;
    }>("SELECT * FROM orders WHERE group_order_id=$1", [id]);
    assert.equal(orders.rows.length, 1);
    assert.equal(Number(orders.rows[0].total_gross), 259);
    assert.equal(orders.rows[0].display_order_number, "001");
    assert.deepEqual(
      orders.rows[0].items.map((item) => item.member_name),
      ["Host", "Guest"],
    );
    assert.equal(orders.rows[0].items[0].note, "No croutons");

    const partial = state();
    partial.payments[1].status = "pending";
    const partialId = await insert(partial);
    await db.query("SELECT finalize_group_order($1,1)", [partialId]);
    assert.equal(
      (
        await db.query("SELECT id FROM orders WHERE group_order_id=$1", [
          partialId,
        ])
      ).rows.length,
      0,
    );
    const cancelled = state();
    const cancelledId = await insert(cancelled);
    const [first, second] = await Promise.all([
      db.query(
        "UPDATE group_orders SET state=jsonb_set(state,'{status}','\"cancelled\"'),version=2 WHERE id=$1 AND version=1 RETURNING id",
        [cancelledId],
      ),
      db.query(
        "UPDATE group_orders SET version=2 WHERE id=$1 AND version=1 RETURNING id",
        [cancelledId],
      ),
    ]);
    assert.equal(first.rows.length + second.rows.length, 1);
    await db.query("SELECT finalize_group_order($1,1)", [cancelledId]);
    assert.equal(
      (
        await db.query("SELECT id FROM orders WHERE group_order_id=$1", [
          cancelledId,
        ])
      ).rows.length,
      0,
    );

    const mismatch = state();
    mismatch.payments[0].amount++;
    const mismatchId = await insert(mismatch);
    await assert.rejects(
      db.query("SELECT finalize_group_order($1,1)", [mismatchId]),
      /group_payment_total_mismatch/,
    );
    assert.equal(
      (
        await db.query("SELECT id FROM orders WHERE group_order_id=$1", [
          mismatchId,
        ])
      ).rows.length,
      0,
    );
    const expired = state();
    expired.paymentDeadline = new Date(Date.now() - 1000).toISOString();
    const expiredId = await insert(expired);
    await db.query("SELECT finalize_group_order($1,1)", [expiredId]);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "SELECT status FROM group_orders WHERE id=$1",
          [expiredId],
        )
      ).rows[0].status,
      "cancelled",
    );
    await db.exec("UPDATE products SET stock_quantity=1");
    const shortageId = await insert(state());
    await db.query("SELECT finalize_group_order($1,1)", [shortageId]);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "SELECT status FROM group_orders WHERE id=$1",
          [shortageId],
        )
      ).rows[0].status,
      "cancelled",
    );
    assert.equal((await db.query("SELECT * FROM orders")).rows.length, 1);
    await db.exec(
      "UPDATE products SET stock_quantity=10; UPDATE business_settings SET card_enabled=false",
    );
    const swishState = state();
    swishState.paymentMethod = "swish";
    const swishId = await insert(swishState);
    await db.query("SELECT finalize_group_order($1,1)", [swishId]);
    const swishOrder = (
      await db.query<{ payment_method: string; payment_status: string }>(
        "SELECT * FROM orders WHERE group_order_id=$1",
        [swishId],
      )
    ).rows[0];
    assert.equal(swishOrder.payment_method, "swish");
    assert.equal(swishOrder.payment_status, "paid");
    const cashState = state();
    cashState.paymentMethod = "cash";
    cashState.payments.forEach((p) => {
      p.status = "pay_on_site";
      delete p.intentId;
      delete p.sessionId;
    });
    const cashId = await insert(cashState);
    await db.query("SELECT finalize_group_order($1,1)", [cashId]);
    const cashOrder = (
      await db.query<{
        payment_status: string;
        paid_at: null;
        sale_type: string;
        display_order_number: null;
      }>("SELECT * FROM orders WHERE group_order_id=$1", [cashId])
    ).rows[0];
    assert.equal(cashOrder.payment_status, "unpaid");
    assert.equal(cashOrder.paid_at, null);
    assert.equal(cashOrder.display_order_number, null);
    assert.equal(cashOrder.sale_type, "pay_on_site");
    await db.exec("UPDATE business_settings SET swish_enabled=false");
    const disabledSwish = state();
    disabledSwish.paymentMethod = "swish";
    const disabledId = await insert(disabledSwish);
    await db.query("SELECT finalize_group_order($1,1)", [disabledId]);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "SELECT status FROM group_orders WHERE id=$1",
          [disabledId],
        )
      ).rows[0].status,
      "cancelled",
    );
  } finally {
    await db.close();
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { parseCategoryDeletion } from "../lib/menu-category-deletion";

test("category deletion validates ids and requires an explicit nullable destination", () => {
  assert.deepEqual(
    parseCategoryDeletion({ source: "fika", target: "drinks" }),
    { source: "fika", target: "drinks" },
  );
  assert.deepEqual(parseCategoryDeletion({ source: "fries", target: null }), {
    source: "fries",
    target: null,
  });
  for (const input of [
    null,
    [],
    { source: "fika" },
    { source: "fika", target: "fika" },
    { source: "../fries", target: null },
    { source: "x".repeat(65), target: null },
    { source: "x", target: 1 },
  ])
    assert.throws(() => parseCategoryDeletion(input), /invalidInput/);
});

test("category deletion moves all products atomically, preserves orders, and prevents stale forms from recreating it", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
      CREATE TABLE products(id text PRIMARY KEY,category text,name text,price numeric,is_available boolean);
      INSERT INTO products VALUES('one','fika','One',45,true),('two','fika','Two',65,false),('three','drinks','Three',25,true);
      CREATE TABLE orders(id int PRIMARY KEY,items jsonb);
      INSERT INTO orders VALUES(1,'[{"id":"one","category":"fika","price":45}]');`);
    const migration = await readFile(
      new URL(
        "../supabase-migration-delete-menu-categories.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    await assert.rejects(
      db.query("SELECT delete_menu_category($1,$2)", ["fika", null]),
      /targetRequired/,
    );
    await assert.rejects(
      db.query("SELECT delete_menu_category($1,$2)", ["fika", "nonexistent"]),
      /invalidTarget/,
    );
    assert.equal(
      (await db.query("SELECT * FROM products WHERE category='fika'")).rows
        .length,
      2,
    );
    await db.exec("SET ROLE authenticated");
    await assert.rejects(
      db.query("SELECT delete_menu_category('fika','drinks')"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("INSERT INTO deleted_menu_categories(id) VALUES('drinks')"),
      /permission denied/,
    );
    await db.exec("RESET ROLE");
    const moved = await db.query<{ delete_menu_category: number }>(
      "SELECT delete_menu_category('fika','drinks')",
    );
    assert.equal(moved.rows[0].delete_menu_category, 2);
    assert.deepEqual(
      (await db.query("SELECT * FROM products ORDER BY id")).rows,
      [
        {
          id: "one",
          category: "drinks",
          name: "One",
          price: "45",
          is_available: true,
        },
        {
          id: "three",
          category: "drinks",
          name: "Three",
          price: "25",
          is_available: true,
        },
        {
          id: "two",
          category: "drinks",
          name: "Two",
          price: "65",
          is_available: false,
        },
      ],
    );
    assert.equal(
      (
        await db.query<{ items: { category: string }[] }>(
          "SELECT items FROM orders",
        )
      ).rows[0].items[0].category,
      "fika",
    );
    assert.equal(
      (
        await db.query<{ delete_menu_category: number }>(
          "SELECT delete_menu_category('fika','drinks')",
        )
      ).rows[0].delete_menu_category,
      0,
    );
    await assert.rejects(
      db.query("INSERT INTO products(id,category) VALUES('new','fika')"),
      /categoryDeleted/,
    );
    await assert.rejects(
      db.query("UPDATE products SET category='fika' WHERE id='one'"),
      /categoryDeleted/,
    );
    await db.query("SELECT delete_menu_category('fries',null)");
    await assert.rejects(
      db.query("SELECT delete_menu_category('drinks','fries')"),
      /invalidTarget/,
    );
    assert.equal((await db.query("SELECT * FROM products")).rows.length, 3);
    await db.exec("SET ROLE authenticated");
    assert.equal(
      (await db.query("SELECT * FROM deleted_menu_categories")).rows.length,
      2,
    );
    await db.exec("RESET ROLE");
  } finally {
    await db.close();
  }
});

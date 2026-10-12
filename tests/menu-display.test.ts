import assert from "node:assert/strict";
import test from "node:test";
import {
  getMenuCategories,
  getMenuCategoryIds,
  parseMenuCategoryOrder,
} from "../lib/menu-display";

test("saved category order is applied and new categories remain at the end", () => {
  const products = [
    { category: "fries", image_url: null },
    { category: "drinks", image_url: "/drink.png" },
    { category: "fika", image_url: null },
    { category: "knysza", image_url: null },
  ];

  assert.deepEqual(getMenuCategoryIds(products, ["fika", "drinks", "fries"]), [
    "fika",
    "drinks",
    "fries",
    "knysza",
  ]);

  const categories = getMenuCategories(products, {}, (id) => id, [
    "fika",
    "drinks",
    "fries",
  ]);
  assert.deepEqual(
    categories.map((category) => category.id),
    ["fika", "drinks", "fries", "knysza"],
  );
});

test("removed and duplicate categories cannot hide an available category", () => {
  const products = [
    { category: "drinks", image_url: null },
    { category: "fries", image_url: null },
    { category: "custom", image_url: null },
  ];

  assert.deepEqual(
    getMenuCategoryIds(products, ["missing", "fries", "fries"]),
    ["fries", "drinks", "custom"],
  );
});

test("category order parser rejects malformed and oversized saved values", () => {
  assert.deepEqual(parseMenuCategoryOrder('["drinks","fries"]'), [
    "drinks",
    "fries",
  ]);
  assert.deepEqual(parseMenuCategoryOrder("not-json"), []);
  assert.deepEqual(parseMenuCategoryOrder('["drinks","drinks"]'), []);
  assert.deepEqual(parseMenuCategoryOrder('["__proto__"]'), []);
  assert.deepEqual(
    parseMenuCategoryOrder(
      JSON.stringify(Array.from({ length: 201 }, (_, i) => "c" + i)),
    ),
    [],
  );
});

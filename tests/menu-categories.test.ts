import assert from "node:assert/strict";
import { test } from "node:test";
import { getMenuCategories } from "../lib/menu-display";

test("renaming built-in and custom categories keeps product assignments and image keys", () => {
  const products = [
    { category: "sauces" },
    { category: "burgare" },
    { category: "tillbehör" },
  ];
  const content = {
    "menu.categories.sauces": "Dip",
    "menu.categories.custom.burgare": "Våra burgare",
    "menu.categories.custom.tillbehör": "Smårätter",
    "menu.categoryImages.burgare": "/burger.webp",
  };
  const result = getMenuCategories(products, content, (id) => id);
  assert.deepEqual(
    result.map(({ id, title }) => ({ id, title })),
    [
      { id: "sauces", title: "Dip" },
      { id: "burgare", title: "Våra burgare" },
      { id: "tillbehör", title: "Smårätter" },
    ],
  );
  assert.equal(result[1].image, "/burger.webp");
  assert.equal(result[1].textKey, "menu.categories.custom.burgare");
  assert.deepEqual(
    products.map((product) => product.category),
    ["sauces", "burgare", "tillbehör"],
  );
});

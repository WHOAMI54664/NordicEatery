import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseModifierGroups,
  parseSelections,
  resolveSelection,
  selectionKey,
  productUnitAmount,
} from "../lib/menu-options";
import { validateCartPrices } from "../lib/orders/pricing";
import { validateProductInput } from "../lib/products-input";
import type { SupabaseClient } from "@supabase/supabase-js";

export const groups = [
  {
    id: "sauce",
    name: "Sauce",
    min: 1,
    max: 1,
    options: [
      { id: "garlic", name: "Garlic", price: 0 },
      { id: "hot", name: "Hot", price: 1250 },
    ],
  },
  {
    id: "extras",
    name: "Extras",
    min: 0,
    max: 2,
    options: [
      { id: "cheese", name: "Cheese", price: 1500 },
      { id: "onion", name: "Onion", price: 500 },
    ],
  },
];
const choice = [{ groupId: "sauce", optionIds: ["hot"] }];

test("product editing preserves existing Swedish category slugs and validates options", () => {
  const product = {
    name: "Pommes",
    description: "Krispiga pommes",
    category: "tillbehör",
    price: 35,
    modifier_groups: groups,
  };
  assert.deepEqual(validateProductInput(product), groups);
  for (const category of ["../secret", "bad/category", "x".repeat(65), ""]) {
    assert.throws(() => validateProductInput({ ...product, category }));
  }
  assert.throws(() =>
    validateProductInput({
      ...product,
      modifier_groups: [{ ...groups[0], min: 3 }],
    }),
  );
});

test("required/single/multiple selections reject unknown and duplicate choices", () => {
  assert.equal(resolveSelection(groups, choice).extraAmount, 1250);
  assert.throws(() => resolveSelection(groups, []));
  assert.throws(() =>
    resolveSelection(groups, [
      { groupId: "sauce", optionIds: ["hot", "garlic"] },
    ]),
  );
  assert.throws(() =>
    resolveSelection(groups, [{ groupId: "sauce", optionIds: ["forged"] }]),
  );
  assert.throws(() => resolveSelection(groups, [...choice, ...choice]));
  assert.throws(() =>
    parseSelections([{ groupId: "sauce", optionIds: ["hot", "hot"] }]),
  );
  assert.throws(() => parseModifierGroups([{ ...groups[0], min: 2 }]));
  assert.throws(() =>
    parseModifierGroups([
      { ...groups[0], options: [{ id: "x", name: "x", price: -100 }] },
    ]),
  );
  assert.throws(() => productUnitAmount(null));
  assert.throws(() => productUnitAmount(Infinity));
});
test("variant identity is stable across selection order and keeps legacy plain keys", () => {
  const a = [...choice, { groupId: "extras", optionIds: ["cheese", "onion"] }];
  const b = [{ groupId: "extras", optionIds: ["onion", "cheese"] }, ...choice];
  assert.equal(selectionKey("meal", a), selectionKey("meal", b));
  assert.notEqual(selectionKey("meal", choice), selectionKey("meal"));
  assert.equal(selectionKey("meal"), "meal");
});
const catalog = [
  {
    id: "meal",
    name: "Meal",
    price: 100,
    is_available: true,
    track_stock: true,
    stock_quantity: 4,
    modifier_groups: groups,
  },
];
const db = {
  from: () => ({
    select: () => ({ in: async () => ({ data: catalog, error: null }) }),
  }),
} as unknown as SupabaseClient;
test("checkout ignores forged prices, preserves options and rejects malformed quantities/stock", async () => {
  const result = await validateCartPrices(db, [
    { id: "meal", quantity: 2, selections: choice, price: 1, name: "Forged" },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.subtotalGross, 225);
    assert.equal(result.items[0].name, "Meal · Sauce: Hot");
    assert.deepEqual(result.items[0].selections, choice);
  }
  for (const quantity of [0, -1, 1.5, 21, "2", null, Infinity]) {
    assert.equal(
      (
        await validateCartPrices(db, [
          { id: "meal", quantity, selections: choice },
        ])
      ).ok,
      false,
    );
  }
  assert.equal(
    (await validateCartPrices(db, [{ id: "meal", quantity: 1 }])).ok,
    false,
  );
  assert.equal(
    (
      await validateCartPrices(db, [
        { id: "meal", quantity: 3, selections: choice },
        {
          id: "meal",
          quantity: 2,
          selections: [{ groupId: "sauce", optionIds: ["garlic"] }],
        },
      ])
    ).ok,
    false,
  );
  assert.equal((await validateCartPrices(db, [null] as never)).ok, false);
});

test("cart keeps distinct fillings separate and restores legacy or damaged storage safely", async () => {
  const { cartItem, addCartItem, restoreCart } = await import("../lib/cart");
  const product = {
    ...catalog[0],
    category: "meals",
    description: "A meal",
    subtitle: "",
  };
  const first = cartItem(product, choice);
  const second = cartItem(product, [
    { groupId: "sauce", optionIds: ["garlic"] },
  ]);
  const items = addCartItem(addCartItem([first], second), first);
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[0].price, 112.5);
  assert.deepEqual(restoreCart(items), items);
  assert.deepEqual(restoreCart({ items }), []);
  assert.equal(
    restoreCart([
      null,
      { ...product, modifier_groups: [], quantity: 1 },
      { ...first, quantity: -2 },
    ]).length,
    1,
  );
  assert.throws(() => addCartItem([{ ...first, quantity: 20 }], second));
});

test("collective order prices different fillings separately with frozen names and exact shares", async () => {
  const { parseItems, priceGroup } = await import("../lib/group-orders/model");
  const items = parseItems([
    { productId: "meal", quantity: 1, selections: choice },
    {
      productId: "meal",
      quantity: 2,
      selections: [{ groupId: "sauce", optionIds: ["garlic"] }],
    },
  ]);
  const member = {
    id: "host",
    name: "Host",
    tokenHash: "test",
    ready: true,
    revision: 1,
    items,
  };
  const lines = priceGroup([member], catalog, 40000);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].unitAmount, 11250);
  assert.equal(lines[1].unitAmount, 10000);
  assert.equal(lines[0].name, "Meal · Sauce: Hot");
  assert.throws(() => priceGroup([member], catalog, 30000));
  assert.throws(() =>
    priceGroup([member], [{ ...catalog[0], stock_quantity: 2 }], null),
  );
  assert.throws(() => parseItems([items[0], items[0]]));
});

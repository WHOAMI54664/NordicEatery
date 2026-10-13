import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { priceMealCombos } from "../lib/meal-combo";
import { getAddonKind } from "../lib/menu-offers";
import { addCartItems, cartItem, cartPricing, restoreCart } from "../lib/cart";
import { validateCartPrices } from "../lib/orders/pricing";
import {
  createGroup,
  lockGroup,
  parseItems,
  priceGroup,
  type GroupMember,
} from "../lib/group-orders/model";

const meal = {
  id: "meal",
  name: "Kebab",
  price: 115,
  category: "knysza",
  description: "",
  subtitle: "",
  is_available: true,
};
const drink = {
  ...meal,
  id: "drink",
  name: "Cola",
  price: 29,
  category: "drinks",
};
const side = { ...meal, id: "side", name: "Dip", price: 15, category: "dip" };
const catalog = [meal, drink, side];
const db = (products = catalog) =>
  ({
    from: () => ({
      select: () => ({ in: async () => ({ data: products, error: null }) }),
    }),
  }) as unknown as SupabaseClient;
const sum = (lines: { unitAmount: number; quantity: number }[]) =>
  lines.reduce((total, line) => total + line.unitAmount * line.quantity, 0);

test("Varma rätter offers drinks and discounts one drink per main in cart and checkout", async () => {
  for (const category of ["varma-rtter", "varma-ratter", "varma-rätter"]) {
    const hotMeal = { ...meal, category };
    assert.equal(getAddonKind(category), "drink");
    const cart = addCartItems(
      [],
      [
        { product: hotMeal, quantity: 1 },
        { product: drink, quantity: 2 },
      ],
    );
    assert.equal(cartPricing(cart).discountAmount, 500);
    assert.equal(cartPricing(restoreCart(cart)).totalAmount, 16800);
    const checkout = await validateCartPrices(db([hotMeal, drink]), [
      { id: hotMeal.id, quantity: 1 },
      { id: drink.id, quantity: 2 },
    ]);
    assert.ok(checkout.ok);
    assert.equal(checkout.subtotalGross, 168);
    assert.deepEqual(
      checkout.items
        .filter((item) => item.id === drink.id)
        .map((item) => item.price),
      [24, 29],
    );
  }
});

test("combo discounts one drink per main, splitting partial quantities without losing ore", () => {
  const lines = [
    { category: "drinks", quantity: 3, unitAmount: 2950 },
    { category: "knysza", quantity: 2, unitAmount: 11500 },
  ];
  const priced = priceMealCombos(lines);
  assert.equal(sum(priced), 30850);
  assert.deepEqual(
    priced
      .slice(0, 2)
      .map(({ quantity, unitAmount }) => [quantity, unitAmount]),
    [
      [2, 2450],
      [1, 2950],
    ],
  );
  assert.equal(lines[0].unitAmount, 2950);
  assert.equal(sum(priceMealCombos(lines.slice(0, 1))), 8850);
  assert.equal(
    sum(
      priceMealCombos([
        ...lines.slice(0, 1),
        { category: "dip", quantity: 20, unitAmount: 1000 },
      ]),
    ),
    28850,
  );
  for (const category of ["maczanka", "knysza", "fries", "sallad", "burgare"]) {
    assert.equal(
      sum(
        priceMealCombos([
          { category, quantity: 1, unitAmount: 10000 },
          lines[0],
        ]),
      ),
      18350,
    );
  }
  // A mispriced or free drink cannot produce a negative payment line.
  assert.equal(
    sum(
      priceMealCombos([
        { category: "knysza", quantity: 1, unitAmount: 10000 },
        { category: "drinks", quantity: 1, unitAmount: 400 },
      ]),
    ),
    10400,
  );
});

test("cart combo is atomic, survives reload and loses discount when food is removed", () => {
  const cart = addCartItems(
    [],
    [
      { product: meal, quantity: 1 },
      { product: drink, quantity: 2 },
    ],
  );
  assert.equal(cartPricing(cart).totalAmount, 16800);
  assert.equal(cartPricing(cart).discountAmount, 500);
  assert.deepEqual(cartPricing(restoreCart(cart)), cartPricing(cart));
  assert.equal(
    cartPricing(cart.filter((line) => line.id !== meal.id)).totalAmount,
    5800,
  );
  assert.equal(
    cartPricing(cart.map((line) => ({ ...line, quantity: 2 }))).discountAmount,
    1000,
  );
  const full = [cartItem(drink, [], 20)];
  assert.throws(() =>
    addCartItems(full, [
      { product: meal, quantity: 1 },
      { product: drink, quantity: 1 },
    ]),
  );
  assert.equal(full.length, 1);
  assert.equal(full[0].quantity, 20);
});

test("checkout derives combo eligibility from the catalog and ignores forged discount fields", async () => {
  const result = await validateCartPrices(db(), [
    { id: meal.id, quantity: 1, price: 0 },
    { id: drink.id, quantity: 3, price: 0, comboDiscount: 99999 },
  ]);
  assert.ok(result.ok);
  assert.equal(result.subtotalGross, 197);
  assert.deepEqual(
    result.items
      .filter((item) => item.id === drink.id)
      .map((item) => [item.price, item.quantity]),
    [
      [24, 1],
      [29, 2],
    ],
  );
  assert.match(result.items[1].name, /Combo/);
  assert.equal(new Set(result.items.map((item) => item.lineId)).size, 3);
  const forged = await validateCartPrices(db(), [
    { id: side.id, quantity: 1, category: "knysza" },
    { id: drink.id, quantity: 1, comboDiscount: 500 },
  ]);
  assert.ok(forged.ok);
  assert.equal(forged.subtotalGross, 44);
  assert.equal(
    (
      await validateCartPrices(db([{ ...meal, is_available: false }, drink]), [
        { id: meal.id, quantity: 1 },
        { id: drink.id, quantity: 1 },
      ])
    ).ok,
    false,
  );
});

test("combo keeps required choices, modifier prices and aggregate drink stock authoritative", async () => {
  const options = [
    {
      id: "size",
      name: "Size",
      min: 1,
      max: 1,
      options: [{ id: "large", name: "Large", price: 750 }],
    },
  ];
  const products = [
    meal,
    {
      ...drink,
      modifier_groups: options,
      track_stock: true,
      stock_quantity: 2,
    },
  ];
  assert.equal(
    (
      await validateCartPrices(db(products), [
        { id: meal.id, quantity: 1 },
        { id: drink.id, quantity: 1 },
      ])
    ).ok,
    false,
  );
  const items = [
    { id: meal.id, quantity: 1 },
    {
      id: drink.id,
      quantity: 2,
      selections: [{ groupId: "size", optionIds: ["large"] }],
    },
  ];
  const result = await validateCartPrices(db(products), items);
  assert.ok(result.ok);
  assert.equal(result.subtotalGross, 183);
  assert.deepEqual(
    result.items.slice(1).map((item) => item.price),
    [31.5, 36.5],
  );
  assert.equal(
    (
      await validateCartPrices(db(products), [
        ...items,
        { ...items[1], quantity: 1 },
      ])
    ).ok,
    false,
  );
});

test("group combo is per participant, respects discounted spend limit and freezes exact host/split payments", () => {
  const host: GroupMember = {
    id: "host",
    name: "Host",
    tokenHash: "host",
    revision: 0,
    ready: true,
    items: parseItems([
      { productId: meal.id, quantity: 1 },
      { productId: drink.id, quantity: 2 },
    ]),
  };
  const guest: GroupMember = {
    ...host,
    id: "guest",
    name: "Guest",
    tokenHash: "guest",
    items: parseItems([{ productId: drink.id, quantity: 1 }]),
  };
  assert.equal(sum(priceGroup([host], catalog, 16800)), 16800);
  assert.throws(() => priceGroup([host], catalog, 16799));
  const now = Date.now();
  const customer = {
    name: "Host",
    phone: "0701234567",
    email: "",
    deliveryType: "pickup" as const,
    address: "Pickup",
    comment: "",
  };
  const amounts: Record<string, number[]> = {};
  for (const mode of ["host", "split"] as const) {
    const group = createGroup(
      { name: "Lunch", mode, locale: "sv" },
      host,
      "order",
      now,
    );
    group.members.push(guest);
    const locked = lockGroup(group, customer, catalog, () => "payment", now);
    amounts[mode] = locked.payments.map((payment) => payment.amount);
    assert.equal(sum(locked.lines), 19700);
    assert.equal(
      locked.lines.find((line) => line.memberId === "guest")?.unitAmount,
      2900,
    );
  }
  assert.deepEqual(amounts, { host: [19700], split: [16800, 2900] });
});

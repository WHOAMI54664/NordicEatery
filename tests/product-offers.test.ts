import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAddonKind, isSauceCategory } from "../lib/menu-offers";
import {
  normalizeProductSubtitle,
  productDescriptionTranslations,
  validateProductInput,
} from "../lib/products-input";
import { addCartItems, cartPricing, restoreCart } from "../lib/cart";
import { validateCartPrices } from "../lib/orders/pricing";
import {
  parseItems,
  priceGroup,
  type GroupMember,
} from "../lib/group-orders/model";

test("optional subtitles use empty text for the NOT NULL base column", () => {
  for (const value of [undefined, null, "", "  \n "])
    assert.equal(normalizeProductSubtitle(value), "");
  assert.equal(normalizeProductSubtitle("  Fresh\nfood  "), "  Fresh\nfood  ");
  for (const value of [1, false, {}, []])
    assert.throws(() => normalizeProductSubtitle(value));
  assert.doesNotThrow(() =>
    validateProductInput({
      name: "Kebabrulle",
      description: "Kebab i tunnbröd",
      category: "knysza",
      price: 99,
    }),
  );
});

test("sides offer dips while main dishes keep the drink combo", () => {
  for (const category of ["tillbehör", "tillbehor", "sides"])
    assert.equal(getAddonKind(category), "sauce");
  for (const category of ["maczanka", "knysza", "burgare", "sallad", "fries"])
    assert.equal(getAddonKind(category), "drink");
  for (const category of ["dip", "sauces", "drinks", "unknown"])
    assert.equal(getAddonKind(category), undefined);
  assert.ok(isSauceCategory("dip"));
  assert.ok(isSauceCategory("sauces"));
  assert.equal(isSauceCategory("fries"), false);
});

test("side and dip keep full catalog prices in cart, checkout and group ordering", async () => {
  const side = {
    id: "side",
    name: "Pommes",
    category: "tillbehör",
    price: 35,
    subtitle: "",
    description: "Pommes",
    is_available: true,
  };
  const sauce = {
    ...side,
    id: "sauce",
    name: "BBQ-sås",
    category: "dip",
    price: 10,
  };
  const products = [side, sauce];
  const cart = addCartItems(
    [],
    [
      { product: side, quantity: 2 },
      { product: sauce, quantity: 1 },
    ],
  );
  assert.equal(cartPricing(cart).totalAmount, 8000);
  assert.equal(cartPricing(cart).discountAmount, 0);
  assert.equal(cartPricing(restoreCart(cart)).totalAmount, 8000);
  assert.equal(
    cartPricing(addCartItems([], [{ product: side, quantity: 1 }])).totalAmount,
    3500,
  );
  const db = {
    from: () => ({
      select: () => ({ in: async () => ({ data: products, error: null }) }),
    }),
  } as unknown as SupabaseClient;
  const checkout = await validateCartPrices(db, [
    { id: side.id, quantity: 2, price: 0 },
    { id: sauce.id, quantity: 1, price: 0, comboDiscount: 500 },
  ]);
  assert.ok(checkout.ok);
  assert.equal(checkout.subtotalGross, 80);
  const member: GroupMember = {
    id: "guest",
    name: "Guest",
    tokenHash: "guest",
    revision: 0,
    ready: true,
    items: parseItems([
      { productId: side.id, quantity: 2 },
      { productId: sauce.id, quantity: 1 },
    ]),
  };
  const lines = priceGroup([member], products, 8000);
  assert.equal(
    lines.reduce((sum, line) => sum + line.unitAmount * line.quantity, 0),
    8000,
  );
  assert.throws(() => priceGroup([member], products, 7999));
});

test("product descriptions refresh the editor language and inherited copies without losing separate translations", () => {
  const previous = {
    description: "Old source",
    description_sv: "Old Swedish copy",
    description_pl: "Osobne tłumaczenie",
    description_ru: "Old source",
  };
  assert.deepEqual(
    productDescriptionTranslations(
      { description: "New description\n\n  Details", locale: "sv" },
      previous,
    ),
    {
      description_sv: "New description\n\n  Details",
      description_ru: "New description\n\n  Details",
    },
  );
  assert.deepEqual(
    productDescriptionTranslations(
      {
        description: "New source",
        description_pl: "Nowy przekład",
        locale: "en",
      },
      previous,
    ),
    { description_pl: "Nowy przekład", description_ru: "New source" },
  );
  assert.deepEqual(
    productDescriptionTranslations(
      { description: "New source" },
      {
        description: "Old source",
        description_sv: null,
        description_pl: "",
        description_ru: "Old source",
      },
    ),
    {
      description_sv: "New source",
      description_pl: "New source",
      description_ru: "New source",
    },
  );
});

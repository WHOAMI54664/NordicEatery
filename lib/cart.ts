import type { Product } from "../types/product";
import { priceMealCombos } from "./meal-combo";
import {
  productUnitAmount,
  resolveSelection,
  selectionKey,
  type Selection,
} from "./menu-options";
export type CartItem = Product & {
  quantity: number;
  lineId: string;
  selections: Selection[];
  optionSummary: string;
  basePrice: number;
};
export type CartAddition = {
  product: Product;
  selections?: Selection[];
  quantity: number;
};

export function addCartItems(
  items: CartItem[],
  additions: CartAddition[],
): CartItem[] {
  return additions.reduce(
    (next, entry) =>
      addCartItem(
        next,
        cartItem(entry.product, entry.selections, entry.quantity),
      ),
    items,
  );
}

export function cartPricing(items: CartItem[]) {
  const lines = priceMealCombos(
    items.map((item) => ({
      ...item,
      unitAmount: Math.round(item.price * 100),
    })),
  );
  const lineTotals: Record<string, number> = {};
  const lineDiscounts: Record<string, number> = {};
  let totalAmount = 0;
  let discountAmount = 0;
  for (const line of lines) {
    const amount = line.unitAmount * line.quantity;
    const discount = line.comboDiscount * line.quantity;
    lineTotals[line.lineId] = (lineTotals[line.lineId] || 0) + amount;
    lineDiscounts[line.lineId] = (lineDiscounts[line.lineId] || 0) + discount;
    totalAmount += amount;
    discountAmount += discount;
  }
  return { totalAmount, discountAmount, lineTotals, lineDiscounts };
}

export function cartItem(
  product: Product,
  selections: Selection[] = [],
  quantity = 1,
): CartItem {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20)
    throw new Error("Invalid quantity");
  const resolved = resolveSelection(product.modifier_groups, selections);
  return {
    ...product,
    basePrice: Number(product.price),
    price: productUnitAmount(product.price, resolved.extraAmount) / 100,
    quantity,
    lineId: selectionKey(product.id, resolved.selections),
    selections: resolved.selections,
    optionSummary: resolved.summary,
  };
}
export function addCartItem(items: CartItem[], item: CartItem): CartItem[] {
  const existing = items.find((value) => value.lineId === item.lineId);
  const productQuantity = items
    .filter((value) => value.id === item.id)
    .reduce((sum, value) => sum + value.quantity, 0);
  if (
    productQuantity + item.quantity > 20 ||
    (!existing && items.length >= 100)
  )
    throw new Error("Cart limit reached");
  return existing
    ? items.map((value) =>
        value.lineId === item.lineId
          ? { ...item, quantity: value.quantity + item.quantity }
          : value,
      )
    : [...items, item];
}
export function restoreCart(value: unknown): CartItem[] {
  if (!Array.isArray(value) || value.length > 100) return [];
  let items: CartItem[] = [];
  for (const entry of value) {
    try {
      if (
        !entry ||
        typeof entry !== "object" ||
        typeof entry.id !== "string" ||
        typeof entry.name !== "string"
      )
        continue;
      // Recompute persisted totals; do not trust obsolete cached line identifiers.
      items = addCartItem(
        items,
        cartItem(
          { ...entry, price: entry.basePrice ?? entry.price },
          entry.selections,
          entry.quantity,
        ),
      );
    } catch {
      /* A corrupt/obsolete line must not prevent the remaining cart loading. */
    }
  }
  return items;
}

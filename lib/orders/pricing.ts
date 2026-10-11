import type { SupabaseClient } from "@supabase/supabase-js";
import { priceMealCombos } from "../meal-combo";
import {
  MenuValidationError,
  resolveSelection,
  productUnitAmount,
  selectionKey,
  type Selection,
} from "../menu-options";

export type RawCartItem = {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  quantity?: unknown;
  selections?: unknown;
  [key: string]: unknown;
};
export type ValidatedItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selections: Selection[];
  lineId: string;
};
export type PriceValidationResult =
  | { ok: true; items: ValidatedItem[]; subtotalGross: number }
  | { ok: false; error: string; status: number };

export async function validateCartPrices(
  supabase: SupabaseClient,
  rawItems: RawCartItem[] | undefined,
): Promise<PriceValidationResult> {
  if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 100)
    return { ok: false, error: "Cart must contain 1–100 items", status: 400 };
  if (
    rawItems.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof item.id !== "string" ||
        !item.id.trim() ||
        item.id.length > 100 ||
        !Number.isInteger(item.quantity) ||
        Number(item.quantity) < 1 ||
        Number(item.quantity) > 20,
    )
  )
    return {
      ok: false,
      error: "Invalid cart items or quantities",
      status: 400,
    };
  const ids = [...new Set(rawItems.map((item) => String(item.id).trim()))];
  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, name, price, category, is_available, track_stock, stock_quantity, modifier_groups",
    )
    .in("id", ids);
  if (error)
    return { ok: false, error: "Could not verify product prices", status: 503 };
  const catalog = new Map(
    (products || []).map((product) => [String(product.id), product]),
  );
  const quantities = new Map<string, number>();
  const items: ValidatedItem[] = [];
  try {
    for (const rawItem of rawItems) {
      const id = String(rawItem.id).trim();
      const product = catalog.get(id);
      if (!product || product.is_available !== true)
        throw new MenuValidationError("Product is no longer available");
      const quantity = Number(rawItem.quantity);
      const demand = (quantities.get(id) || 0) + quantity;
      quantities.set(id, demand);
      if (
        demand > 20 ||
        (product.track_stock && demand > Number(product.stock_quantity || 0))
      )
        throw new MenuValidationError("Requested quantity is not available");
      const selection = resolveSelection(
        product.modifier_groups,
        rawItem.selections,
      );
      const price =
        productUnitAmount(product.price, selection.extraAmount) / 100;
      items.push({
        id,
        name: [String(product.name), selection.summary]
          .filter(Boolean)
          .join(" · "),
        price,
        quantity,
        selections: selection.selections,
        lineId: selectionKey(id, selection.selections),
      });
    }
    const pricedItems = priceMealCombos(
      items.map((item) => ({
        ...item,
        category: catalog.get(item.id)?.category as string | undefined,
        unitAmount: Math.round(item.price * 100),
      })),
    ).map(({ category: _category, unitAmount, comboDiscount, ...item }) => ({
      ...item,
      price: unitAmount / 100,
      name: comboDiscount ? `${item.name} · Combo (−5 kr)` : item.name,
      lineId: comboDiscount ? `${item.lineId}:combo` : item.lineId,
    }));
    const amount = pricedItems.reduce(
      (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
      0,
    );
    if (amount > 10000000) throw new MenuValidationError("Order is too large");
    return { ok: true, items: pricedItems, subtotalGross: amount / 100 };
  } catch (error) {
    if (error instanceof MenuValidationError)
      return { ok: false, error: error.message, status: 400 };
    throw error;
  }
}

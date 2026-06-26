import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side price validation.
 *
 * Never trust prices coming from the browser. The cart sends item ids and
 * quantities; the authoritative unit price is always read from the `products`
 * table. This prevents price-tampering (e.g. paying 1 kr for a 120 kr item).
 */

export type RawCartItem = {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  quantity?: unknown;
  [key: string]: unknown;
};

export type ValidatedItem = {
  id: string;
  name: string;
  /** Gross unit price (incl. VAT) taken from the database. */
  price: number;
  quantity: number;
};

export type PriceValidationResult =
  | { ok: true; items: ValidatedItem[]; subtotalGross: number }
  | { ok: false; error: string; status: number };

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function validateCartPrices(
  supabase: SupabaseClient,
  rawItems: RawCartItem[] | undefined
): Promise<PriceValidationResult> {
  if (!rawItems || rawItems.length === 0) {
    return { ok: false, error: "Cart is empty", status: 400 };
  }

  const ids = Array.from(
    new Set(
      rawItems
        .map((item) => (typeof item.id === "string" ? item.id.trim() : ""))
        .filter(Boolean)
    )
  );

  if (ids.length === 0) {
    return { ok: false, error: "Invalid cart items", status: 400 };
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, is_available")
    .in("id", ids);

  if (error) {
    console.error("Price validation: products lookup error:", error);

    return {
      ok: false,
      error: "Could not verify product prices",
      status: 500,
    };
  }

  const productMap = new Map(
    (products || []).map((product) => [String(product.id), product])
  );

  const items: ValidatedItem[] = [];

  for (const rawItem of rawItems) {
    const id = typeof rawItem.id === "string" ? rawItem.id.trim() : "";
    const product = id ? productMap.get(id) : undefined;

    if (!product) {
      return {
        ok: false,
        error: `Product not available: ${
          (typeof rawItem.name === "string" && rawItem.name) || id || "unknown"
        }`,
        status: 400,
      };
    }

    if (product.is_available === false) {
      return {
        ok: false,
        error: `Product is sold out: ${product.name}`,
        status: 400,
      };
    }

    const quantity = Math.max(1, Math.trunc(safeNumber(rawItem.quantity, 1)));
    const price = roundMoney(safeNumber(product.price));

    items.push({
      id,
      name: String(product.name),
      price,
      quantity,
    });
  }

  const subtotalGross = roundMoney(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  return { ok: true, items, subtotalGross };
}

import {
  MenuValidationError,
  parseModifierGroups,
  productUnitAmount,
} from "./menu-options";

export function normalizeProductSubtitle(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string")
    throw new MenuValidationError("Invalid product subtitle");
  // The legacy base column is NOT NULL; empty text represents no subtitle.
  return value.trim() ? value : "";
}

export function productDescriptionTranslations(
  input: Record<string, unknown>,
  previous: Record<string, unknown>,
) {
  const update: Record<string, string> = {};
  for (const locale of ["sv", "pl", "ru"]) {
    const key = `description_${locale}`;
    if (input[key] !== undefined) {
      update[key] = String(input[key] || input.description);
    } else if (
      input.locale === locale ||
      !previous[key] ||
      previous[key] === previous.description
    ) {
      // Copies seeded at creation follow the source; independent translations
      // in other languages remain intact. The editor's language is authoritative.
      update[key] = String(input.description);
    }
  }
  return update;
}

export function validateProductInput(body: Record<string, unknown>) {
  if (
    body.locale !== undefined &&
    (typeof body.locale !== "string" ||
      !["sv", "en", "pl", "ru"].includes(body.locale))
  )
    throw new MenuValidationError("Invalid product locale");
  for (const locale of ["sv", "pl", "ru"]) {
    const value = body[`description_${locale}`];
    if (
      value !== undefined &&
      value !== null &&
      (typeof value !== "string" || value.length > 5000)
    )
      throw new MenuValidationError("Invalid product description");
  }
  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.length > 160 ||
    typeof body.description !== "string" ||
    !body.description.trim() ||
    body.description.length > 5000 ||
    typeof body.category !== "string" ||
    !/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,63}$/u.test(body.category)
  )
    throw new MenuValidationError(
      "Invalid product name, description or category",
    );
  if (
    typeof body.price !== "number" ||
    Math.round(body.price * 100) / 100 !== body.price
  )
    throw new MenuValidationError("Invalid product price");
  productUnitAmount(body.price);
  for (const key of ["stock_quantity", "sort_order"]) {
    if (
      body[key] !== undefined &&
      (typeof body[key] !== "number" ||
        !Number.isSafeInteger(body[key]) ||
        Number(body[key]) < 0 ||
        Number(body[key]) > 1000000)
    )
      throw new MenuValidationError("Invalid stock or sort order");
  }
  for (const key of ["is_available", "is_popular", "track_stock"])
    if (body[key] !== undefined && typeof body[key] !== "boolean")
      throw new MenuValidationError("Invalid product flag");
  if (
    body.menu_type !== undefined &&
    !["standard", "vegan", "gluten_free"].includes(String(body.menu_type))
  )
    throw new MenuValidationError("Invalid menu type");
  return parseModifierGroups(body.modifier_groups);
}

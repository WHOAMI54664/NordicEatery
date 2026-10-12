export const menuTypes = [
  { id: "all" },
  { id: "standard" },
  { id: "vegan" },
  { id: "gluten_free" },
] as const;

export const MENU_CATEGORY_ORDER_KEY = "menu.categoryOrder";
export const MENU_CATEGORY_ORDER_LOCALE = "sv";

export const categories = [
  { id: "maczanka", titleKey: "maczanka" },
  { id: "knysza", titleKey: "knysza" },
  { id: "fries", titleKey: "fries" },
  { id: "sauces", titleKey: "sauces" },
  { id: "drinks", titleKey: "drinks" },
] as const;

export type MenuCategory = {
  id: string;
  textKey: string;
  title: string;
  image?: string | null;
  hasCategoryImage: boolean;
};

const isCategoryId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,63}$/u.test(value);

// Stored order is advisory: malformed or obsolete ids are ignored at display
// time, while newly added categories remain visible at the end.
export function parseMenuCategoryOrder(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > 200) return [];
    const seen = new Set<string>();
    for (const id of parsed) {
      if (!isCategoryId(id) || seen.has(id)) return [];
      seen.add(id);
    }
    return parsed as string[];
  } catch {
    return [];
  }
}

export function getMenuCategoryIds(
  products: { category: string | null }[],
  savedOrder: readonly string[] = [],
) {
  const known = new Set<string>(categories.map((category) => category.id));
  const available = new Set(
    products
      .map((product) => product.category)
      .filter((id): id is string => Boolean(id)),
  );
  const defaults = [
    ...known,
    ...[...available].filter((id) => !known.has(id)),
  ].filter((id) => available.has(id));
  const availableIds = new Set(defaults);
  const result: string[] = [];
  const added = new Set<string>();

  for (const id of savedOrder) {
    if (availableIds.has(id) && !added.has(id)) {
      result.push(id);
      added.add(id);
    }
  }
  for (const id of defaults) {
    if (!added.has(id)) {
      result.push(id);
      added.add(id);
    }
  }

  return result;
}

// Home links and the menu use the same order, labels and image fallback.
export function getMenuCategories(
  products: { category: string | null; image_url?: string | null }[],
  content: Record<string, string>,
  translate: (id: string) => string,
  savedOrder: readonly string[] = [],
): MenuCategory[] {
  const known = new Set<string>(categories.map((category) => category.id));
  return getMenuCategoryIds(products, savedOrder).map((id) => ({
    id,
    textKey: "menu.categories." + (known.has(id) ? "" : "custom.") + id,
    title:
      content["menu.categories." + (known.has(id) ? "" : "custom.") + id] ||
      (known.has(id) ? translate(id) : humanizeCategory(id)),
    image:
      content["menu.categoryImages." + id] ||
      products.find((product) => product.category === id && product.image_url)
        ?.image_url,
    hasCategoryImage: Boolean(content["menu.categoryImages." + id]),
  }));
}

// Turns a custom category slug (e.g. "fika" / "glass-dessert") into a readable
// title for the menu when there is no predefined translation for it.
export function humanizeCategory(id: string) {
  const label = id.replace(/[-_]+/g, " ").trim();

  return label.charAt(0).toUpperCase() + label.slice(1);
}

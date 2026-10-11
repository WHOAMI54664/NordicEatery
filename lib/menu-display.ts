export const menuTypes = [
  { id: "all" },
  { id: "standard" },
  { id: "vegan" },
  { id: "gluten_free" },
] as const;

export const categories = [
  { id: "maczanka", titleKey: "maczanka" },
  { id: "knysza", titleKey: "knysza" },
  { id: "fries", titleKey: "fries" },
  { id: "sauces", titleKey: "sauces" },
  { id: "drinks", titleKey: "drinks" },
] as const;

// Turns a custom category slug (e.g. "fika" / "glass-dessert") into a readable
// title for the menu when there is no predefined translation for it.
export function humanizeCategory(id: string) {
  const label = id.replace(/[-_]+/g, " ").trim();

  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Home links and the menu use the same order, labels and image fallback.
export function getMenuCategories(
  products: { category: string; image_url?: string | null }[],
  content: Record<string, string>,
  translate: (id: string) => string,
) {
  const known = new Set<string>(categories.map((category) => category.id));
  const available = new Set(products.map((product) => product.category));
  return [...known, ...[...available].filter((id) => id && !known.has(id))]
    .filter((id) => available.has(id))
    .map((id) => ({
      id,
      textKey: `menu.categories.${known.has(id) ? "" : "custom."}${id}`,
      title:
        content[`menu.categories.${known.has(id) ? "" : "custom."}${id}`] ||
        (known.has(id) ? translate(id) : humanizeCategory(id)),
      image:
        content[`menu.categoryImages.${id}`] ||
        products.find((product) => product.category === id && product.image_url)
          ?.image_url,
      hasCategoryImage: Boolean(content[`menu.categoryImages.${id}`]),
    }));
}

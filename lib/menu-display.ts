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

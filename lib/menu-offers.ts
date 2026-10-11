import { isComboMeal } from "./meal-combo";

export type AddonKind = "drink" | "sauce";

export function isSauceCategory(category: string): boolean {
  return category === "dip" || category === "sauces";
}

export function getAddonKind(category: string): AddonKind | undefined {
  if (["tillbehör", "tillbehor", "sides"].includes(category)) return "sauce";
  if (isComboMeal(category)) return "drink";
}

export const COMBO_DISCOUNT = 500; // öre, per drink

const mealCategories = new Set([
  "maczanka",
  "knysza",
  "burgare",
  "sallad",
  "fries",
  // The live menu moved kebab, wraps and loaded fries into Varma rätter.
  // Keep the legacy admin slug (which dropped ä) alongside spelling variants.
  "varma-rtter",
  "varma-ratter",
  "varma-rätter",
]);

export function isComboMeal(category: string | undefined): boolean {
  return mealCategories.has(category || "");
}

type ComboLine = { category?: string; quantity: number; unitAmount: number };

// Use catalog categories and prices on the server. Client discount flags are
// never accepted. Split partially discounted quantities to keep receipt and
// payment unit prices exact, including when only one of two drinks qualifies.
export function priceMealCombos<T extends ComboLine>(
  lines: T[],
): (T & { comboDiscount: number })[] {
  let remaining = lines.reduce(
    (count, line) => count + (isComboMeal(line.category) ? line.quantity : 0),
    0,
  );
  return lines.flatMap((line) => {
    const discounted =
      line.category === "drinks" && line.unitAmount >= COMBO_DISCOUNT
        ? Math.min(remaining, line.quantity)
        : 0;
    remaining -= discounted;
    return [
      ...(discounted
        ? [
            {
              ...line,
              quantity: discounted,
              unitAmount: line.unitAmount - COMBO_DISCOUNT,
              comboDiscount: COMBO_DISCOUNT,
            },
          ]
        : []),
      ...(line.quantity > discounted
        ? [{ ...line, quantity: line.quantity - discounted, comboDiscount: 0 }]
        : []),
    ];
  });
}

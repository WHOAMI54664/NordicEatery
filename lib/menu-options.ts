// Shared catalog rules. Monetary adjustments are integer öre, never client prices.
export type ModifierOption = { id: string; name: string; price: number };
export type ModifierGroup = {
  id: string;
  name: string;
  min: number;
  max: number;
  options: ModifierOption[];
};
export type Selection = { groupId: string; optionIds: string[] };
export class MenuValidationError extends Error {}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new MenuValidationError("Invalid menu configuration");
  return value as Record<string, unknown>;
}
function label(value: unknown, max: number) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw new MenuValidationError("Invalid menu label");
  return value.trim();
}
function identifier(value: unknown) {
  const id = label(value, 64);
  if (!/^[a-zA-Z0-9_-]+$/.test(id))
    throw new MenuValidationError("Invalid option identifier");
  return id;
}
function integer(value: unknown, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new MenuValidationError("Invalid menu limit or price");
  return value;
}
export function parseModifierGroups(value: unknown): ModifierGroup[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 8)
    throw new MenuValidationError("Maximum 8 option groups");
  const seen = new Set<string>();
  return value.map((entry) => {
    const group = object(entry);
    const id = identifier(group.id);
    if (seen.has(id)) throw new MenuValidationError("Duplicate option group");
    seen.add(id);
    if (
      !Array.isArray(group.options) ||
      !group.options.length ||
      group.options.length > 20
    )
      throw new MenuValidationError("Each group needs 1–20 options");
    const optionIds = new Set<string>();
    const options = group.options.map((entry) => {
      const option = object(entry);
      const id = identifier(option.id);
      if (optionIds.has(id)) throw new MenuValidationError("Duplicate option");
      optionIds.add(id);
      return {
        id,
        name: label(option.name, 80),
        price: integer(option.price, 0, 100000),
      };
    });
    const max = integer(group.max, 1, options.length);
    return {
      id,
      name: label(group.name, 80),
      min: integer(group.min, 0, max),
      max,
      options,
    };
  });
}
export function parseSelections(value: unknown): Selection[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8)
    throw new MenuValidationError("Invalid selection");
  const groups = new Set<string>();
  return value
    .map((entry) => {
      const selection = object(entry);
      const groupId = identifier(selection.groupId);
      if (
        groups.has(groupId) ||
        !Array.isArray(selection.optionIds) ||
        !selection.optionIds.length ||
        selection.optionIds.length > 20
      )
        throw new MenuValidationError("Invalid selection");
      groups.add(groupId);
      const optionIds = selection.optionIds.map(identifier).sort();
      if (new Set(optionIds).size !== optionIds.length)
        throw new MenuValidationError("Duplicate option");
      return { groupId, optionIds };
    })
    .sort((a, b) => a.groupId.localeCompare(b.groupId));
}
export function selectionKey(productId: string, selections: Selection[] = []) {
  // Preserve existing plain-product cart keys, including persisted pre-upgrade carts.
  return selections.length
    ? JSON.stringify([productId, parseSelections(selections)])
    : productId;
}
export function resolveSelection(rawGroups: unknown, rawSelection: unknown) {
  const groups = parseModifierGroups(rawGroups);
  const selections = parseSelections(rawSelection);
  const selected = new Map(
    selections.map((value) => [value.groupId, value.optionIds]),
  );
  if (
    selections.some(
      (value) => !groups.some((group) => group.id === value.groupId),
    )
  )
    throw new MenuValidationError("Unknown option group");
  let extraAmount = 0;
  const labels: string[] = [];
  for (const group of groups) {
    const ids = selected.get(group.id) || [];
    if (ids.length < group.min || ids.length > group.max)
      throw new MenuValidationError("Choose the required options");
    for (const id of ids) {
      const option = group.options.find((value) => value.id === id);
      if (!option)
        throw new MenuValidationError("Option is no longer available");
      extraAmount += option.price;
      labels.push(`${group.name}: ${option.name}`);
    }
  }
  return { selections, extraAmount, summary: labels.join(" · ") };
}

export function productUnitAmount(price: unknown, extraAmount = 0) {
  if (
    (typeof price !== "number" && typeof price !== "string") ||
    price === "" ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  )
    throw new MenuValidationError("Invalid product price");
  const amount = Math.round(Number(price) * 100) + extraAmount;
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000)
    throw new MenuValidationError("Invalid product price");
  return amount;
}

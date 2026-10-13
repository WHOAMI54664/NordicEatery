export function parseCategoryDeletion(value: unknown): {
  source: string;
  target: string | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalidInput");
  const { source, target } = value as Record<string, unknown>;
  const valid = (id: unknown): id is string =>
    typeof id === "string" && /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,63}$/u.test(id);
  if (
    !valid(source) ||
    (target !== null && !valid(target)) ||
    source === target
  )
    throw new Error("invalidInput");
  return { source, target: target as string | null };
}

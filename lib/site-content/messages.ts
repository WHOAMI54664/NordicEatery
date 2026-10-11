export type MessageTree = { [key: string]: string | MessageTree };
export type ContentRow = { key: string; value: string; page?: string };

export const COPY_PREFIX = "copy.";
const unsafe = new Set(["__proto__", "prototype", "constructor"]);

export function messageAt(
  messages: MessageTree,
  key: string,
): string | undefined {
  let current: string | MessageTree = messages;
  for (const part of key.split(".")) {
    if (
      unsafe.has(part) ||
      typeof current === "string" ||
      !Object.hasOwn(current, part)
    )
      return;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

// Only existing dictionary leaves are writable; no objects or arbitrary paths.
export function mergeCopy(
  messages: MessageTree,
  rows: ContentRow[],
): MessageTree {
  const merged = structuredClone(messages);
  for (const row of rows) {
    if (!row.key.startsWith(COPY_PREFIX) || typeof row.value !== "string")
      continue;
    const key = row.key.slice(COPY_PREFIX.length);
    if (messageAt(messages, key) === undefined) continue;
    const parts = key.split(".");
    let target = merged;
    for (const part of parts.slice(0, -1)) target = target[part] as MessageTree;
    target[parts.at(-1)!] = row.value;
  }
  return merged;
}

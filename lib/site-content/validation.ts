import {
  parse,
  TYPE,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";
import { COPY_PREFIX, messageAt, type MessageTree } from "./messages";

export class ContentInputError extends Error {}

function argumentsIn(message: string) {
  const result = new Set<string>();
  function visit(nodes: MessageFormatElement[]) {
    for (const node of nodes) {
      if (node.type === TYPE.literal || node.type === TYPE.pound) continue;
      result.add(`${node.type}:${node.value}`);
      if (node.type === TYPE.tag) visit(node.children);
      if (node.type === TYPE.select || node.type === TYPE.plural) {
        for (const option of Object.values(node.options)) visit(option.value);
      }
    }
  }
  visit(parse(message));
  return [...result].sort().join("|");
}

export function validMessage(template: string, value: string) {
  try {
    return argumentsIn(template) === argumentsIn(value);
  } catch {
    return false;
  }
}

export function parseContentInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ContentInputError("invalidInput");
  const { key, value, locale, page } = body as Record<string, unknown>;
  if (
    typeof key !== "string" ||
    !/^[\p{L}\p{N}][\p{L}\p{N}._-]{0,179}$/u.test(key) ||
    key
      .split(".")
      .some((part) =>
        ["__proto__", "constructor", "prototype"].includes(part),
      ) ||
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 8000 ||
    typeof locale !== "string" ||
    !["sv", "en", "pl", "ru"].includes(locale) ||
    typeof page !== "string" ||
    !/^[a-zA-Z0-9_-]{1,60}$/.test(page)
  ) {
    throw new ContentInputError("invalidInput");
  }
  return { key, value, locale, page };
}

export function validateCopyInput(
  input: ReturnType<typeof parseContentInput>,
  messages: MessageTree,
) {
  if (!input.key.startsWith(COPY_PREFIX)) return;
  const template = messageAt(messages, input.key.slice(COPY_PREFIX.length));
  if (input.page !== "translations" || template === undefined)
    throw new ContentInputError("invalidInput");
  if (!validMessage(template, input.value))
    throw new ContentInputError("invalidTemplate");
}

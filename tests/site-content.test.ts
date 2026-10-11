import test from "node:test";
import assert from "node:assert/strict";
import {
  parseContentInput,
  validateCopyInput,
  validMessage,
} from "../lib/site-content/validation";
import { messageAt, mergeCopy } from "../lib/site-content/messages";

const input = {
  key: "copy.checkout.pay",
  value: "Pay {amount}",
  page: "translations",
  locale: "sv",
};
const messages = { checkout: { pay: "Pay {amount}", title: "Checkout" } };

test("copy mutations validate shape, locale, length and safe keys", () => {
  assert.deepEqual(parseContentInput(input), input);
  for (const invalid of [
    null,
    [],
    { ...input, locale: "de" },
    { ...input, value: "  " },
    { ...input, value: "a".repeat(8001) },
    { ...input, key: { name: "title" } },
    { ...input, key: "copy.__proto__.x" },
    { ...input, page: "../checkout" },
  ])
    assert.throws(() => parseContentInput(invalid));
  assert.doesNotThrow(() =>
    parseContentInput({
      ...input,
      key: "home.hero.orderNow",
      page: "home",
      value: "Beställ nu",
    }),
  );
});

test("editable messages keep ICU variables, types, nesting and valid syntax", () => {
  assert.equal(validMessage("Pay {amount}", "Betala {amount}"), true);
  assert.equal(validMessage("Pay {amount}", "Pay"), false);
  assert.equal(validMessage("Pay {amount}", "Pay {amount"), false);
  assert.equal(validMessage("Pay {amount}", "Pay {amount, number}"), false);
  assert.equal(validMessage("Pay", "<link>Pay</link>"), false);
  assert.equal(
    validMessage(
      "{count, plural, one {One} other {# items}}",
      "{count, plural, one {En} other {# varor}}",
    ),
    true,
  );
  assert.equal(
    validMessage(
      "{count, plural, one {{name}} other {{name}}}",
      "{count, plural, one {One} other {Many}}",
    ),
    false,
  );
  assert.equal(validMessage("Place order", "Beställ"), true);
});

test("copy keys target existing leaves and reject malformed replacement templates", () => {
  assert.doesNotThrow(() => validateCopyInput(input, messages));
  for (const invalid of [
    { ...input, key: "copy.checkout" },
    { ...input, key: "copy.checkout.unknown" },
    { ...input, page: "checkout" },
    { ...input, value: "Pay {newValue}" },
  ])
    assert.throws(() => validateCopyInput(invalid, messages));
});

test("copy merging is immutable and protects dictionary structure and prototypes", () => {
  const merged = mergeCopy(messages, [
    input,
    { key: "copy.checkout.title", value: "Confirm order" },
    { key: "copy.checkout", value: "bad" },
    { key: "copy.constructor.prototype.x", value: "bad" },
    { key: "copy.checkout.unknown", value: "bad" },
  ]);
  assert.equal(messageAt(merged, "checkout.title"), "Confirm order");
  assert.equal(messageAt(messages, "checkout.title"), "Checkout");
  assert.equal(messageAt(merged, "checkout.unknown"), undefined);
  assert.equal(messageAt(merged, "constructor.prototype.x"), undefined);
});

test("saved copy preserves indentation, blank lines and surrounding whitespace", () => {
  const value = "  Första raden\n    Indragen rad\n\nSista raden  ";
  const saved = parseContentInput({
    ...input,
    key: "copy.checkout.title",
    value,
  });
  validateCopyInput(saved, messages);
  assert.equal(
    messageAt(mergeCopy(messages, [saved]), "checkout.title"),
    value,
  );
  assert.equal(
    parseContentInput({ ...saved, key: "home.hero.subtitle", page: "home" })
      .value,
    value,
  );
});

test("category names accept existing Swedish slugs but reject unsafe keys", () => {
  for (const key of [
    "menu.categories.custom.burgare",
    "menu.categories.custom.tillbehör",
  ]) {
    assert.doesNotThrow(() =>
      parseContentInput({ ...input, key, page: "menu" }),
    );
  }
  for (const key of [
    "menu.categories.custom.bad/name",
    "menu.categories.custom.<script>",
    "menu.categories.custom.__proto__",
    "menu.categories.custom.bad name",
  ]) {
    assert.throws(() => parseContentInput({ ...input, key, page: "menu" }));
  }
});

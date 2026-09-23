import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeEmail, emailLocale, openingMessage } from "../lib/notifications/opening-email";
test("only valid email strings are accepted, normalized and bounded", () => {
  assert.equal(normalizeEmail(" User@Example.com "), "user@example.com");
  for (const input of [null, {}, 42, "0731234567", "a@", "a\nb@example.com", "<a>@example.com", "a".repeat(255)+"@example.com"]) assert.equal(normalizeEmail(input), null);
});
test("unknown locales cannot inject a link or resolve inherited object properties", () => {
  for (const input of ["constructor", "__proto__", "../../evil", null, {}]) assert.equal(emailLocale(input), "sv");
});
test("all supported emails contain localized menu and token-protected opt-out", () => {
  for (const locale of ["sv","en","ru","pl"]) {
    const email = openingMessage(locale,"example-token");
    assert.ok(email.subject.length > 0);
    assert.ok(email.text.includes(`https://www.nordiceatery.se/${locale}/menu`));
    assert.ok(email.text.includes("/api/email-unsubscribe?token=example-token"));
  }
});

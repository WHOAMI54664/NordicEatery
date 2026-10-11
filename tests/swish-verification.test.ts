import assert from "node:assert/strict";
import { test } from "node:test";
import {
  internalSwishRequest,
  verifiedSwishPayment,
} from "../src/swish-verification";
test("ordinary Swish accepts only the internal caller and provider-confirmed identity/amount", () => {
  assert.equal(internalSwishRequest(undefined, undefined), false);
  assert.equal(internalSwishRequest("test-secret", "forged"), false);
  assert.equal(internalSwishRequest("test-secret", "test-secret"), true);
  const expected = {
    id: "a".repeat(32),
    orderNumber: "MF-TEST123",
    amount: 144,
    payeeAlias: "1234567890",
  };
  const payment = {
    id: expected.id,
    payeePaymentReference: "MFTEST123",
    amount: "144.00",
    currency: "SEK",
    payeeAlias: expected.payeeAlias,
    status: "PAID",
    paymentReference: "bank-reference",
  };
  assert.equal(verifiedSwishPayment(payment, expected)?.status, "PAID");
  for (const patch of [
    { id: "other" },
    { currency: "EUR" },
    { amount: "1.00" },
    { amount: "144junk" },
    { payeeAlias: "another-merchant" },
    { payeePaymentReference: "another-order" },
    { status: "FORGED" },
  ])
    assert.equal(
      verifiedSwishPayment({ ...payment, ...patch }, expected),
      null,
    );
});

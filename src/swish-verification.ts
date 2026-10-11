import { timingSafeEqual } from "node:crypto";
export function internalSwishRequest(
  secret: string | undefined,
  supplied: string | undefined,
) {
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret),
    actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function verifiedSwishPayment(
  value: unknown,
  expected: {
    id: string;
    orderNumber: string;
    amount: number;
    payeeAlias: string;
  },
) {
  if (!value || typeof value !== "object") return null;
  const payment = value as Record<string, unknown>;
  if (
    payment.id !== expected.id ||
    payment.currency !== "SEK" ||
    payment.payeeAlias !== expected.payeeAlias ||
    payment.payeePaymentReference !==
      expected.orderNumber.replace(/[^a-zA-Z0-9]/g, "").slice(0, 35) ||
    !/^\d+(\.\d{1,2})?$/.test(String(payment.amount)) ||
    Math.round(Number(payment.amount) * 100) !==
      Math.round(expected.amount * 100)
  )
    return null;
  if (
    !["PAID", "DECLINED", "CANCELLED", "ERROR", "CREATED"].includes(
      String(payment.status),
    )
  )
    return null;
  return {
    status: String(payment.status),
    paymentReference:
      typeof payment.paymentReference === "string"
        ? payment.paymentReference
        : null,
  };
}

import { createHash } from "node:crypto";
import { GroupError, type GroupPayment } from "./model";

export function swishInstruction(id: string, refund = false) {
  if (!refund) return id.replaceAll("-", "").toUpperCase();
  const hash = createHash("sha256").update(`group-refund:${id}`).digest("hex");
  return `${hash.slice(0, 12)}5${hash.slice(13, 16)}8${hash.slice(17, 32)}`.toUpperCase();
}

export function swishPhone(value: unknown) {
  if (typeof value !== "string") throw new GroupError("invalidPhone");
  let phone = value
    .replace(/[\s()-]/g, "")
    .replace(/^\+/, "")
    .replace(/^00/, "");
  if (phone.startsWith("0")) phone = `46${phone.slice(1)}`;
  if (!/^46\d{9}$/.test(phone)) throw new GroupError("invalidPhone");
  return phone;
}

export type SwishStatus = {
  id: string;
  status:
    | "CREATED"
    | "VALIDATED"
    | "DEBITED"
    | "PAID"
    | "DECLINED"
    | "CANCELLED"
    | "ERROR";
  amount: string;
  currency: "SEK";
  paymentReference?: string;
};

// All operations go through the existing certificate-backed Swish service.
// The browser can neither select the destination nor supply the charged amount.
export async function groupSwish(
  operation: "create" | "read" | "cancel" | "refund",
  groupId: string,
  payment: GroupPayment,
): Promise<SwishStatus> {
  const base = process.env.SWISH_BACKEND_URL;
  const secret = process.env.SWISH_INTERNAL_SECRET;
  if (!base || !secret) throw new GroupError("unavailable", 503);
  const url = new URL("/swish/group", base);
  if (
    url.protocol !== "https:" &&
    !(
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new GroupError("unavailable", 503);
  const refund = operation === "refund";
  const id = swishInstruction(payment.id, refund);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": secret,
    },
    body: JSON.stringify({
      operation,
      id,
      groupId,
      amount: payment.amount,
      payerAlias: payment.payerAlias,
      reference: swishInstruction(payment.id),
      originalPaymentReference: refund ? payment.intentId : undefined,
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) throw new GroupError("unavailable", 503);
  const data = await response.json();
  if (
    !data ||
    data.id !== id ||
    data.currency !== "SEK" ||
    typeof data.amount !== "string" ||
    !/^\d+(\.\d{1,2})?$/.test(data.amount) ||
    Math.round(Number(data.amount) * 100) !== payment.amount ||
    ![
      "CREATED",
      "VALIDATED",
      "DEBITED",
      "PAID",
      "DECLINED",
      "CANCELLED",
      "ERROR",
    ].includes(data.status) ||
    (refund
      ? data.originalPaymentReference !== payment.intentId
      : data.payeePaymentReference !== swishInstruction(payment.id))
  )
    throw new GroupError("paymentMismatch", 409);
  if (
    !refund &&
    data.status === "PAID" &&
    (typeof data.paymentReference !== "string" ||
      !/^[A-Za-z0-9]{1,64}$/.test(data.paymentReference))
  )
    throw new GroupError("paymentMismatch", 409);
  return data as SwishStatus;
}

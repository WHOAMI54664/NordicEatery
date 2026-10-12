import Stripe from "stripe";
import { createHash } from "node:crypto";
import { createAdminClient } from "../supabase/admin";
import { normalizeEmail } from "../notifications/opening-email";
import {
  generateReceiptPdf,
  receiptFilename,
  type ReceiptOrder,
} from "./receipt-pdf";
import { isAuthorizedStripeReceipt } from "./stripe-receipt-access";

export class ReceiptError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export function receiptStripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new ReceiptError(503, "unavailable");
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    timeout: 10000,
    maxNetworkRetries: 1,
  });
}
export async function paidReceiptSession(
  sessionId: unknown,
  stripe = receiptStripe(),
) {
  if (
    typeof sessionId !== "string" ||
    !/^cs_[a-zA-Z0-9_]{5,250}$/.test(sessionId)
  )
    throw new ReceiptError(403, "forbidden");
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.latest_charge"],
  });
  const intent =
    typeof session.payment_intent === "object" ? session.payment_intent : null;
  const charge =
    intent && typeof intent.latest_charge === "object"
      ? intent.latest_charge
      : null;
  if (
    session.payment_status !== "paid" ||
    session.currency !== "sek" ||
    !intent ||
    intent.status !== "succeeded" ||
    !charge ||
    !charge.paid ||
    charge.amount_refunded > 0
  )
    throw new ReceiptError(409, "notPaid");
  return {
    session,
    intentId: intent.id,
    paidAt: new Date(charge.created * 1000).toISOString(),
  };
}
export async function loadOrderReceipt(
  orderNumber: string,
  sessionId: unknown,
): Promise<ReceiptOrder> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(orderNumber))
    throw new ReceiptError(404, "notFound");
  const { data: order, error } = await createAdminClient()
    .from("orders")
    .select(
      "id,order_number,display_order_number,order_date,payment_method,payment_status,payment_reference,stripe_session_id,stripe_payment_intent_id,total_gross,total_net,total_vat,vat_rate,discount_gross,delivery_fee_gross,address,delivery_type,customer_email,items,created_at,paid_at",
    )
    .eq("order_number", orderNumber)
    .maybeSingle<ReceiptOrder>();
  if (error) throw new ReceiptError(503, "unavailable");
  if (!order || order.payment_status !== "paid")
    throw new ReceiptError(404, "notPaid");
  if (order.payment_method === "card") {
    // Reject unknown references before contacting Stripe or revealing a PDF.
    if (!sessionId || sessionId !== order.stripe_session_id)
      throw new ReceiptError(403, "forbidden");
    const { session, intentId, paidAt } = await paidReceiptSession(sessionId);
    if (
      !isAuthorizedStripeReceipt(order, session) ||
      session.amount_total !== Math.round(Number(order.total_gross) * 100) ||
      intentId !== order.stripe_payment_intent_id
    )
      throw new ReceiptError(403, "forbidden");
    return { ...order, paid_at: paidAt };
  }
  // Preserve the existing Swish UUID capability; public daily numbers are never accepted.
  if (
    order.payment_method !== "swish" ||
    !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(orderNumber)
  )
    throw new ReceiptError(403, "forbidden");
  return order;
}
export async function sendReceiptEmail(order: ReceiptOrder, value: unknown) {
  const email = normalizeEmail(value);
  if (!email) throw new ReceiptError(400, "invalidEmail");
  const from = process.env.RECEIPT_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from)
    throw new ReceiptError(503, "emailUnavailable");
  const pdf = await generateReceiptPdf(order);
  // Retrying an uncertain send of the same receipt to the same recipient must not duplicate email.
  const key = createHash("sha256")
    .update(pdf)
    .update(
      `${order.id}:${order.payment_reference}:${email}:${Math.floor(Date.now() / 86400000)}`,
    )
    .digest("hex");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `receipt-${key}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Ditt kvitto från Nordic Eatery",
      text: "Tack för din beställning! Ditt betalningskvitto finns som bifogad PDF.\n\nNordic Eatery AB\nwww.nordiceatery.se",
      attachments: [
        { filename: receiptFilename(order), content: pdf.toString("base64") },
      ],
    }),
  });
  if (!response.ok) throw new ReceiptError(503, "emailUnavailable");
  const result = await response.json();
  if (typeof result.id !== "string" || !result.id)
    throw new ReceiptError(503, "emailUnavailable");
}

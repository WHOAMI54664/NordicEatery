import { GroupError, requireMember, type GroupRow } from "./model";
import { readGroup, groupDb } from "./store";
import { paidReceiptSession, ReceiptError } from "../orders/receipt-service";
import type { ReceiptOrder } from "../orders/receipt-pdf";

export function groupReceiptPayment(row: GroupRow, hash: string) {
  const member = requireMember(row.state, hash);
  const payment = row.state.payments.find((p) => p.memberId === member.id);
  if (
    row.state.paymentMethod !== "card" ||
    !payment ||
    payment.status !== "paid" ||
    !payment.sessionId ||
    !payment.intentId
  )
    throw new GroupError("receiptUnavailable", 409);
  const lines = row.state.lines.filter(
    (line) => row.state.mode === "host" || line.memberId === member.id,
  );
  if (
    lines.reduce((sum, line) => sum + line.unitAmount * line.quantity, 0) !==
    payment.amount
  )
    throw new GroupError("paymentMismatch", 409);
  return { payment, lines };
}
export async function loadGroupReceipt(
  id: string,
  hash: string,
): Promise<ReceiptOrder> {
  const row = await readGroup(id);
  const { payment, lines } = groupReceiptPayment(row, hash);
  const { session, intentId, paidAt } = await paidReceiptSession(
    payment.sessionId,
  );
  if (
    session.metadata?.group_id !== id ||
    session.metadata?.group_payment_id !== payment.id ||
    session.amount_total !== payment.amount ||
    intentId !== payment.intentId
  )
    throw new ReceiptError(403, "forbidden");
  const { data: order, error } = await groupDb()
    .from("orders")
    .select("display_order_number,vat_rate")
    .eq("group_order_id", id)
    .maybeSingle();
  if (error) throw new GroupError("unavailable", 503);
  // The group's immutable fulfillment contract currently uses 6%; prefer the saved order after submission.
  const vatRate = Number(order?.vat_rate ?? 6);
  const total = payment.amount / 100;
  const net = Math.round((total / (1 + vatRate / 100)) * 100) / 100;
  return {
    id: payment.id,
    order_number: payment.id,
    display_order_number: order?.display_order_number || null,
    order_date: null,
    payment_method: "card",
    payment_status: "paid",
    payment_reference: intentId,
    stripe_session_id: session.id,
    stripe_payment_intent_id: intentId,
    total_gross: total,
    total_net: net,
    total_vat: Math.round((total - net) * 100) / 100,
    vat_rate: vatRate,
    address: "SSAB, Luleå - anvisad snurrgrind",
    delivery_type: "pickup",
    items: lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      price: line.unitAmount / 100,
      line_total_gross: (line.unitAmount * line.quantity) / 100,
    })),
    created_at: paidAt,
    paid_at: paidAt,
  };
}

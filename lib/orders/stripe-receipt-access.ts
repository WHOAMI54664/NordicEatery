export type StripeReceiptOrder = {
  order_number: string | null;
  payment_method: string | null;
  payment_status: string | null;
  stripe_session_id: string | null;
};

export type StripeReceiptSession = {
  id: string;
  payment_status: string;
  metadata: Record<string, string> | null;
};

export function isAuthorizedStripeReceipt(
  order: StripeReceiptOrder,
  session: StripeReceiptSession,
) {
  return (
    order.payment_method === "card" &&
    order.payment_status === "paid" &&
    Boolean(order.order_number) &&
    order.stripe_session_id === session.id &&
    session.payment_status === "paid" &&
    session.metadata?.orderId === order.order_number
  );
}

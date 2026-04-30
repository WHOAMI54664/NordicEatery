import { OrderStatusTracker } from "@/components/OrderStatusTracker";

export default async function OrderStatusPage({
                                                params,
                                              }: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  return <OrderStatusTracker orderNumber={id} />;
}
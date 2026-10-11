export type KitchenArrivalOrder = {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
};
export function visibleInKitchen(order: KitchenArrivalOrder) {
  return (
    ["new", "preparing", "ready"].includes(order.status) &&
    (order.payment_method === "cash" || order.payment_status === "paid")
  );
}

export function kitchenArrivals(
  previous: ReadonlySet<string> | null,
  orders: KitchenArrivalOrder[],
) {
  const visible = orders.filter(visibleInKitchen);
  return {
    ids: new Set(visible.map((order) => order.id)),
    // First successful load is a baseline, not a delivery of historical orders.
    arrivals:
      previous === null
        ? []
        : visible.filter(
            (order) => order.status === "new" && !previous.has(order.id),
          ),
  };
}

"use client";

import { use, useEffect, useState } from "react";

const ORDERS_STORAGE_KEY = "mikes-food-orders";

type OrderStatus = "new" | "preparing" | "ready" | "completed" | "cancelled";

type KitchenOrder = {
  id: string;
  status: OrderStatus;
};

const statusText: Record<OrderStatus, string> = {
  new: "Order received",
  preparing: "Preparing your food",
  ready: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled"
};

export default function OrderStatusPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<KitchenOrder | null>(null);

  function loadOrder() {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return setOrder(null);

    const orders = JSON.parse(raw) as KitchenOrder[];
    setOrder(orders.find((item) => item.id === id) || null);
  }

  useEffect(() => {
    loadOrder();

    const interval = window.setInterval(loadOrder, 1000);

    function handleStorageChange(event: StorageEvent) {
      if (event.key === ORDERS_STORAGE_KEY) loadOrder();
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [id]);

  if (!order) {
    return (
      <main className="min-h-screen px-6 py-24">
        <h1 className="text-3xl font-black text-dark">Order not found</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-6 py-24">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-dark/10 bg-white p-8 shadow-xl">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-paprika">
          Order status
        </p>

        <h1 className="mt-4 text-4xl font-black text-dark">
          {statusText[order.status]}
        </h1>

        <p className="mt-4 text-dark/60">
          Order ID: <span className="font-bold text-dark">{order.id}</span>
        </p>

        <div className="mt-8 space-y-4">
          <StatusStep active={order.status === "new"} done label="Order received" />

          <StatusStep
            active={order.status === "preparing"}
            done={["preparing", "ready", "completed"].includes(order.status)}
            label="Preparing"
          />

          <StatusStep
            active={order.status === "ready"}
            done={["ready", "completed"].includes(order.status)}
            label="Ready"
          />

          <StatusStep
            active={order.status === "completed"}
            done={order.status === "completed"}
            label="Completed"
          />
        </div>

        <p className="mt-8 text-sm text-dark/50">
          This page updates automatically.
        </p>
      </section>
    </main>
  );
}

function StatusStep({
  label,
  active,
  done
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border px-4 py-4 ${
        done ? "border-paprika/30 bg-paprika/10" : "border-dark/10 bg-dark/5"
      }`}
    >
      <div
        className={`h-4 w-4 rounded-full ${
          active ? "bg-paprika animate-pulse" : done ? "bg-paprika" : "bg-dark/20"
        }`}
      />

      <span className="font-bold text-dark">{label}</span>
    </div>
  );
}
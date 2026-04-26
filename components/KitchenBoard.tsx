"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, CheckCircle2, ChefHat, Trash2 } from "lucide-react";
import type { KitchenOrder, OrderStatus } from "@/types/order";

const ORDERS_STORAGE_KEY = "mikes-food-orders";

const statusLabels: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled"
};

const statusColumns: Array<{
  status: OrderStatus;
  title: string;
  description: string;
}> = [
  {
    status: "new",
    title: "New orders",
    description: "Accept and start cooking."
  },
  {
    status: "preparing",
    title: "Preparing",
    description: "Orders currently in the kitchen."
  },
  {
    status: "ready",
    title: "Ready",
    description: "Ready for pickup or delivery."
  }
];

function readOrders(): KitchenOrder[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as KitchenOrder[];
  } catch {
    return [];
  }
}

function saveOrders(orders: KitchenOrder[]) {
  window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en-SE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function minutesAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

export function KitchenBoard() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);

  useEffect(() => {
    setOrders(readOrders());

    const interval = window.setInterval(() => {
      setOrders(readOrders());
    }, 3000);

    function handleStorageChange() {
      setOrders(readOrders());
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const activeOrders = useMemo(
    () =>
      orders
        .filter((order) => !["completed", "cancelled"].includes(order.status))
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
    [orders]
  );

  function updateStatus(orderId: string, status: OrderStatus) {
    const updatedOrders = orders.map((order) =>
      order.id === orderId ? { ...order, status } : order
    );

    saveOrders(updatedOrders);
    setOrders(updatedOrders);
  }

  function deleteOrder(orderId: string) {
    const updatedOrders = orders.filter((order) => order.id !== orderId);
    saveOrders(updatedOrders);
    setOrders(updatedOrders);
  }

  const newOrdersCount = activeOrders.filter((order) => order.status === "new").length;

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-black uppercase tracking-[0.25em] text-paprika">
            Kitchen display
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-dark sm:text-6xl">
            Orders board
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-dark/60">
            Keep this page open on the kitchen tablet. New orders will appear
            here and can be moved through the kitchen workflow.
          </p>
        </div>

        <div className="glass-card flex items-center gap-4 px-5 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paprika text-white">
            <ChefHat size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-dark/45">
              New now
            </p>
            <p className="text-2xl font-black text-paprika">
              {newOrdersCount}
            </p>
          </div>
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-paprika/10 text-4xl">
            👨‍🍳
          </div>
          <h2 className="mt-6 text-2xl font-black text-dark">
            No active orders
          </h2>
          <p className="mt-3 text-dark/55">
            Demo orders from checkout will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          {statusColumns.map((column) => {
            const columnOrders = activeOrders.filter(
              (order) => order.status === column.status
            );

            return (
              <section key={column.status} className="glass-card p-4">
                <div className="mb-4 rounded-[1.4rem] bg-white/65 p-4">
                  <h2 className="text-xl font-black text-dark">
                    {column.title}
                  </h2>
                  <p className="mt-1 text-sm text-dark/55">
                    {column.description}
                  </p>
                </div>

                <div className="space-y-4">
                  {columnOrders.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-dashed border-dark/10 p-5 text-center text-sm font-bold text-dark/35">
                      Empty
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <article
                        key={order.id}
                        className="rounded-[1.6rem] border border-white/70 bg-white/80 p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-paprika">
                              #{order.id.slice(-5)}
                            </p>
                            <h3 className="mt-1 text-xl font-black text-dark">
                              {order.customerName}
                            </h3>
                          </div>

                          <div className="rounded-full bg-dark px-3 py-1 text-xs font-black text-white">
                            {statusLabels[order.status]}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-full bg-paprika/10 px-3 py-1 text-paprika">
                            {order.deliveryType}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-dark/5 px-3 py-1 text-dark/60">
                            <Clock size={13} />
                            {formatTime(order.createdAt)} · {minutesAgo(order.createdAt)} min
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between gap-3 rounded-2xl bg-cream/70 px-3 py-2"
                            >
                              <div>
                                <p className="font-black text-dark">
                                  {item.name}
                                </p>
                                <p className="text-xs text-dark/45">
                                  {item.subtitle}
                                </p>
                              </div>
                              <p className="text-lg font-black text-paprika">
                                x{item.quantity}
                              </p>
                            </div>
                          ))}
                        </div>

                        {order.comment && (
                          <div className="mt-4 rounded-2xl bg-honey/15 p-3">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-dark/40">
                              Comment
                            </p>
                            <p className="mt-1 text-sm font-bold text-dark">
                              {order.comment}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 text-sm text-dark/55">
                          <p className="font-bold">{order.customerPhone}</p>
                          <p>{order.address}</p>
                        </div>

                        <div className="mt-5 grid gap-2">
                          {order.status === "new" && (
                            <button
                              type="button"
                              onClick={() => updateStatus(order.id, "preparing")}
                              className="rounded-2xl bg-paprika px-4 py-3 text-sm font-black text-white transition hover:bg-cherry"
                            >
                              Start preparing
                            </button>
                          )}

                          {order.status === "preparing" && (
                            <button
                              type="button"
                              onClick={() => updateStatus(order.id, "ready")}
                              className="rounded-2xl bg-dark px-4 py-3 text-sm font-black text-white transition hover:opacity-90"
                            >
                              Mark as ready
                            </button>
                          )}

                          {order.status === "ready" && (
                            <button
                              type="button"
                              onClick={() => updateStatus(order.id, "completed")}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-honey px-4 py-3 text-sm font-black text-dark transition hover:opacity-90"
                            >
                              <CheckCircle2 size={18} />
                              Complete order
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteOrder(order.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dark/5 px-4 py-3 text-sm font-black text-dark/55 transition hover:bg-paprika/10 hover:text-paprika"
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

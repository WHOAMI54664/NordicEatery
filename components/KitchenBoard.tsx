"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, CheckCircle2, ChefHat, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/browser";
import type { OrderStatus } from "@/types/order";

type KitchenOrderItem = {
  id: string;
  name: string;
  subtitle?: string | null;
  quantity: number;
  price: number;
};

type DbOrder = {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_phone: string;
  address: string;
  delivery_type: "delivery" | "pickup";
  comment: string | null;
  items: KitchenOrderItem[];
  total_price: number;
  status: OrderStatus;
  payment_method: "cash" | "swish" | "card";
  payment_status: "unpaid" | "awaiting_payment" | "paid" | "failed" | "refunded";
  created_at: string;
};

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en-SE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function minutesAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

export function KitchenBoard() {
  const t = useTranslations("admin.kitchen");
  const supabase = useMemo(() => createClient(), []);

  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const statusLabels: Record<OrderStatus, string> = {
    new: t("statuses.new"),
    preparing: t("statuses.preparing"),
    ready: t("statuses.ready"),
    completed: t("statuses.completed"),
    cancelled: t("statuses.cancelled"),
  };

  const statusColumns: Array<{
    status: OrderStatus;
    title: string;
    description: string;
  }> = [
    {
      status: "new",
      title: t("columns.newTitle"),
      description: t("columns.newDescription"),
    },
    {
      status: "preparing",
      title: t("columns.preparingTitle"),
      description: t("columns.preparingDescription"),
    },
    {
      status: "ready",
      title: t("columns.readyTitle"),
      description: t("columns.readyDescription"),
    },
  ];

  async function fetchOrders() {
    const { data, error } = await supabase
        .from("orders")
        .select(
            "id, order_number, customer_name, customer_phone, address, delivery_type, comment, items, total_price, status, payment_method, payment_status, created_at"
        )
        .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setOrders((data || []) as DbOrder[]);
    setErrorMessage("");
    setIsLoading(false);
  }

  useEffect(() => {
    fetchOrders();

    const interval = window.setInterval(() => {
      fetchOrders();
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const activeOrders = useMemo(
      () =>
          orders
              .filter((order) => !["completed", "cancelled"].includes(order.status))
              .filter((order) => {
                if (order.payment_method === "card") {
                  return order.payment_status === "paid";
                }

                return true;
              })
              .sort(
                  (a, b) =>
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              ),
      [orders]
  );

  async function updateStatus(orderId: string, status: OrderStatus) {
    const { error } = await supabase
        .from("orders")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await fetchOrders();
  }

  async function deleteOrder(orderId: string) {
    const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await fetchOrders();
  }

  const newOrdersCount = activeOrders.filter(
      (order) => order.status === "new"
  ).length;

  if (isLoading) {
    return (
        <div className="glass-card p-10 text-center">
          <p className="font-black text-dark">Loading kitchen orders...</p>
        </div>
    );
  }

  return (
      <div>
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-paprika">
              {t("display")}
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-dark sm:text-6xl">
              {t("title")}
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-dark/60">
              {t("subtitle")}
            </p>
          </div>

          <div className="glass-card flex items-center gap-4 px-5 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paprika text-white">
              <ChefHat size={24} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-dark/45">
                {t("newNow")}
              </p>
              <p className="text-2xl font-black text-paprika">
                {newOrdersCount}
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
            <div className="mb-6 rounded-3xl bg-paprika/10 p-4 text-sm font-bold text-paprika">
              {errorMessage}
            </div>
        )}

        {activeOrders.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-paprika/10 text-4xl">
                👨‍🍳
              </div>

              <h2 className="mt-6 text-2xl font-black text-dark">
                {t("noActiveOrders")}
              </h2>

              <p className="mt-3 text-dark/55">{t("emptyText")}</p>
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
                              {t("empty")}
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
                                        #{order.order_number || order.id.slice(-5)}
                                      </p>

                                      <h3 className="mt-1 text-xl font-black text-dark">
                                        {order.customer_name}
                                      </h3>
                                    </div>

                                    <div className="rounded-full bg-dark px-3 py-1 text-xs font-black text-white">
                                      {statusLabels[order.status]}
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-full bg-paprika/10 px-3 py-1 text-paprika">
                            {order.delivery_type}
                          </span>

                                    <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                            {order.payment_method} · {order.payment_status}
                          </span>

                                    <span className="inline-flex items-center gap-1 rounded-full bg-dark/5 px-3 py-1 text-dark/60">
                            <Clock size={13} />
                                      {formatTime(order.created_at)} ·{" "}
                                      {minutesAgo(order.created_at)} {t("min")}
                          </span>
                                  </div>

                                  <div className="mt-4 space-y-3">
                                    {(order.items || []).map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between gap-3 rounded-2xl bg-cream/70 px-3 py-2"
                                        >
                                          <div>
                                            <p className="font-black text-dark">
                                              {item.name}
                                            </p>

                                            {item.subtitle && (
                                                <p className="text-xs text-dark/45">
                                                  {item.subtitle}
                                                </p>
                                            )}
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
                                          {t("comment")}
                                        </p>
                                        <p className="mt-1 text-sm font-bold text-dark">
                                          {order.comment}
                                        </p>
                                      </div>
                                  )}

                                  <div className="mt-4 text-sm text-dark/55">
                                    <p className="font-bold">{order.customer_phone}</p>
                                    <p>{order.address}</p>
                                  </div>

                                  <div className="mt-5 grid gap-2">
                                    {order.status === "new" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateStatus(order.id, "preparing")
                                            }
                                            className="rounded-2xl bg-paprika px-4 py-3 text-sm font-black text-white transition hover:bg-cherry"
                                        >
                                          {t("startPreparing")}
                                        </button>
                                    )}

                                    {order.status === "preparing" && (
                                        <button
                                            type="button"
                                            onClick={() => updateStatus(order.id, "ready")}
                                            className="rounded-2xl bg-dark px-4 py-3 text-sm font-black text-white transition hover:opacity-90"
                                        >
                                          {t("markReady")}
                                        </button>
                                    )}

                                    {order.status === "ready" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateStatus(order.id, "completed")
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-honey px-4 py-3 text-sm font-black text-dark transition hover:opacity-90"
                                        >
                                          <CheckCircle2 size={18} />
                                          {t("completeOrder")}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => deleteOrder(order.id)}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dark/5 px-4 py-3 text-sm font-black text-dark/55 transition hover:bg-paprika/10 hover:text-paprika"
                                    >
                                      <Trash2 size={16} />
                                      {t("remove")}
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
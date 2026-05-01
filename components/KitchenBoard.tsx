"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  PackageCheck,
  RefreshCw,
  Trash2,
  Truck
} from "lucide-react";
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
    minute: "2-digit"
  }).format(new Date(date));
}

function minutesAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0
  }).format(value);
}

function formatOrderNumber(order: DbOrder) {
  if (order.order_number) return order.order_number;

  const cleanId = order.id.replace(/-/g, "").toUpperCase();
  return `MF-${cleanId.slice(-7)}`;
}

function getPaymentClass(paymentStatus: DbOrder["payment_status"]) {
  switch (paymentStatus) {
    case "paid":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
    case "awaiting_payment":
      return "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]";
    case "failed":
    case "refunded":
      return "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]";
    default:
      return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
  }
}

function getColumnStyle(status: OrderStatus) {
  switch (status) {
    case "new":
      return {
        icon: Clock,
        iconClass: "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]",
        badgeClass: "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]"
      };
    case "preparing":
      return {
        icon: ChefHat,
        iconClass: "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]",
        badgeClass: "border-[#FF9F40]/25 bg-[#FF9F40]/15 text-[#B45309]"
      };
    case "ready":
      return {
        icon: PackageCheck,
        iconClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
        badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
      };
    default:
      return {
        icon: ChefHat,
        iconClass: "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]",
        badgeClass: "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]"
      };
  }
}

export function KitchenBoard() {
  const t = useTranslations("admin.kitchen");
  const supabase = useMemo(() => createClient(), []);

  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const statusLabels: Record<OrderStatus, string> = {
    new: t("statuses.new"),
    preparing: t("statuses.preparing"),
    ready: t("statuses.ready"),
    completed: t("statuses.completed"),
    cancelled: t("statuses.cancelled")
  };

  const statusColumns: Array<{
    status: OrderStatus;
    title: string;
    description: string;
  }> = [
    {
      status: "new",
      title: t("columns.newTitle"),
      description: t("columns.newDescription")
    },
    {
      status: "preparing",
      title: t("columns.preparingTitle"),
      description: t("columns.preparingDescription")
    },
    {
      status: "ready",
      title: t("columns.readyTitle"),
      description: t("columns.readyDescription")
    }
  ];

  async function fetchOrders(options?: { silent?: boolean }) {
    if (!options?.silent) setIsRefreshing(true);

    const { data, error } = await supabase
        .from("orders")
        .select(
            "id, order_number, customer_name, customer_phone, address, delivery_type, comment, items, total_price, status, payment_method, payment_status, created_at"
        )
        .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    setOrders((data || []) as DbOrder[]);
    setErrorMessage("");
    setIsLoading(false);
    setIsRefreshing(false);
  }

  useEffect(() => {
    fetchOrders({ silent: true });

    const interval = window.setInterval(() => {
      fetchOrders({ silent: true });
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
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime()
              ),
      [orders]
  );

  async function updateStatus(orderId: string, status: OrderStatus) {
    const { error } = await supabase
        .from("orders")
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await fetchOrders({ silent: true });
  }

  async function deleteOrder(orderId: string) {
    const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await fetchOrders({ silent: true });
  }

  const newOrdersCount = activeOrders.filter(
      (order) => order.status === "new"
  ).length;

  const preparingOrdersCount = activeOrders.filter(
      (order) => order.status === "preparing"
  ).length;

  const readyOrdersCount = activeOrders.filter(
      (order) => order.status === "ready"
  ).length;

  const activeRevenue = activeOrders.reduce(
      (sum, order) => sum + Number(order.total_price || 0),
      0
  );

  if (isLoading) {
    return (
        <div className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-10 text-center shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
            <ChefHat className="h-7 w-7 animate-pulse text-[#C7192E]" />
          </div>
          <p className="mt-5 text-sm font-black text-[#25120F]">
            Loading kitchen orders...
          </p>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                <ChefHat className="h-3.5 w-3.5" />
                {t("display")}
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                {t("title")}
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                {t("subtitle")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                  {t("newNow")}
                </p>
                <p className="mt-1 text-2xl font-black text-[#C7192E]">
                  {newOrdersCount}
                </p>
              </div>

              <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                  Preparing
                </p>
                <p className="mt-1 text-2xl font-black text-[#B45309]">
                  {preparingOrdersCount}
                </p>
              </div>

              <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                  Ready
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-700">
                  {readyOrdersCount}
                </p>
              </div>

              <button
                  type="button"
                  onClick={() => fetchOrders()}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E]"
              >
                <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {errorMessage ? (
            <div className="rounded-[1.5rem] border border-[#E51B23]/15 bg-[#E51B23]/8 p-4 text-sm font-bold text-[#C7192E]">
              {errorMessage}
            </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
            <p className="text-sm font-black text-[#8A7A70]">Active orders</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
              {activeOrders.length}
            </h3>
            <p className="mt-3 text-xs font-medium text-[#7B6A61]">
              Orders currently in kitchen flow
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
            <p className="text-sm font-black text-[#8A7A70]">Active revenue</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
              {formatCurrency(activeRevenue)}
            </h3>
            <p className="mt-3 text-xs font-medium text-[#7B6A61]">
              Value of current active orders
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
            <p className="text-sm font-black text-[#8A7A70]">Delivery orders</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
              {
                activeOrders.filter((order) => order.delivery_type === "delivery")
                    .length
              }
            </h3>
            <p className="mt-3 text-xs font-medium text-[#7B6A61]">
              Delivery flow only
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
            <p className="text-sm font-black text-[#8A7A70]">Pickup orders</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
              {
                activeOrders.filter((order) => order.delivery_type === "pickup")
                    .length
              }
            </h3>
            <p className="mt-3 text-xs font-medium text-[#7B6A61]">
              Pickup flow only
            </p>
          </div>
        </section>

        {activeOrders.length === 0 ? (
            <div className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-10 text-center shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 text-4xl">
                👨‍🍳
              </div>

              <h2 className="mt-6 text-2xl font-black text-[#25120F]">
                {t("noActiveOrders")}
              </h2>

              <p className="mt-3 text-sm font-medium text-[#7B6A61]">
                {t("emptyText")}
              </p>
            </div>
        ) : (
            <div className="grid gap-5 xl:grid-cols-3">
              {statusColumns.map((column) => {
                const columnOrders = activeOrders.filter(
                    (order) => order.status === column.status
                );

                const style = getColumnStyle(column.status);
                const ColumnIcon = style.icon;

                return (
                    <section
                        key={column.status}
                        className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-4 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl"
                    >
                      <div className="mb-4 rounded-[1.5rem] border border-[#EADDCF] bg-white/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                              {column.title}
                            </h2>
                            <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                              {column.description}
                            </p>
                          </div>

                          <div
                              className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${style.iconClass}`}
                          >
                            <ColumnIcon className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="mt-4 inline-flex rounded-full border border-[#EADDCF] bg-[#FFF7EA] px-3 py-1 text-xs font-black text-[#7B6A61]">
                          {columnOrders.length} orders
                        </div>
                      </div>

                      <div className="space-y-4">
                        {columnOrders.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-dashed border-[#EADDCF] bg-white/50 p-5 text-center text-sm font-bold text-[#A39388]">
                              {t("empty")}
                            </div>
                        ) : (
                            columnOrders.map((order) => (
                                <article
                                    key={order.id}
                                    className="rounded-[1.6rem] border border-[#EADDCF] bg-white/75 p-4 shadow-sm shadow-[#4C2314]/5 transition hover:bg-[#FFF3E2]"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C7192E]">
                                        #{formatOrderNumber(order)}
                                      </p>

                                      <h3 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#25120F]">
                                        {order.customer_name}
                                      </h3>
                                    </div>

                                    <div
                                        className={`rounded-full border px-3 py-1 text-xs font-black ${style.badgeClass}`}
                                    >
                                      {statusLabels[order.status]}
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-[#C7192E]">
                            {order.delivery_type}
                          </span>

                                    <span
                                        className={`rounded-full border px-3 py-1 ${getPaymentClass(
                                            order.payment_status
                                        )}`}
                                    >
                            {order.payment_method} · {order.payment_status}
                          </span>

                                    <span className="inline-flex items-center gap-1 rounded-full border border-[#EADDCF] bg-[#FFF3E2] px-3 py-1 text-[#7B6A61]">
                            <Clock size={13} />
                                      {formatTime(order.created_at)} ·{" "}
                                      {minutesAgo(order.created_at)} {t("min")}
                          </span>
                                  </div>

                                  <div className="mt-4 space-y-3">
                                    {(order.items || []).map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between gap-3 rounded-2xl border border-[#EADDCF] bg-[#FFF7EA]/85 px-3 py-2"
                                        >
                                          <div>
                                            <p className="font-black text-[#25120F]">
                                              {item.name}
                                            </p>

                                            {item.subtitle ? (
                                                <p className="text-xs font-medium text-[#7B6A61]">
                                                  {item.subtitle}
                                                </p>
                                            ) : null}
                                          </div>

                                          <p className="text-lg font-black text-[#C7192E]">
                                            x{item.quantity}
                                          </p>
                                        </div>
                                    ))}
                                  </div>

                                  {order.comment ? (
                                      <div className="mt-4 rounded-2xl border border-[#F6A21A]/20 bg-[#F6A21A]/12 p-3">
                                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[#A96800]">
                                          {t("comment")}
                                        </p>
                                        <p className="mt-1 text-sm font-bold text-[#25120F]">
                                          {order.comment}
                                        </p>
                                      </div>
                                  ) : null}

                                  <div className="mt-4 rounded-2xl border border-[#EADDCF] bg-white/70 p-3 text-sm text-[#7B6A61]">
                                    <p className="font-black text-[#25120F]">
                                      {order.customer_phone}
                                    </p>
                                    <p className="mt-1 font-medium">
                                      {order.delivery_type === "delivery"
                                          ? order.address
                                          : "Pickup order"}
                                    </p>
                                  </div>

                                  <div className="mt-4 flex items-center justify-between border-t border-[#EADDCF] pt-4">
                                    <p className="text-sm font-black text-[#25120F]">
                                      Total
                                    </p>
                                    <p className="text-xl font-black text-[#C7192E]">
                                      {formatCurrency(order.total_price)}
                                    </p>
                                  </div>

                                  <div className="mt-5 grid gap-2">
                                    {order.status === "new" ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateStatus(order.id, "preparing")
                                            }
                                            className="rounded-2xl bg-[#E51B23] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#E51B23]/15 transition hover:bg-[#C7192E]"
                                        >
                                          {t("startPreparing")}
                                        </button>
                                    ) : null}

                                    {order.status === "preparing" ? (
                                        <button
                                            type="button"
                                            onClick={() => updateStatus(order.id, "ready")}
                                            className="rounded-2xl bg-[#2A1712] px-4 py-3 text-sm font-black text-white transition hover:opacity-90"
                                        >
                                          {t("markReady")}
                                        </button>
                                    ) : null}

                                    {order.status === "ready" ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateStatus(order.id, "completed")
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                                        >
                                          <CheckCircle2 size={18} />
                                          {t("completeOrder")}
                                        </button>
                                    ) : null}

                                    <button
                                        type="button"
                                        onClick={() => deleteOrder(order.id)}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-sm font-black text-[#7B6A61] transition hover:border-[#E51B23]/20 hover:bg-[#E51B23]/8 hover:text-[#C7192E]"
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
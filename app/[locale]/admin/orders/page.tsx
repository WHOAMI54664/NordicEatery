import { redirect } from "next/navigation";
import {
    Banknote,
    CalendarClock,
    ClipboardList,
    CreditCard,
    PackageCheck,
    Phone,
    Truck
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrderStatusActions } from "@/components/admin/OrderStatusActions";
import { createClient } from "@/lib/supabase/server";
import { canManageOrders } from "@/lib/auth/roles";
import type { OrderStatus } from "@/types/order";

type OrderItem = {
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
    address: string | null;
    delivery_type: "delivery" | "pickup";
    comment: string | null;
    items: OrderItem[];
    total_price: number;
    status: OrderStatus;
    payment_method: "cash" | "swish" | "card";
    payment_status: "unpaid" | "awaiting_payment" | "paid" | "failed" | "refunded";
    created_at: string;
};

type AdminOrdersPageProps = {
    params: Promise<{
        locale: string;
    }>;
};

function formatCurrency(value: number, locale: string) {
    return new Intl.NumberFormat(locale === "en" ? "en-SE" : locale, {
        style: "currency",
        currency: "SEK",
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}

function formatDate(date: string, locale: string) {
    return new Intl.DateTimeFormat(locale === "en" ? "en-SE" : locale, {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(date));
}

function formatOrderNumber(order: DbOrder) {
    if (order.order_number) return order.order_number;

    const cleanId = order.id.replace(/-/g, "").toUpperCase();
    return `MF-${cleanId.slice(-7)}`;
}

function getStatusKey(status: string | null | undefined) {
    if (!status) return "unknown";

    const normalized = status.toLowerCase();

    if (normalized === "new") return "new";
    if (normalized === "preparing") return "preparing";
    if (normalized === "ready") return "ready";
    if (normalized === "completed") return "completed";
    if (normalized === "cancelled") return "cancelled";

    return "unknown";
}

function getStatusClass(status: OrderStatus) {
    switch (status) {
        case "new":
            return "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]";
        case "preparing":
            return "border-[#FF9F40]/25 bg-[#FF9F40]/15 text-[#B45309]";
        case "ready":
            return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
        case "completed":
            return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
        case "cancelled":
            return "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]";
        default:
            return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
    }
}

function getPaymentClass(status: DbOrder["payment_status"]) {
    switch (status) {
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

export default async function AdminOrdersPage({
                                                  params
                                              }: AdminOrdersPageProps) {
    const { locale } = await params;

    const t = await getTranslations("admin");

    const supabase = await createClient();

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login?next=/${locale}/admin/orders`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!canManageOrders(profile?.role)) {
        redirect(`/${locale}/unauthorized`);
    }

    const { data: orders, error } = await supabase
        .from("orders")
        .select(
            "id, order_number, customer_name, customer_phone, address, delivery_type, comment, items, total_price, status, payment_method, payment_status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100);

    const orderList = ((orders || []) as DbOrder[]) || [];

    const activeOrders = orderList.filter(
        (order) => !["completed", "cancelled"].includes(order.status)
    );

    const todayRevenue = orderList
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.total_price || 0), 0);

    const paidOrders = orderList.filter(
        (order) => order.payment_status === "paid"
    ).length;

    const deliveryOrders = orderList.filter(
        (order) => order.delivery_type === "delivery"
    ).length;

    const cashOrders = orderList.filter(
        (order) => order.payment_method === "cash"
    ).length;

    const cardOrSwishOrders = orderList.filter((order) =>
        ["card", "swish"].includes(order.payment_method)
    ).length;

    return (
        <AdminShell>
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                                <ClipboardList className="h-3.5 w-3.5" />
                                {t("orders.eyebrow")}
                            </div>

                            <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                                {t("orders.title")}
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                                {t("orders.subtitle")}
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                                    {t("orders.total")}
                                </p>
                                <p className="mt-1 text-2xl font-black text-[#25120F]">
                                    {orderList.length}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                                    {t("orders.active")}
                                </p>
                                <p className="mt-1 text-2xl font-black text-[#C7192E]">
                                    {activeOrders.length}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                                    {t("orders.paid")}
                                </p>
                                <p className="mt-1 text-2xl font-black text-emerald-700">
                                    {paidOrders}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                                    {t("orders.revenue")}
                                </p>
                                <p className="mt-1 text-2xl font-black text-[#25120F]">
                                    {formatCurrency(todayRevenue, locale)}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {error ? (
                    <div className="rounded-[1.5rem] border border-[#E51B23]/15 bg-[#E51B23]/8 p-4 text-sm font-bold text-[#C7192E]">
                        {error.message}
                    </div>
                ) : null}

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-black text-[#8A7A70]">
                                    {t("orders.deliveryOrders")}
                                </p>
                                <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                                    {deliveryOrders}
                                </h3>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                                <Truck className="h-5 w-5 text-[#C7192E]" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-black text-[#8A7A70]">
                                    {t("orders.cashOrders")}
                                </p>
                                <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                                    {cashOrders}
                                </h3>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#F6A21A]/25 bg-[#F6A21A]/15">
                                <Banknote className="h-5 w-5 text-[#A96800]" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-black text-[#8A7A70]">
                                    {t("orders.cardSwish")}
                                </p>
                                <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                                    {cardOrSwishOrders}
                                </h3>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                                <CreditCard className="h-5 w-5 text-emerald-700" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-black text-[#8A7A70]">
                                    {t("orders.latestOrder")}
                                </p>
                                <h3 className="mt-3 text-xl font-black tracking-[-0.04em] text-[#25120F]">
                                    {orderList[0] ? formatOrderNumber(orderList[0]) : "—"}
                                </h3>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#EADDCF] bg-[#FFF3E2]">
                                <CalendarClock className="h-5 w-5 text-[#7B6A61]" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                    <div className="flex flex-col gap-3 border-b border-[#EADDCF] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                                {t("orders.allOrders")}
                            </h2>
                            <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                                {t("orders.allOrdersDescription")}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-2 text-sm font-black text-[#7B6A61]">
                            {t("orders.ordersCount", { count: orderList.length })}
                        </div>
                    </div>

                    {orderList.length === 0 ? (
                        <div className="p-5">
                            <div className="rounded-[1.5rem] border border-dashed border-[#EADDCF] bg-white/60 p-8 text-center">
                                <PackageCheck className="mx-auto h-10 w-10 text-[#C7192E]" />
                                <p className="mt-4 text-sm font-black text-[#25120F]">
                                    {t("orders.noOrdersFound")}
                                </p>
                                <p className="mt-2 text-sm font-medium text-[#7B6A61]">
                                    {t("orders.noOrdersDescription")}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1180px] border-separate border-spacing-y-2 px-5 py-3 text-left">
                                <thead>
                                <tr className="text-xs uppercase tracking-[0.16em] text-[#A39388]">
                                    <th className="px-4 py-2 font-black">
                                        {t("table.order")}
                                    </th>
                                    <th className="px-4 py-2 font-black">
                                        {t("table.customer")}
                                    </th>
                                    <th className="px-4 py-2 font-black">
                                        {t("orders.contact")}
                                    </th>
                                    <th className="px-4 py-2 font-black">
                                        {t("orders.type")}
                                    </th>
                                    <th className="px-4 py-2 font-black">
                                        {t("orders.payment")}
                                    </th>
                                    <th className="px-4 py-2 font-black">
                                        {t("table.status")}
                                    </th>
                                    <th className="px-4 py-2 font-black">
                                        {t("table.total")}
                                    </th>
                                    <th className="px-4 py-2 font-black">
                                        {t("orders.created")}
                                    </th>
                                    <th className="px-4 py-2 text-right font-black">
                                        {t("orders.actions")}
                                    </th>
                                </tr>
                                </thead>

                                <tbody>
                                {orderList.map((order) => {
                                    const statusKey = getStatusKey(order.status);

                                    return (
                                        <tr key={order.id} className="group">
                                            <td className="rounded-l-2xl border-y border-l border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                                                <p className="text-sm font-black text-[#C7192E]">
                                                    {formatOrderNumber(order)}
                                                </p>
                                                <p className="mt-1 max-w-[120px] truncate text-xs font-medium text-[#A39388]">
                                                    {order.id}
                                                </p>
                                            </td>

                                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                                                <p className="text-sm font-black text-[#25120F]">
                                                    {order.customer_name}
                                                </p>
                                                <p className="mt-1 max-w-[240px] truncate text-xs font-medium text-[#7B6A61]">
                                                    {t("orders.itemsCount", {
                                                        count: order.items?.length || 0
                                                    })}
                                                </p>
                                            </td>

                                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                                                <div className="flex items-center gap-2 text-sm font-bold text-[#25120F]">
                                                    <Phone className="h-3.5 w-3.5 text-[#C7192E]" />
                                                    {order.customer_phone}
                                                </div>
                                                <p className="mt-1 max-w-[220px] truncate text-xs font-medium text-[#7B6A61]">
                                                    {order.delivery_type === "delivery"
                                                        ? order.address || t("orders.noAddress")
                                                        : t("orders.pickupOrder")}
                                                </p>
                                            </td>

                                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                          <span className="rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                            {t(`orders.deliveryTypes.${order.delivery_type}`)}
                          </span>
                                            </td>

                                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                                                <div className="flex flex-col gap-1">
                            <span className="text-xs font-black uppercase text-[#25120F]">
                              {t(`orders.paymentMethods.${order.payment_method}`)}
                            </span>
                                                    <span
                                                        className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getPaymentClass(
                                                            order.payment_status
                                                        )}`}
                                                    >
                              {t(
                                  `orders.paymentStatuses.${order.payment_status}`
                              )}
                            </span>
                                                </div>
                                            </td>

                                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                          <span
                              className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                  order.status
                              )}`}
                          >
                            {statusKey === "unknown"
                                ? t("orders.unknown")
                                : t(`statuses.${statusKey}`)}
                          </span>
                                            </td>

                                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black text-[#25120F] group-hover:bg-[#FFF3E2]">
                                                {formatCurrency(order.total_price, locale)}
                                            </td>

                                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                                                <p className="text-sm font-bold text-[#25120F]">
                                                    {formatDate(order.created_at, locale)}
                                                </p>
                                            </td>

                                            <td className="rounded-r-2xl border-y border-r border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                                                <OrderStatusActions
                                                    orderId={order.id}
                                                    status={order.status}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </AdminShell>
    );
}
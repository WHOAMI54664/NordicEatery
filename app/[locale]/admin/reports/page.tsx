import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
    Banknote,
    CalendarRange,
    CreditCard,
    FileBarChart2,
    Receipt,
    RotateCcw,
    Smartphone,
    Truck,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { createClient } from "@/lib/supabase/server";
import { canViewAnalytics, type StaffRole } from "@/lib/auth/roles";

type ReportsPageProps = {
    params: Promise<{
        locale: string;
    }>;
    searchParams: Promise<{
        from?: string;
        to?: string;
    }>;
};

type OnlinePaidOrderRow = {
    id: string;
    order_number: string;
    payment_method: string | null;
    payment_status: string | null;
    sale_type: string | null;
    order_channel: string | null;
    paid_at: string | null;
    total_gross: number | string | null;
    total_net: number | string | null;
    total_vat: number | string | null;
    delivery_fee_gross: number | string | null;
    refunded_gross: number | string | null;
    refunded_net: number | string | null;
    refunded_vat: number | string | null;
    refund_status: string | null;
    payment_reference: string | null;
};

function safeAmount(value: number | string | null | undefined) {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: number, locale: string) {
    return new Intl.NumberFormat(locale === "en" ? "en-SE" : locale, {
        style: "currency",
        currency: "SEK",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function formatStockholmDateTime(value: string | null, locale: string) {
    if (!value) return "—";

    return new Intl.DateTimeFormat(locale === "en" ? "en-SE" : locale, {
        timeZone: "Europe/Stockholm",
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getStockholmDateKey(value: string | Date) {
    const date = typeof value === "string" ? new Date(value) : value;

    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function getTodayStockholmKey() {
    return getStockholmDateKey(new Date());
}

function addDaysToDateKey(dateKey: string, days: number) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);

    const nextYear = date.getUTCFullYear();
    const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
    const nextDay = String(date.getUTCDate()).padStart(2, "0");

    return `${nextYear}-${nextMonth}-${nextDay}`;
}

function isValidDateKey(value?: string) {
    return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function shortenReference(reference: string | null) {
    if (!reference) return "—";
    if (reference.length <= 20) return reference;

    return `${reference.slice(0, 10)}…${reference.slice(-8)}`;
}

function getPaymentLabel(method: string | null) {
    if (method === "card") return "Stripe";
    if (method === "swish") return "Swish";
    return method || "—";
}

async function getOnlinePaidOrders(
    supabase: Awaited<ReturnType<typeof createClient>>,
    fromDate: string,
    toDate: string
) {
    /**
     * We fetch with a safety buffer around the selected dates,
     * then filter by the Swedish local business date in JavaScript.
     * This keeps the report correct even when UTC and Stockholm calendar days differ.
     */
    const queryStartUtc = `${addDaysToDateKey(fromDate, -1)}T00:00:00.000Z`;
    const queryEndUtcExclusive = `${addDaysToDateKey(toDate, 2)}T00:00:00.000Z`;

    const { data, error } = await supabase
        .from("orders")
        .select(
            `
      id,
      order_number,
      payment_method,
      payment_status,
      sale_type,
      order_channel,
      paid_at,
      total_gross,
      total_net,
      total_vat,
      delivery_fee_gross,
      refunded_gross,
      refunded_net,
      refunded_vat,
      refund_status,
      payment_reference
      `
        )
        .eq("order_channel", "website")
        .eq("sale_type", "distance_online")
        .eq("payment_status", "paid")
        .not("paid_at", "is", null)
        .gte("paid_at", queryStartUtc)
        .lt("paid_at", queryEndUtcExclusive)
        .order("paid_at", { ascending: false });

    if (error) {
        console.warn("Online sales report query failed:", error.message);
        return [] as OnlinePaidOrderRow[];
    }

    return ((data || []) as OnlinePaidOrderRow[]).filter((order) => {
        if (!order.paid_at) return false;

        const paidDateStockholm = getStockholmDateKey(order.paid_at);

        return paidDateStockholm >= fromDate && paidDateStockholm <= toDate;
    });
}

export default async function OnlineSalesReportsPage({
                                                         params,
                                                         searchParams,
                                                     }: ReportsPageProps) {
    const { locale } = await params;
    const query = await searchParams;

    const t = await getTranslations("admin");

    const today = getTodayStockholmKey();

    const fromDate = isValidDateKey(query.from) ? String(query.from) : today;
    const toDate = isValidDateKey(query.to) ? String(query.to) : today;

    const normalizedFromDate = fromDate <= toDate ? fromDate : toDate;
    const normalizedToDate = fromDate <= toDate ? toDate : fromDate;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login?next=/${locale}/admin/reports`);
    }

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .single();

    const role = (currentProfile?.role || "cook") as StaffRole;

    if (!canViewAnalytics(role)) {
        redirect(`/${locale}/admin`);
    }

    const profileName =
        currentProfile?.full_name?.trim() ||
        currentProfile?.email?.split("@")[0] ||
        user.email?.split("@")[0] ||
        t("sidebar.adminUser");

    const orders = await getOnlinePaidOrders(
        supabase,
        normalizedFromDate,
        normalizedToDate
    );

    const grossSales = orders.reduce(
        (sum, order) => sum + safeAmount(order.total_gross),
        0
    );

    const netSales = orders.reduce(
        (sum, order) => sum + safeAmount(order.total_net),
        0
    );

    const vatTotal = orders.reduce(
        (sum, order) => sum + safeAmount(order.total_vat),
        0
    );

    const stripeSales = orders.reduce((sum, order) => {
        return order.payment_method === "card"
            ? sum + safeAmount(order.total_gross)
            : sum;
    }, 0);

    const swishSales = orders.reduce((sum, order) => {
        return order.payment_method === "swish"
            ? sum + safeAmount(order.total_gross)
            : sum;
    }, 0);

    const deliveryFees = orders.reduce(
        (sum, order) => sum + safeAmount(order.delivery_fee_gross),
        0
    );

    const refundedGross = orders.reduce(
        (sum, order) => sum + safeAmount(order.refunded_gross),
        0
    );

    const refundedNet = orders.reduce(
        (sum, order) => sum + safeAmount(order.refunded_net),
        0
    );

    const refundedVat = orders.reduce(
        (sum, order) => sum + safeAmount(order.refunded_vat),
        0
    );

    const netGrossAfterRefunds = grossSales - refundedGross;
    const netVatAfterRefunds = vatTotal - refundedVat;

    const yesterday = addDaysToDateKey(today, -1);
    const monthStart = `${today.slice(0, 8)}01`;

    return (
        <AdminShell>
            <AdminTopbar displayName={profileName} />

            <section className="mt-6 rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl lg:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#C7192E]">
                            <FileBarChart2 className="h-3.5 w-3.5" />
                            {t("reports.eyebrow")}
                        </div>

                        <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[#25120F] sm:text-4xl">
                            {t("reports.title")}
                        </h1>

                        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#7B6A61]">
                            {t("reports.description")}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="rounded-[1.5rem] border border-[#EADDCF] bg-white/70 px-4 py-3 text-sm font-bold text-[#6F5E55]">
                            <span className="text-[#25120F]">{t("reports.period")}:</span>{" "}
                            {normalizedFromDate} — {normalizedToDate}
                        </div>

                        <Link
                            href={`/api/admin/reports/online-sales/csv?from=${normalizedFromDate}&to=${normalizedToDate}`}
                            className="inline-flex h-[46px] items-center justify-center rounded-[1.5rem] border border-[#E51B23]/15 bg-[#E51B23] px-5 text-sm font-black text-white shadow-lg shadow-[#E51B23]/15 transition hover:bg-[#C7192E]"
                        >
                            {t("reports.exportCsv")}
                        </Link>

                        <Link
                            href={`/api/admin/reports/online-sales/pdf?from=${normalizedFromDate}&to=${normalizedToDate}`}
                            className="inline-flex h-[46px] items-center justify-center rounded-[1.5rem] border border-[#EADDCF] bg-white/80 px-5 text-sm font-black text-[#C7192E] shadow-sm transition hover:border-[#E51B23]/25 hover:bg-[#FFF3E2]"
                        >
                            {t("reports.exportPdf")}
                        </Link>
                    </div>
                </div>

                <form method="GET" className="mt-6 grid gap-3 rounded-[1.5rem] border border-[#EADDCF] bg-white/70 p-4 lg:grid-cols-[1fr_1fr_auto]">
                    <label className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
              {t("reports.from")}
            </span>
                        <input
                            type="date"
                            name="from"
                            defaultValue={normalizedFromDate}
                            className="h-12 rounded-2xl border border-[#EADDCF] bg-[#FFFCF6] px-4 text-sm font-bold text-[#25120F] outline-none transition focus:border-[#E51B23]/40"
                        />
                    </label>

                    <label className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
              {t("reports.to")}
            </span>
                        <input
                            type="date"
                            name="to"
                            defaultValue={normalizedToDate}
                            className="h-12 rounded-2xl border border-[#EADDCF] bg-[#FFFCF6] px-4 text-sm font-bold text-[#25120F] outline-none transition focus:border-[#E51B23]/40"
                        />
                    </label>

                    <button
                        type="submit"
                        className="mt-auto h-12 rounded-2xl bg-[#E51B23] px-5 text-sm font-black text-white shadow-lg shadow-[#E51B23]/15 transition hover:bg-[#C7192E]"
                    >
                        {t("reports.apply")}
                    </button>
                </form>

                <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                        href={`/${locale}/admin/reports?from=${today}&to=${today}`}
                        className="rounded-full border border-[#EADDCF] bg-white/70 px-4 py-2 text-xs font-black text-[#6F5E55] transition hover:border-[#E51B23]/20 hover:text-[#C7192E]"
                    >
                        {t("reports.today")}
                    </Link>

                    <Link
                        href={`/${locale}/admin/reports?from=${yesterday}&to=${yesterday}`}
                        className="rounded-full border border-[#EADDCF] bg-white/70 px-4 py-2 text-xs font-black text-[#6F5E55] transition hover:border-[#E51B23]/20 hover:text-[#C7192E]"
                    >
                        {t("reports.yesterday")}
                    </Link>

                    <Link
                        href={`/${locale}/admin/reports?from=${monthStart}&to=${today}`}
                        className="rounded-full border border-[#EADDCF] bg-white/70 px-4 py-2 text-xs font-black text-[#6F5E55] transition hover:border-[#E51B23]/20 hover:text-[#C7192E]"
                    >
                        {t("reports.thisMonth")}
                    </Link>
                </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminStatCard
                    title={t("reports.grossPaidSales")}
                    value={formatCurrency(grossSales, locale)}
                    description={t("reports.grossPaidSalesDescription")}
                    trend={`${orders.length} ${t("reports.paidOrders")}`}
                    icon={Receipt}
                />

                <AdminStatCard
                    title={t("reports.netSalesExVat")}
                    value={formatCurrency(netSales, locale)}
                    description={t("reports.netSalesExVatDescription")}
                    trend={t("reports.taxBase")}
                    icon={Banknote}
                />

                <AdminStatCard
                    title={t("reports.vatAmount")}
                    value={formatCurrency(vatTotal, locale)}
                    description={t("reports.vatAmountDescription")}
                    trend={t("reports.vatRateSix")}
                    icon={FileBarChart2}
                />

                <AdminStatCard
                    title={t("reports.netAfterRefunds")}
                    value={formatCurrency(netGrossAfterRefunds, locale)}
                    description={t("reports.netAfterRefundsDescription")}
                    trend={`${t("reports.refunds")}: ${formatCurrency(refundedGross, locale)}`}
                    icon={RotateCcw}
                />
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                            <CreditCard className="h-5 w-5 text-[#C7192E]" />
                        </div>

                        <div>
                            <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                                {t("reports.paymentReconciliation")}
                            </h2>
                            <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                                {t("reports.paymentReconciliationDescription")}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                            <div className="flex items-center gap-3">
                                <CreditCard className="h-4 w-4 text-[#C7192E]" />
                                <span className="text-sm font-bold text-[#25120F]">
                  Stripe / Card
                </span>
                            </div>
                            <span className="text-sm font-black text-[#25120F]">
                {formatCurrency(stripeSales, locale)}
              </span>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                            <div className="flex items-center gap-3">
                                <Smartphone className="h-4 w-4 text-[#A96800]" />
                                <span className="text-sm font-bold text-[#25120F]">
                  Swish
                </span>
                            </div>
                            <span className="text-sm font-black text-[#25120F]">
                {formatCurrency(swishSales, locale)}
              </span>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                            <div className="flex items-center gap-3">
                                <Truck className="h-4 w-4 text-emerald-700" />
                                <span className="text-sm font-bold text-[#25120F]">
                  {t("reports.deliveryFees")}
                </span>
                            </div>
                            <span className="text-sm font-black text-[#25120F]">
                {formatCurrency(deliveryFees, locale)}
              </span>
                        </div>
                    </div>
                </div>

                <div className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                            <CalendarRange className="h-5 w-5 text-[#C7192E]" />
                        </div>

                        <div>
                            <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                                {t("reports.vatBreakdown")}
                            </h2>
                            <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                                {t("reports.vatBreakdownDescription")}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
              <span className="text-sm font-bold text-[#25120F]">
                {t("reports.taxBase")}
              </span>
                            <span className="text-sm font-black text-[#25120F]">
                {formatCurrency(netSales, locale)}
              </span>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
              <span className="text-sm font-bold text-[#25120F]">
                {t("reports.vatRateSix")}
              </span>
                            <span className="text-sm font-black text-[#25120F]">
                {formatCurrency(vatTotal, locale)}
              </span>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
              <span className="text-sm font-bold text-[#25120F]">
                {t("reports.refundedVat")}
              </span>
                            <span className="text-sm font-black text-[#25120F]">
                {formatCurrency(refundedVat, locale)}
              </span>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-[#FFF3E2] p-4">
              <span className="text-sm font-black text-[#25120F]">
                {t("reports.vatAfterRefunds")}
              </span>
                            <span className="text-sm font-black text-[#C7192E]">
                {formatCurrency(netVatAfterRefunds, locale)}
              </span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-6 rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                <div className="flex flex-col gap-3 border-b border-[#EADDCF] pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                            {t("reports.includedOrders")}
                        </h2>
                        <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                            {t("reports.includedOrdersDescription")}
                        </p>
                    </div>

                    <div className="rounded-full border border-[#EADDCF] bg-white/70 px-4 py-2 text-xs font-black text-[#6F5E55]">
                        {orders.length} {t("reports.paidOrders")}
                    </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                    {orders.length > 0 ? (
                        <table className="w-full min-w-[1100px] border-separate border-spacing-y-2 text-left">
                            <thead>
                            <tr className="text-xs uppercase tracking-[0.16em] text-[#A39388]">
                                <th className="px-4 py-2 font-black">{t("reports.order")}</th>
                                <th className="px-4 py-2 font-black">{t("reports.paidAt")}</th>
                                <th className="px-4 py-2 font-black">{t("reports.payment")}</th>
                                <th className="px-4 py-2 font-black">{t("reports.gross")}</th>
                                <th className="px-4 py-2 font-black">{t("reports.net")}</th>
                                <th className="px-4 py-2 font-black">{t("reports.vat")}</th>
                                <th className="px-4 py-2 font-black">{t("reports.refundStatus")}</th>
                                <th className="px-4 py-2 font-black">{t("reports.reference")}</th>
                            </tr>
                            </thead>

                            <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} className="group">
                                    <td className="rounded-l-2xl border-y border-l border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black text-[#25120F] group-hover:bg-[#FFF3E2]">
                                        {order.order_number}
                                    </td>

                                    <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-semibold text-[#25120F] group-hover:bg-[#FFF3E2]">
                                        {formatStockholmDateTime(order.paid_at, locale)}
                                    </td>

                                    <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-bold text-[#25120F] group-hover:bg-[#FFF3E2]">
                                        {getPaymentLabel(order.payment_method)}
                                    </td>

                                    <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black text-[#25120F] group-hover:bg-[#FFF3E2]">
                                        {formatCurrency(safeAmount(order.total_gross), locale)}
                                    </td>

                                    <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-semibold text-[#25120F] group-hover:bg-[#FFF3E2]">
                                        {formatCurrency(safeAmount(order.total_net), locale)}
                                    </td>

                                    <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-semibold text-[#C7192E] group-hover:bg-[#FFF3E2]">
                                        {formatCurrency(safeAmount(order.total_vat), locale)}
                                    </td>

                                    <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-bold text-[#25120F] group-hover:bg-[#FFF3E2]">
                                        {order.refund_status || "none"}
                                    </td>

                                    <td className="rounded-r-2xl border-y border-r border-[#EADDCF] bg-white/70 px-4 py-4 font-mono text-xs font-bold text-[#6F5E55] group-hover:bg-[#FFF3E2]">
                                        {shortenReference(order.payment_reference)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="rounded-[1.5rem] border border-dashed border-[#EADDCF] bg-white/60 p-8 text-center">
                            <p className="text-sm font-black text-[#25120F]">
                                {t("reports.noPaidOrders")}
                            </p>
                            <p className="mt-2 text-sm font-medium text-[#7B6A61]">
                                {t("reports.noPaidOrdersDescription")}
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </AdminShell>
    );
}
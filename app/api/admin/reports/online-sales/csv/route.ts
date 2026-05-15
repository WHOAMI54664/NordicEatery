import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canViewAnalytics, type StaffRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OnlinePaidOrderRow = {
    id: string;
    order_number: string;
    payment_method: string | null;
    payment_status: string | null;
    order_channel: string | null;
    sale_type: string | null;
    paid_at: string | null;

    total_gross: number | string | null;
    total_net: number | string | null;
    total_vat: number | string | null;
    vat_rate: number | string | null;

    delivery_fee_gross: number | string | null;
    delivery_fee_net: number | string | null;
    delivery_fee_vat: number | string | null;

    refund_status: string | null;
    refunded_gross: number | string | null;
    refunded_net: number | string | null;
    refunded_vat: number | string | null;

    payment_reference: string | null;
    stripe_payment_intent_id: string | null;
    swish_payment_id: string | null;
    swish_payment_reference: string | null;
    swish_reference: string | null;
};

function isValidDateKey(value: string | null) {
    return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
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

function formatStockholmDateTime(value: string | null) {
    if (!value) return "";

    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(new Date(value));
}

function safeAmount(value: number | string | null | undefined) {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function safeText(value: string | null | undefined) {
    return value || "";
}

function paymentProviderLabel(method: string | null) {
    if (method === "card") return "Stripe";
    if (method === "swish") return "Swish";
    return method || "";
}

function csvEscape(value: string | number | null | undefined) {
    const normalized = String(value ?? "");

    return `"${normalized.replace(/"/g, '""')}"`;
}

function buildCsv(rows: OnlinePaidOrderRow[]) {
    const headers = [
        "Order number",
        "Paid at Stockholm time",
        "Paid at UTC",
        "Payment provider",
        "Payment method",
        "Payment status",
        "Payment reference",

        "Gross total incl. VAT (SEK)",
        "Net total excl. VAT (SEK)",
        "VAT amount (SEK)",
        "VAT rate (%)",

        "Delivery fee gross (SEK)",
        "Delivery fee net (SEK)",
        "Delivery fee VAT (SEK)",

        "Refund status",
        "Refunded gross (SEK)",
        "Refunded net (SEK)",
        "Refunded VAT (SEK)",

        "Gross after refunds (SEK)",
        "Net after refunds (SEK)",
        "VAT after refunds (SEK)",

        "Order channel",
        "Sale type",

        "Stripe payment intent ID",
        "Swish payment ID",
        "Swish payment reference",
        "Swish bank reference",
    ];

    const lines = [
        headers.map(csvEscape).join(";"),
        ...rows.map((order) => {
            const totalGross = Number(order.total_gross ?? 0);
            const totalNet = Number(order.total_net ?? 0);
            const totalVat = Number(order.total_vat ?? 0);

            const refundedGross = Number(order.refunded_gross ?? 0);
            const refundedNet = Number(order.refunded_net ?? 0);
            const refundedVat = Number(order.refunded_vat ?? 0);

            const grossAfterRefunds = totalGross - refundedGross;
            const netAfterRefunds = totalNet - refundedNet;
            const vatAfterRefunds = totalVat - refundedVat;

            const values = [
                safeText(order.order_number),
                formatStockholmDateTime(order.paid_at),
                safeText(order.paid_at),
                paymentProviderLabel(order.payment_method),
                safeText(order.payment_method),
                safeText(order.payment_status),
                safeText(order.payment_reference),

                safeAmount(order.total_gross),
                safeAmount(order.total_net),
                safeAmount(order.total_vat),
                safeAmount(order.vat_rate),

                safeAmount(order.delivery_fee_gross),
                safeAmount(order.delivery_fee_net),
                safeAmount(order.delivery_fee_vat),

                safeText(order.refund_status),
                safeAmount(order.refunded_gross),
                safeAmount(order.refunded_net),
                safeAmount(order.refunded_vat),

                grossAfterRefunds.toFixed(2),
                netAfterRefunds.toFixed(2),
                vatAfterRefunds.toFixed(2),

                safeText(order.order_channel),
                safeText(order.sale_type),

                safeText(order.stripe_payment_intent_id),
                safeText(order.swish_payment_id),
                safeText(order.swish_payment_reference),
                safeText(order.swish_reference),
            ];

            return values.map(csvEscape).join(";");
        }),
    ];

    /**
     * UTF-8 BOM improves opening Swedish/Polish characters correctly in Excel.
     */
    return `\uFEFF${lines.join("\n")}`;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const today = getTodayStockholmKey();

        const fromParam = searchParams.get("from");
        const toParam = searchParams.get("to");

        const fromDate = isValidDateKey(fromParam) ? String(fromParam) : today;
        const toDate = isValidDateKey(toParam) ? String(toParam) : today;

        const normalizedFromDate = fromDate <= toDate ? fromDate : toDate;
        const normalizedToDate = fromDate <= toDate ? toDate : fromDate;

        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: currentProfile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError) {
            console.error("CSV report profile error:", profileError);

            return NextResponse.json(
                { error: "Could not verify access" },
                { status: 500 }
            );
        }

        const role = (currentProfile?.role || "cook") as StaffRole;

        if (!canViewAnalytics(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        /**
         * Fetch with UTC buffer, then filter by Stockholm business date.
         * This keeps the exported date range aligned with the admin report page.
         */
        const queryStartUtc = `${addDaysToDateKey(normalizedFromDate, -1)}T00:00:00.000Z`;
        const queryEndUtcExclusive = `${addDaysToDateKey(normalizedToDate, 2)}T00:00:00.000Z`;

        const { data, error } = await supabase
            .from("orders")
            .select(
                `
        id,
        order_number,
        payment_method,
        payment_status,
        order_channel,
        sale_type,
        paid_at,

        total_gross,
        total_net,
        total_vat,
        vat_rate,

        delivery_fee_gross,
        delivery_fee_net,
        delivery_fee_vat,

        refund_status,
        refunded_gross,
        refunded_net,
        refunded_vat,

        payment_reference,
        stripe_payment_intent_id,
        swish_payment_id,
        swish_payment_reference,
        swish_reference
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
            console.error("Online sales CSV query error:", error);

            return NextResponse.json(
                { error: "Could not generate CSV" },
                { status: 500 }
            );
        }

        const filteredOrders = ((data || []) as OnlinePaidOrderRow[]).filter(
            (order) => {
                if (!order.paid_at) return false;

                const stockholmPaidDate = getStockholmDateKey(order.paid_at);

                return (
                    stockholmPaidDate >= normalizedFromDate &&
                    stockholmPaidDate <= normalizedToDate
                );
            }
        );

        const csv = buildCsv(filteredOrders);

        const filename = `nordic-eatery-online-sales-${normalizedFromDate}-to-${normalizedToDate}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Online sales CSV export error:", error);

        return NextResponse.json(
            { error: "Could not export CSV" },
            { status: 500 }
        );
    }
}
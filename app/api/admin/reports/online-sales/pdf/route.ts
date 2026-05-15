import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
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

    refund_status: string | null;
    refunded_gross: number | string | null;
    refunded_net: number | string | null;
    refunded_vat: number | string | null;

    payment_reference: string | null;
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
    if (!value) return "-";

    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatMoney(value: number) {
    return `${value.toFixed(2)} SEK`;
}

function safeAmount(value: number | string | null | undefined) {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
}

function paymentProviderLabel(method: string | null) {
    if (method === "card") return "Stripe";
    if (method === "swish") return "Swish";
    return method || "-";
}

function shortenReference(reference: string | null) {
    if (!reference) return "-";
    if (reference.length <= 24) return reference;

    return `${reference.slice(0, 12)}...${reference.slice(-8)}`;
}

async function generatePdfBuffer(
    orders: OnlinePaidOrderRow[],
    fromDate: string,
    toDate: string
) {
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
    const netNetAfterRefunds = netSales - refundedNet;
    const netVatAfterRefunds = vatTotal - refundedVat;

    return new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            margin: 42,
            info: {
                Title: `Nordic Eatery Online Sales Report ${fromDate} - ${toDate}`,
                Author: "Nordic Eatery",
                Subject: "Online paid sales report",
            },
        });

        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        function sectionTitle(title: string) {
            doc
                .moveDown(1)
                .fontSize(13)
                .font("Helvetica-Bold")
                .fillColor("#25120F")
                .text(title);

            doc
                .moveDown(0.35)
                .strokeColor("#D8C7B8")
                .lineWidth(1)
                .moveTo(doc.x, doc.y)
                .lineTo(doc.x + pageWidth, doc.y)
                .stroke();

            doc.moveDown(0.7);
        }

        function summaryRow(label: string, value: string) {
            const y = doc.y;

            doc
                .fontSize(10)
                .font("Helvetica")
                .fillColor("#5F514A")
                .text(label, doc.x, y, {
                    width: 260,
                });

            doc
                .font("Helvetica-Bold")
                .fillColor("#25120F")
                .text(value, doc.x + 280, y, {
                    width: pageWidth - 280,
                    align: "right",
                });

            doc.moveDown(0.55);
        }

        function ensureTableSpace(requiredHeight: number) {
            const bottom = doc.page.height - doc.page.margins.bottom;

            if (doc.y + requiredHeight > bottom) {
                doc.addPage();
            }
        }

        function drawOrdersHeader() {
            const startX = doc.x;
            const y = doc.y;
            const rowHeight = 22;

            doc.rect(startX, y, pageWidth, rowHeight).fill("#F4E7D8");

            const columns = [
                { label: "Order", x: startX + 6, width: 92 },
                { label: "Paid at", x: startX + 100, width: 92 },
                { label: "Method", x: startX + 194, width: 58 },
                { label: "Gross", x: startX + 254, width: 64 },
                { label: "VAT", x: startX + 320, width: 58 },
                { label: "Reference", x: startX + 380, width: pageWidth - 386 },
            ];

            doc.fontSize(8).font("Helvetica-Bold").fillColor("#25120F");

            for (const column of columns) {
                doc.text(column.label, column.x, y + 7, {
                    width: column.width,
                });
            }

            doc.moveDown(1.55);
        }

        function drawOrderRow(order: OnlinePaidOrderRow, index: number) {
            ensureTableSpace(28);

            const startX = doc.x;
            const y = doc.y;
            const rowHeight = 28;

            doc
                .rect(startX, y, pageWidth, rowHeight)
                .fill(index % 2 === 0 ? "#FFF9F2" : "#FFFFFF");

            doc.fontSize(7.6).font("Helvetica").fillColor("#25120F");

            doc.text(order.order_number, startX + 6, y + 8, { width: 92 });
            doc.text(formatStockholmDateTime(order.paid_at), startX + 100, y + 8, {
                width: 92,
            });
            doc.text(paymentProviderLabel(order.payment_method), startX + 194, y + 8, {
                width: 58,
            });
            doc.text(formatMoney(safeAmount(order.total_gross)), startX + 254, y + 8, {
                width: 64,
            });
            doc.text(formatMoney(safeAmount(order.total_vat)), startX + 320, y + 8, {
                width: 58,
            });
            doc.text(shortenReference(order.payment_reference), startX + 380, y + 8, {
                width: pageWidth - 386,
            });

            doc.moveDown(1.95);
        }

        doc
            .font("Helvetica-Bold")
            .fontSize(22)
            .fillColor("#25120F")
            .text("Nordic Eatery", { align: "left" });

        doc
            .fontSize(17)
            .fillColor("#C7192E")
            .text("Online Sales Report", { align: "left" });

        doc
            .moveDown(0.4)
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#5F514A")
            .text(
                "Paid website orders completed remotely. This report excludes unpaid, cancelled and on-site payment orders."
            );

        doc.moveDown(0.8);

        summaryRow("Reporting period", `${fromDate} - ${toDate}`);
        summaryRow("Generated at", formatStockholmDateTime(new Date().toISOString()));
        summaryRow("Time zone", "Europe/Stockholm");
        summaryRow("Included paid online orders", String(orders.length));

        sectionTitle("Sales summary");

        summaryRow("Gross paid sales incl. VAT", formatMoney(grossSales));
        summaryRow("Sales excl. VAT", formatMoney(netSales));
        summaryRow("VAT amount", formatMoney(vatTotal));
        summaryRow("VAT rate", "6.00%");
        summaryRow("Delivery fees incl. VAT", formatMoney(deliveryFees));

        sectionTitle("Payment reconciliation");

        summaryRow("Stripe / card payments", formatMoney(stripeSales));
        summaryRow("Swish payments", formatMoney(swishSales));

        sectionTitle("Refund summary");

        summaryRow("Refunded gross amount", formatMoney(refundedGross));
        summaryRow("Refunded net amount", formatMoney(refundedNet));
        summaryRow("Refunded VAT", formatMoney(refundedVat));
        summaryRow("Gross after refunds", formatMoney(netGrossAfterRefunds));
        summaryRow("Net after refunds", formatMoney(netNetAfterRefunds));
        summaryRow("VAT after refunds", formatMoney(netVatAfterRefunds));

        sectionTitle("Included paid online orders");

        if (orders.length === 0) {
            doc
                .font("Helvetica")
                .fontSize(10)
                .fillColor("#5F514A")
                .text("No paid online orders were found for the selected period.");
        } else {
            drawOrdersHeader();

            orders.forEach((order, index) => {
                if (doc.y > doc.page.height - 85) {
                    doc.addPage();
                    drawOrdersHeader();
                }

                drawOrderRow(order, index);
            });
        }

        doc
            .moveDown(1.2)
            .font("Helvetica")
            .fontSize(8)
            .fillColor("#7B6A61")
            .text(
                "Generated from Nordic Eatery website order records. Each included order is linked to its stored payment reference."
            );

        doc.end();
    });
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
            console.error("PDF report profile error:", profileError);

            return NextResponse.json(
                { error: "Could not verify access" },
                { status: 500 }
            );
        }

        const role = (currentProfile?.role || "cook") as StaffRole;

        if (!canViewAnalytics(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

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

        refund_status,
        refunded_gross,
        refunded_net,
        refunded_vat,

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
            console.error("Online sales PDF query error:", error);

            return NextResponse.json(
                { error: "Could not generate PDF" },
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

        const pdfBuffer = await generatePdfBuffer(
            filteredOrders,
            normalizedFromDate,
            normalizedToDate
        );

        const filename = `nordic-eatery-online-sales-${normalizedFromDate}-to-${normalizedToDate}.pdf`;

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Online sales PDF export error:", error);

        return NextResponse.json(
            { error: "Could not export PDF" },
            { status: 500 }
        );
    }
}
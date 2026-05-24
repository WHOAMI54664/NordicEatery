import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{
        orderNumber: string;
    }>;
};

type OrderItem = {
    name?: string;
    quantity?: number;
    price?: number;
    vat_rate?: number;
    line_total_gross?: number;
    line_total_net?: number;
    line_total_vat?: number;
};

type OrderRow = {
    id: string;
    order_number: string | null;
    display_order_number: string | null;
    order_date: string | null;

    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;

    payment_method: string | null;
    payment_status: string | null;
    payment_reference: string | null;
    stripe_session_id: string | null;
    stripe_payment_intent_id: string | null;
    swish_payment_id: string | null;
    swish_payment_reference: string | null;

    total_gross: number | null;
    total_net: number | null;
    total_vat: number | null;

    subtotal_gross: number | null;
    subtotal_net: number | null;
    subtotal_vat: number | null;

    delivery_fee_gross: number | null;
    delivery_fee_net: number | null;
    delivery_fee_vat: number | null;

    vat_rate: number | null;
    items: OrderItem[] | null;

    created_at: string | null;
    paid_at: string | null;
};

const receiptConfig = {
    companyName: process.env.RECEIPT_COMPANY_NAME || "Nordic Eatery",
    legalName: process.env.RECEIPT_LEGAL_NAME || "Nordic Eatery",
    orgNumber: process.env.RECEIPT_ORG_NUMBER || "",
    vatNumber: process.env.RECEIPT_VAT_NUMBER || "",
    address: process.env.RECEIPT_ADDRESS || "Unbyn 7, 961 93 Boden, Sweden",
    email: process.env.RECEIPT_EMAIL || "kontakt@nordiceatery.se",
    phone: process.env.RECEIPT_PHONE || "+46734218925",
    website: process.env.RECEIPT_WEBSITE || "www.nordiceatery.se",
};

function money(value: number | null | undefined) {
    return `${Number(value || 0).toFixed(2)} SEK`;
}

function formatDate(value: string | null) {
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

function paymentLabel(method: string | null) {
    if (method === "card") return "Card";
    if (method === "swish") return "Swish";
    if (method === "cash") return "Cash";

    return method || "-";
}

function getPaymentReference(order: OrderRow) {
    return (
        order.payment_reference ||
        order.stripe_payment_intent_id ||
        order.stripe_session_id ||
        order.swish_payment_reference ||
        order.swish_payment_id ||
        "-"
    );
}

function drawKeyValue(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
    width = 240
) {
    doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#555")
        .text(label, x, y, {
            width,
        });

    doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#111")
        .text(value || "-", x, y + 13, {
            width,
        });
}

function generatePdf(order: OrderRow) {
    return new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            margin: 42,
        });

        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const visibleOrderNumber =
            order.display_order_number || order.order_number || order.id;

        const receiptNumber = `${order.order_date || ""}-${visibleOrderNumber}`;

        // Header left
        doc
            .font("Helvetica-Bold")
            .fontSize(24)
            .fillColor("#111")
            .text(receiptConfig.companyName, 42, 42);

        doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#555")
            .text(receiptConfig.legalName, 42, 73)
            .text(receiptConfig.address)
            .text(`Org.nr: ${receiptConfig.orgNumber || "-"}`)
            .text(`VAT: ${receiptConfig.vatNumber || "-"}`)
            .text(`${receiptConfig.email} | ${receiptConfig.phone}`)
            .text(receiptConfig.website);

        // Header right
        doc
            .font("Helvetica-Bold")
            .fontSize(16)
            .fillColor("#111")
            .text("Receipt / Payment", 330, 42, {
                width: 220,
                align: "right",
            });

        doc
            .font("Helvetica-Bold")
            .fontSize(16)
            .fillColor("#111")
            .text("confirmation", 330, 62, {
                width: 220,
                align: "right",
            });

        doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#555")
            .text(`Receipt no: ${receiptNumber}`, 330, 92, {
                width: 220,
                align: "right",
            })
            .text(`Order no: #${visibleOrderNumber}`, 330, 108, {
                width: 220,
                align: "right",
            })
            .text(`Date: ${formatDate(order.paid_at || order.created_at)}`, 330, 124, {
                width: 220,
                align: "right",
            });

        doc.moveTo(42, 160).lineTo(553, 160).strokeColor("#ddd").stroke();

        // Order/payment details
        drawKeyValue(doc, "Customer", order.customer_name || "-", 42, 180);
        drawKeyValue(doc, "Phone", order.customer_phone || "-", 302, 180);
        drawKeyValue(doc, "Email", order.customer_email || "-", 42, 225);
        drawKeyValue(
            doc,
            "Payment method",
            paymentLabel(order.payment_method),
            302,
            225
        );
        drawKeyValue(doc, "Payment status", order.payment_status || "-", 42, 270);
        drawKeyValue(doc, "Payment reference", getPaymentReference(order), 302, 270);

        doc.moveTo(42, 330).lineTo(553, 330).strokeColor("#ddd").stroke();

        // Items table
        let y = 353;

        doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#111")
            .text("Qty", 42, y)
            .text("Product", 82, y)
            .text("VAT", 300, y, { width: 50, align: "right" })
            .text("Unit", 360, y, { width: 80, align: "right" })
            .text("Total", 460, y, { width: 90, align: "right" });

        y += 20;

        doc.moveTo(42, y).lineTo(553, y).strokeColor("#ddd").stroke();
        y += 13;

        const items = Array.isArray(order.items) ? order.items : [];

        if (items.length === 0) {
            doc
                .font("Helvetica")
                .fontSize(10)
                .fillColor("#333")
                .text("No items found.", 42, y);

            y += 24;
        } else {
            items.forEach((item) => {
                const quantity = Number(item.quantity || 1);
                const unitPrice = Number(item.price || 0);
                const vatRate = Number(item.vat_rate || order.vat_rate || 6);

                const total =
                    typeof item.line_total_gross === "number"
                        ? item.line_total_gross
                        : unitPrice * quantity;

                doc
                    .font("Helvetica")
                    .fontSize(10)
                    .fillColor("#111")
                    .text(String(quantity), 42, y)
                    .text(item.name || "Item", 82, y, { width: 200 })
                    .text(`${vatRate}%`, 300, y, { width: 50, align: "right" })
                    .text(money(unitPrice), 360, y, { width: 80, align: "right" })
                    .text(money(total), 460, y, { width: 90, align: "right" });

                y += 22;
            });
        }

        y += 8;
        doc.moveTo(42, y).lineTo(553, y).strokeColor("#ddd").stroke();
        y += 22;

        // VAT / totals
        const summaryX = 330;
        const valueX = 460;

        doc.font("Helvetica").fontSize(10).fillColor("#111");

        doc.text("Subtotal excl. VAT", summaryX, y, { width: 120 });
        doc.text(money(order.subtotal_net), valueX, y, {
            width: 90,
            align: "right",
        });
        y += 18;

        doc.text("Delivery excl. VAT", summaryX, y, { width: 120 });
        doc.text(money(order.delivery_fee_net), valueX, y, {
            width: 90,
            align: "right",
        });
        y += 18;

        doc.text(`VAT ${order.vat_rate || 6}%`, summaryX, y, { width: 120 });
        doc.text(money(order.total_vat), valueX, y, {
            width: 90,
            align: "right",
        });
        y += 18;

        doc.moveTo(summaryX, y).lineTo(553, y).strokeColor("#ddd").stroke();
        y += 16;

        doc.font("Helvetica-Bold").fontSize(13);
        doc.text("Total incl. VAT", summaryX, y, { width: 120 });
        doc.text(money(order.total_gross), valueX, y, {
            width: 90,
            align: "right",
        });
        y += 25;

        doc.font("Helvetica-Bold").fontSize(15);
        doc.text("Total paid", summaryX, y, { width: 120 });
        doc.text(money(order.total_gross), valueX, y, {
            width: 90,
            align: "right",
        });

        // VAT breakdown
        y += 55;

        doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#111")
            .text("VAT summary", 42, y);

        y += 20;

        doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .text("VAT rate", 42, y)
            .text("Net amount", 160, y, { width: 100, align: "right" })
            .text("VAT amount", 285, y, { width: 100, align: "right" })
            .text("Gross amount", 410, y, { width: 120, align: "right" });

        y += 18;
        doc.moveTo(42, y).lineTo(553, y).strokeColor("#ddd").stroke();
        y += 12;

        doc
            .font("Helvetica")
            .fontSize(10)
            .text(`${order.vat_rate || 6}%`, 42, y)
            .text(money(order.total_net), 160, y, {
                width: 100,
                align: "right",
            })
            .text(money(order.total_vat), 285, y, {
                width: 100,
                align: "right",
            })
            .text(money(order.total_gross), 410, y, {
                width: 120,
                align: "right",
            });

        // Footer
        doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor("#666")
            .text(
                "This document confirms an online payment and order details for a distance order. It is generated electronically.",
                42,
                760,
                { width: 511, align: "center" }
            );

        doc.end();
    });
}

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { orderNumber } = await context.params;

        if (!orderNumber) {
            return NextResponse.json(
                { error: "Order number is required" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { data: order, error } = await supabase
            .from("orders")
            .select(
                `
        id,
        order_number,
        display_order_number,
        order_date,
        customer_name,
        customer_phone,
        customer_email,
        payment_method,
        payment_status,
        payment_reference,
        stripe_session_id,
        stripe_payment_intent_id,
        swish_payment_id,
        swish_payment_reference,
        total_gross,
        total_net,
        total_vat,
        subtotal_gross,
        subtotal_net,
        subtotal_vat,
        delivery_fee_gross,
        delivery_fee_net,
        delivery_fee_vat,
        vat_rate,
        items,
        created_at,
        paid_at
      `
            )
            .eq("order_number", orderNumber)
            .maybeSingle<OrderRow>();

        if (error) {
            console.error("Receipt order fetch error:", error);

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const pdfBuffer = await generatePdf(order);

        const visibleOrderNumber =
            order.display_order_number || order.order_number || order.id;

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="nordic-eatery-receipt-${visibleOrderNumber}.pdf"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Receipt PDF error:", error);

        return NextResponse.json(
            { error: "Could not generate receipt" },
            { status: 500 }
        );
    }
}
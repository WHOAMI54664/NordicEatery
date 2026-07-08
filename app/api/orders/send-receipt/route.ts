import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendReceiptBody = {
    orderNumber?: string;
    email?: string;
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
    total_gross: number | null;
    total_price: number | null;
    created_at: string | null;
    paid_at: string | null;
};

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getOrigin(request: Request) {
    const url = new URL(request.url);

    const forwardedProto = request.headers.get("x-forwarded-proto");
    const forwardedHost = request.headers.get("x-forwarded-host");

    if (forwardedProto && forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`;
    }

    return url.origin;
}

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

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
    try {
        // Max 5 receipt emails per IP per 10 minutes.
        const limit = rateLimit("send-receipt", request, 5, 10 * 60 * 1000);

        if (!limit.ok) {
            return rateLimitResponse(limit.retryAfter);
        }

        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
            return NextResponse.json(
                { error: "RESEND_API_KEY is missing" },
                { status: 500 }
            );
        }

        const fromEmail =
            process.env.RECEIPT_FROM_EMAIL ||
            process.env.RESEND_FROM_EMAIL ||
            "Nordic Eatery <onboarding@resend.dev>";

        const body = (await request.json()) as SendReceiptBody;

        const orderNumber = body.orderNumber?.trim();
        const email = body.email?.trim().toLowerCase();

        if (!orderNumber) {
            return NextResponse.json(
                { error: "Order number is required" },
                { status: 400 }
            );
        }

        if (!email || !isValidEmail(email)) {
            return NextResponse.json(
                { error: "Valid email is required" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { data: updatedOrder, error: updateError } = await supabase
            .from("orders")
            .update({
                customer_email: email,
                updated_at: new Date().toISOString(),
            })
            .eq("order_number", orderNumber)
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
        total_gross,
        total_price,
        created_at,
        paid_at
      `
            )
            .maybeSingle<OrderRow>();

        if (updateError) {
            console.error("Receipt email order update error:", updateError);

            return NextResponse.json(
                { error: updateError.message },
                { status: 500 }
            );
        }

        if (!updatedOrder) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (updatedOrder.payment_status !== "paid") {
            return NextResponse.json(
                { error: "Receipt can only be sent for paid orders" },
                { status: 400 }
            );
        }

        const origin = getOrigin(request);

        const receiptUrl = `${origin}/api/orders/${encodeURIComponent(
            orderNumber
        )}/receipt`;

        const receiptResponse = await fetch(receiptUrl, {
            method: "GET",
            cache: "no-store",
        });

        if (!receiptResponse.ok) {
            const errorText = await receiptResponse.text();

            console.error("Receipt PDF fetch error:", {
                status: receiptResponse.status,
                errorText,
            });

            return NextResponse.json(
                { error: "Could not generate receipt PDF" },
                { status: 500 }
            );
        }

        const pdfArrayBuffer = await receiptResponse.arrayBuffer();
        const pdfBuffer = Buffer.from(pdfArrayBuffer);

        const visibleOrderNumber =
            updatedOrder.display_order_number ||
            updatedOrder.order_number ||
            updatedOrder.id;

        const totalAmount = Number(
            updatedOrder.total_gross ?? updatedOrder.total_price ?? 0
        );

        const receiptFileName = `nordic-eatery-receipt-${visibleOrderNumber}.pdf`;

        const resend = new Resend(resendApiKey);

        const html = `
      <div style="font-family: Arial, sans-serif; color: #24140F; line-height: 1.6;">
        <h1 style="margin: 0 0 16px; color: #24140F;">Nordic Eatery</h1>

        <p>Hello ${escapeHtml(updatedOrder.customer_name || "")},</p>

        <p>
          Thank you for your order. Your payment has been confirmed.
          Your receipt is attached as a PDF.
        </p>

        <div style="background: #FFF7EA; border: 1px solid #eadfce; border-radius: 16px; padding: 18px; margin: 22px 0;">
          <p style="margin: 0 0 8px;"><strong>Order:</strong> #${escapeHtml(
            String(visibleOrderNumber)
        )}</p>
          <p style="margin: 0 0 8px;"><strong>Amount paid:</strong> ${escapeHtml(
            money(totalAmount)
        )}</p>
          <p style="margin: 0 0 8px;"><strong>Payment method:</strong> ${escapeHtml(
            paymentLabel(updatedOrder.payment_method)
        )}</p>
          <p style="margin: 0;"><strong>Date:</strong> ${escapeHtml(
            formatDate(updatedOrder.paid_at || updatedOrder.created_at)
        )}</p>
        </div>

        <p>
          Best regards,<br />
          Nordic Eatery
        </p>
      </div>
    `;

        const text = [
            "Nordic Eatery",
            "",
            `Hello ${updatedOrder.customer_name || ""},`,
            "",
            "Thank you for your order. Your payment has been confirmed.",
            "Your receipt is attached as a PDF.",
            "",
            `Order: #${visibleOrderNumber}`,
            `Amount paid: ${money(totalAmount)}`,
            `Payment method: ${paymentLabel(updatedOrder.payment_method)}`,
            `Date: ${formatDate(updatedOrder.paid_at || updatedOrder.created_at)}`,
            "",
            "Best regards,",
            "Nordic Eatery",
        ].join("\n");

        const { data: emailData, error: emailError } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: `Your Nordic Eatery receipt #${visibleOrderNumber}`,
            html,
            text,
            attachments: [
                {
                    filename: receiptFileName,
                    content: pdfBuffer,
                },
            ],
        });

        if (emailError) {
            console.error("Resend receipt email error:", emailError);

            return NextResponse.json(
                { error: emailError.message || "Could not send receipt email" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Receipt has been sent to your email.",
            emailId: emailData?.id || null,
            orderNumber,
            displayOrderNumber: updatedOrder.display_order_number,
            email,
        });
    } catch (error) {
        console.error("Send receipt error:", error);

        return NextResponse.json(
            { error: "Could not send receipt" },
            { status: 500 }
        );
    }
}
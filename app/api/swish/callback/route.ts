import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyLoyaltyForPaidOrder } from "@/lib/customers/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SwishCallbackPayload = {
    id?: string;
    payeePaymentReference?: string;
    paymentReference?: string;
    status?: string;
    [key: string]: unknown;
};

type BackendResponsePayload = {
    orderId?: string;
    orderNumber?: string;
    swishPaymentId?: string;
    swishPaymentReference?: string;
    paymentReference?: string;
    status?: string;
    paymentStatus?: string;
    [key: string]: unknown;
};

type OrderForLoyalty = {
    id: string;
    order_number: string | null;

    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    loyalty_opt_in: boolean | null;

    payment_method: string | null;
    payment_status: string | null;

    total_price: number | string | null;
    total_gross: number | string | null;
    paid_at: string | null;

    swish_payment_id: string | null;
    swish_payment_reference: string | null;
    payment_reference: string | null;
};

function safeJsonParse<T>(value: string): T | null {
    try {
        return value ? (JSON.parse(value) as T) : null;
    } catch {
        return null;
    }
}

function getCandidateValues(
    callbackPayload: SwishCallbackPayload | null,
    backendPayload: BackendResponsePayload | null
) {
    const values = [
        backendPayload?.orderId,
        backendPayload?.orderNumber,
        backendPayload?.swishPaymentId,
        backendPayload?.swishPaymentReference,
        backendPayload?.paymentReference,

        callbackPayload?.payeePaymentReference,
        callbackPayload?.paymentReference,
        callbackPayload?.id,
    ]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean);

    return Array.from(new Set(values));
}

async function findPaidSwishOrder(params: {
    callbackPayload: SwishCallbackPayload | null;
    backendPayload: BackendResponsePayload | null;
}) {
    const supabase = createAdminClient();

    const candidates = getCandidateValues(
        params.callbackPayload,
        params.backendPayload
    );

    if (candidates.length === 0) {
        return null;
    }

    const selectQuery = `
    id,
    order_number,
    customer_name,
    customer_phone,
    customer_email,
    loyalty_opt_in,
    payment_method,
    payment_status,
    total_price,
    total_gross,
    paid_at,
    swish_payment_id,
    swish_payment_reference,
    payment_reference
  `;

    /**
     * Try exact order number first.
     * In many Swish flows payeePaymentReference is our order_number.
     */
    for (const candidate of candidates) {
        const { data, error } = await supabase
            .from("orders")
            .select(selectQuery)
            .eq("order_number", candidate)
            .maybeSingle<OrderForLoyalty>();

        if (error) {
            console.error("Find Swish order by order_number error:", error);
        }

        if (data?.payment_status === "paid") {
            return data;
        }
    }

    /**
     * Then try Swish/payment references.
     */
    for (const candidate of candidates) {
        const { data, error } = await supabase
            .from("orders")
            .select(selectQuery)
            .or(
                [
                    `swish_payment_id.eq.${candidate}`,
                    `swish_payment_reference.eq.${candidate}`,
                    `payment_reference.eq.${candidate}`,
                ].join(",")
            )
            .maybeSingle<OrderForLoyalty>();

        if (error) {
            console.error("Find Swish order by payment reference error:", error);
        }

        if (data?.payment_status === "paid") {
            return data;
        }
    }

    return null;
}

export async function POST(request: Request) {
    try {
        const backendUrl = process.env.SWISH_BACKEND_URL;
        const internalSecret = process.env.SWISH_INTERNAL_SECRET;

        if (!backendUrl) {
            return NextResponse.json(
                { error: "SWISH_BACKEND_URL is missing" },
                { status: 500 }
            );
        }

        if (!internalSecret) {
            return NextResponse.json(
                { error: "SWISH_INTERNAL_SECRET is missing" },
                { status: 500 }
            );
        }

        const body = await request.text();
        const callbackPayload = safeJsonParse<SwishCallbackPayload>(body);

        const response = await fetch(`${backendUrl}/swish/callback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": internalSecret,
            },
            body,
            cache: "no-store",
        });

        const text = await response.text();
        const backendPayload = safeJsonParse<BackendResponsePayload>(text);

        if (!response.ok) {
            console.error("Swish callback backend error:", text);

            return NextResponse.json(
                {
                    error: "Swish callback forwarding failed",
                    details: text,
                },
                { status: response.status }
            );
        }

        let loyalty: Awaited<ReturnType<typeof applyLoyaltyForPaidOrder>> | null =
            null;
        try {
            const paidOrder = await findPaidSwishOrder({
                callbackPayload,
                backendPayload,
            });

            if (paidOrder && paidOrder.payment_status === "paid") {
                loyalty = await applyLoyaltyForPaidOrder({
                    id: paidOrder.id,
                    customer_name: paidOrder.customer_name,
                    customer_phone: paidOrder.customer_phone,
                    customer_email: paidOrder.customer_email,
                    loyalty_opt_in: paidOrder.loyalty_opt_in,
                    total_gross: paidOrder.total_gross,
                    total_price: paidOrder.total_price,
                    payment_status: paidOrder.payment_status,
                    paid_at: paidOrder.paid_at,
                });
            } else {
                console.warn("Swish loyalty skipped: paid order not found", {
                    callbackPayload,
                    backendPayload,
                });
            }
        } catch (loyaltyError) {
            console.error("Swish loyalty apply error:", loyaltyError);
        }

        return NextResponse.json({
            received: true,
            loyalty,
        });
    } catch (error) {
        console.error("Swish callback proxy error:", error);

        const message =
            error instanceof Error ? error.message : "Swish callback failed";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { assertRestaurantShiftIsOpen } from "@/lib/restaurant/shift";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOrderDate() {
    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function extractOrderNumber(data: unknown) {
    if (typeof data !== "object" || data === null) return null;

    const value = (data as Record<string, unknown>).orderNumber;

    return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Swish orders are created by the external Swish backend, which does not assign
 * a sequential daily number. To keep numbering continuous across card, Swish and
 * cash, we assign one here (same RPC as the other payment methods) once the order
 * exists. Non-fatal: a numbering hiccup must never block the payment.
 */
async function assignDailyOrderNumber(data: unknown) {
    const orderNumber = extractOrderNumber(data);

    if (!orderNumber) return data;

    try {
        const admin = createAdminClient();

        const { data: displayOrderNumber, error } = await admin.rpc(
            "generate_daily_order_number"
        );

        if (error || !displayOrderNumber) {
            console.error("Swish order numbering error:", error);
            return data;
        }

        await admin
            .from("orders")
            .update({
                display_order_number: displayOrderNumber,
                order_date: getOrderDate(),
                updated_at: new Date().toISOString(),
            })
            .eq("order_number", orderNumber)
            .is("display_order_number", null);

        return {
            ...(data as Record<string, unknown>),
            displayOrderNumber,
        };
    } catch (numberingError) {
        console.error("Swish order numbering exception:", numberingError);
        return data;
    }
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

        /**
         * Stop Swish orders before they reach the Swish backend
         * if the restaurant shift is closed.
         */
        const shiftCheck = await assertRestaurantShiftIsOpen();

        if (!shiftCheck.ok) {
            return NextResponse.json(
                { error: shiftCheck.error },
                { status: 403 }
            );
        }

        const body = await request.json();

        const response = await fetch(`${backendUrl}/swish/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": internalSecret,
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const text = await response.text();

        let data: unknown;

        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { error: text || "Invalid backend response" };
        }

        if (!response.ok) {
            return NextResponse.json(
                {
                    error:
                        typeof data === "object" &&
                        data !== null &&
                        "error" in data
                            ? String(data.error)
                            : "Swish payment failed",
                    details: data,
                },
                { status: response.status }
            );
        }

        const dataWithNumber = await assignDailyOrderNumber(data);

        return NextResponse.json(dataWithNumber);
    } catch (error) {
        console.error("Swish proxy error:", error);

        const message =
            error instanceof Error ? error.message : "Could not start Swish payment";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
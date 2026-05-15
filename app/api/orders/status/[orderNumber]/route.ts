import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    _request: Request,
    {
        params,
    }: {
        params: Promise<{ orderNumber: string }>;
    }
) {
    try {
        const { orderNumber } = await params;

        if (!orderNumber?.trim()) {
            return NextResponse.json(
                { error: "Order number is required" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("orders")
            .select(
                `
        id,
        order_number,
        status,
        payment_status,
        payment_method,
        total_price
        `
            )
            .eq("order_number", orderNumber)
            .maybeSingle();

        if (error) {
            console.error("Public order status fetch error:", error);

            return NextResponse.json(
                { error: "Could not fetch order" },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: "Order not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ order: data });
    } catch (error) {
        console.error("Order status API error:", error);

        return NextResponse.json(
            { error: "Could not fetch order status" },
            { status: 500 }
        );
    }
}
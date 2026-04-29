import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const supabase = createAdminClient();
        const body = await request.json();

        const {
            orderId,
            customerName,
            customerPhone,
            address,
            deliveryType,
            comment,
            items,
            totalPrice,
            paymentMethod,
        } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }

        if (paymentMethod !== "cash" && paymentMethod !== "swish") {
            return NextResponse.json(
                { error: "Invalid payment method" },
                { status: 400 }
            );
        }

        const { error } = await supabase.from("orders").insert({
            id: orderId,
            customer_name: customerName,
            customer_phone: customerPhone,
            address,
            delivery_type: deliveryType,
            comment: comment || null,
            items,
            total_price: totalPrice,
            status: "new",
            payment_method: paymentMethod,
            payment_status:
                paymentMethod === "cash" ? "unpaid" : "awaiting_payment",
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, orderId });
    } catch (error) {
        console.error("Create order error:", error);

        return NextResponse.json(
            { error: "Could not create order" },
            { status: 500 }
        );
    }
}
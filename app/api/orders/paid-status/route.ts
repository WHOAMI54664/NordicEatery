import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyLoyaltyForPaidOrder } from "@/lib/customers/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderRow = {
    id: string;
    order_number: string | null;
    display_order_number: string | null;
    order_date: string | null;

    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    loyalty_opt_in: boolean | null;

    payment_method: string | null;
    payment_status: string | null;

    total_price: number | null;
    total_gross: number | null;
    total_net: number | null;
    total_vat: number | null;

    created_at: string | null;
    paid_at: string | null;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const orderNumber = searchParams.get("order_number");

        if (!orderNumber) {
            return NextResponse.json(
                { error: "Missing order_number" },
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
        loyalty_opt_in,
        payment_method,
        payment_status,
        total_price,
        total_gross,
        total_net,
        total_vat,
        created_at,
        paid_at
      `
            )
            .eq("order_number", orderNumber)
            .maybeSingle<OrderRow>();

        if (error) {
            console.error("Paid status order fetch error:", error);

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const isPaid = order.payment_status === "paid";

        let loyalty: Awaited<ReturnType<typeof applyLoyaltyForPaidOrder>> | null =
            null;

        /**
         * Extra safety:
         * If Swish callback already made order paid but loyalty was not applied,
         * this endpoint can apply it once.
         *
         * applyLoyaltyForPaidOrder protects from duplicates and now also checks
         * loyalty_opt_in.
         */
        if (isPaid) {
            try {
                loyalty = await applyLoyaltyForPaidOrder({
                    id: order.id,
                    customer_name: order.customer_name,
                    customer_phone: order.customer_phone,
                    customer_email: order.customer_email,
                    loyalty_opt_in: order.loyalty_opt_in,
                    total_gross: order.total_gross,
                    total_price: order.total_price,
                    payment_status: order.payment_status,
                    paid_at: order.paid_at,
                });
            } catch (loyaltyError) {
                console.error("Paid status loyalty apply error:", loyaltyError);
            }
        }

        return NextResponse.json({
            success: true,
            isPaid,

            order: {
                id: order.id,
                orderId: order.id,
                orderNumber: order.order_number,
                displayOrderNumber: order.display_order_number,
                orderDate: order.order_date,

                customerName: order.customer_name,
                customerPhone: order.customer_phone,
                customerEmail: order.customer_email,
                loyaltyOptIn: order.loyalty_opt_in,

                paymentMethod: order.payment_method,
                paymentStatus: order.payment_status,

                totalPrice: order.total_price,
                totalGross: order.total_gross,
                totalNet: order.total_net,
                totalVat: order.total_vat,

                createdAt: order.created_at,
                paidAt: order.paid_at,
            },

            loyalty,
        });
    } catch (error) {
        console.error("Paid status API error:", error);

        return NextResponse.json(
            { error: "Could not check payment status" },
            { status: 500 }
        );
    }
}
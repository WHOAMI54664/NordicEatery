import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VAT_RATE = 6; // 6% moms for takeaway / online food sales from 1 April 2026

type OrderItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    [key: string]: unknown;
};

type CreateOrderBody = {
    orderId?: string;
    clientOrderId?: string;
    customerName?: string;
    customerPhone?: string;
    address?: string;
    deliveryType?: "delivery" | "pickup";
    comment?: string | null;
    items?: OrderItem[];
    totalPrice?: number;
    paymentMethod?: "cash" | "swish";
    deliveryFee?: number;
};

function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateVatFromGross(gross: number, vatRate: number) {
    const net = roundMoney(gross / (1 + vatRate / 100));
    const vat = roundMoney(gross - net);

    return {
        gross: roundMoney(gross),
        net,
        vat,
    };
}

function safeNumber(value: unknown, fallback = 0) {
    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getOrderDate() {
    return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
    try {
        const supabase = createAdminClient();
        const body = (await request.json()) as CreateOrderBody;

        const {
            orderId,
            clientOrderId,
            customerName,
            customerPhone,
            address,
            deliveryType,
            comment,
            items,
            totalPrice,
            paymentMethod,
            deliveryFee,
        } = body;

        const technicalOrderId = orderId || clientOrderId;

        if (!technicalOrderId) {
            return NextResponse.json(
                { error: "Order ID is required" },
                { status: 400 }
            );
        }

        if (!customerName?.trim()) {
            return NextResponse.json(
                { error: "Customer name is required" },
                { status: 400 }
            );
        }

        if (!customerPhone?.trim()) {
            return NextResponse.json(
                { error: "Customer phone is required" },
                { status: 400 }
            );
        }

        if (!address?.trim()) {
            return NextResponse.json(
                { error: "Address is required" },
                { status: 400 }
            );
        }

        if (deliveryType !== "delivery" && deliveryType !== "pickup") {
            return NextResponse.json(
                { error: "Invalid delivery type" },
                { status: 400 }
            );
        }

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }

        if (paymentMethod !== "cash" && paymentMethod !== "swish") {
            return NextResponse.json(
                { error: "Invalid payment method" },
                { status: 400 }
            );
        }

        const { data: displayOrderNumber, error: displayOrderNumberError } =
            await supabase.rpc("generate_daily_order_number");

        if (displayOrderNumberError || !displayOrderNumber) {
            console.error(
                "Generate daily order number error:",
                displayOrderNumberError
            );

            return NextResponse.json(
                { error: "Could not generate order number" },
                { status: 500 }
            );
        }

        const orderDate = getOrderDate();

        const normalizedItems = items.map((item) => {
            const unitPriceGross = safeNumber(item.price);
            const quantity = Math.max(1, Math.trunc(safeNumber(item.quantity, 1)));

            const lineTotalGross = roundMoney(unitPriceGross * quantity);

            const unitVatBreakdown = calculateVatFromGross(unitPriceGross, VAT_RATE);

            const lineVatBreakdown = calculateVatFromGross(lineTotalGross, VAT_RATE);

            return {
                ...item,
                price: unitPriceGross,
                quantity,

                vat_rate: VAT_RATE,

                unit_price_gross: unitVatBreakdown.gross,
                unit_price_net: unitVatBreakdown.net,
                unit_price_vat: unitVatBreakdown.vat,

                line_total_gross: lineVatBreakdown.gross,
                line_total_net: lineVatBreakdown.net,
                line_total_vat: lineVatBreakdown.vat,
            };
        });

        const subtotalGross = roundMoney(
            normalizedItems.reduce(
                (sum, item) => sum + safeNumber(item.line_total_gross),
                0
            )
        );

        const providedTotalPrice = roundMoney(safeNumber(totalPrice));

        const inferredDeliveryFee = roundMoney(
            Math.max(0, providedTotalPrice - subtotalGross)
        );

        const deliveryFeeGross = roundMoney(
            deliveryType === "delivery"
                ? safeNumber(deliveryFee, inferredDeliveryFee)
                : 0
        );

        const subtotalBreakdown = calculateVatFromGross(subtotalGross, VAT_RATE);
        const deliveryFeeBreakdown = calculateVatFromGross(
            deliveryFeeGross,
            VAT_RATE
        );

        const discountGross = 0;
        const discountBreakdown = calculateVatFromGross(discountGross, VAT_RATE);

        const totalGross = roundMoney(
            subtotalBreakdown.gross +
            deliveryFeeBreakdown.gross -
            discountBreakdown.gross
        );

        const totalNet = roundMoney(
            subtotalBreakdown.net +
            deliveryFeeBreakdown.net -
            discountBreakdown.net
        );

        const totalVat = roundMoney(
            subtotalBreakdown.vat +
            deliveryFeeBreakdown.vat -
            discountBreakdown.vat
        );

        if (providedTotalPrice > 0 && providedTotalPrice !== totalGross) {
            console.warn("Order total mismatch:", {
                providedTotalPrice,
                calculatedTotalGross: totalGross,
                subtotalGross,
                deliveryFeeGross,
            });
        }

        const saleType =
            paymentMethod === "cash" ? "pay_on_site" : "distance_online";

        const paymentStatus =
            paymentMethod === "cash" ? "unpaid" : "awaiting_payment";

        const { error } = await supabase.from("orders").insert({
            id: technicalOrderId,

            /**
             * Keep old technical order number for compatibility.
             * The short customer-facing number is display_order_number.
             */
            order_number: technicalOrderId,
            display_order_number: displayOrderNumber,
            order_date: orderDate,

            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            address: address.trim(),
            delivery_type: deliveryType,
            comment: comment?.trim() || null,

            items: normalizedItems,

            /**
             * Legacy total, used by existing UI/admin logic.
             * We now make it match total_gross.
             */
            total_price: Math.round(totalGross),

            status: "new",
            payment_method: paymentMethod,
            payment_status: paymentStatus,

            /**
             * Accounting / Skatteverket report fields
             */
            order_channel: "website",
            sale_type: saleType,
            currency: "SEK",

            vat_rate: VAT_RATE,

            subtotal_gross: subtotalBreakdown.gross,
            subtotal_net: subtotalBreakdown.net,
            subtotal_vat: subtotalBreakdown.vat,

            delivery_fee_gross: deliveryFeeBreakdown.gross,
            delivery_fee_net: deliveryFeeBreakdown.net,
            delivery_fee_vat: deliveryFeeBreakdown.vat,

            discount_gross: discountBreakdown.gross,
            discount_net: discountBreakdown.net,
            discount_vat: discountBreakdown.vat,

            total_gross: totalGross,
            total_net: totalNet,
            total_vat: totalVat,

            paid_at: null,

            refund_status: "none",
            refunded_at: null,
            refunded_gross: 0,
            refunded_net: 0,
            refunded_vat: 0,
        });

        if (error) {
            console.error("Create order database error:", error);

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            orderId: technicalOrderId,
            orderNumber: technicalOrderId,
            displayOrderNumber,
            orderDate,
            tax: {
                vatRate: VAT_RATE,
                subtotalGross: subtotalBreakdown.gross,
                subtotalNet: subtotalBreakdown.net,
                subtotalVat: subtotalBreakdown.vat,
                deliveryFeeGross: deliveryFeeBreakdown.gross,
                deliveryFeeNet: deliveryFeeBreakdown.net,
                deliveryFeeVat: deliveryFeeBreakdown.vat,
                totalGross,
                totalNet,
                totalVat,
            },
        });
    } catch (error) {
        console.error("Create order error:", error);

        return NextResponse.json(
            { error: "Could not create order" },
            { status: 500 }
        );
    }
}
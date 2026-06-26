import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRestaurantShiftIsOpen } from "@/lib/restaurant/shift";
import { validateCartPrices } from "@/lib/orders/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VAT_RATE = 6;

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
    customerEmail?: string;

    loyaltyOptIn?: boolean;
    marketingConsent?: boolean;

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

function normalizeEmail(email?: string | null) {
    const value = email?.trim().toLowerCase();

    return value || null;
}

function getOrderDate() {
    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

export async function POST(request: Request) {
    try {
        const supabase = createAdminClient();

        const shiftCheck = await assertRestaurantShiftIsOpen();

        if (!shiftCheck.ok) {
            return NextResponse.json({ error: shiftCheck.error }, { status: 403 });
        }

        const body = (await request.json()) as CreateOrderBody;

        const {
            orderId,
            clientOrderId,

            customerName,
            customerPhone,
            customerEmail,

            loyaltyOptIn,

            address,
            deliveryType,
            comment,

            items,
            totalPrice,
            paymentMethod,
            deliveryFee,
        } = body;

        const technicalOrderId = orderId || clientOrderId;
        const normalizedCustomerEmail = normalizeEmail(customerEmail);
        const shouldCreateLoyaltyProfile = Boolean(loyaltyOptIn);

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

        if (shouldCreateLoyaltyProfile && !normalizedCustomerEmail) {
            return NextResponse.json(
                { error: "Email is required to create a customer profile" },
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

        /**
         * Server-authoritative pricing.
         * Unit prices are read from the database, never trusted from the client.
         */
        const priceCheck = await validateCartPrices(supabase, items);

        if (!priceCheck.ok) {
            return NextResponse.json(
                { error: priceCheck.error },
                { status: priceCheck.status }
            );
        }

        const normalizedItems = priceCheck.items.map((item) => {
            const lineTotalGross = roundMoney(item.price * item.quantity);

            const unitVatBreakdown = calculateVatFromGross(item.price, VAT_RATE);
            const lineVatBreakdown = calculateVatFromGross(lineTotalGross, VAT_RATE);

            return {
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,

                vat_rate: VAT_RATE,

                unit_price_gross: unitVatBreakdown.gross,
                unit_price_net: unitVatBreakdown.net,
                unit_price_vat: unitVatBreakdown.vat,

                line_total_gross: lineVatBreakdown.gross,
                line_total_net: lineVatBreakdown.net,
                line_total_vat: lineVatBreakdown.vat,
            };
        });

        const subtotalGross = priceCheck.subtotalGross;

        const providedTotalPrice = roundMoney(safeNumber(totalPrice));

        const inferredDeliveryFee = roundMoney(
            Math.max(0, providedTotalPrice - subtotalGross)
        );

        const deliveryFeeGross = roundMoney(
            deliveryType === "delivery" ? safeNumber(deliveryFee, inferredDeliveryFee) : 0
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

            order_number: technicalOrderId,
            display_order_number: displayOrderNumber,
            order_date: orderDate,

            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            customer_email: normalizedCustomerEmail,

            loyalty_opt_in: shouldCreateLoyaltyProfile,

            address: address.trim(),
            delivery_type: deliveryType,
            comment: comment?.trim() || null,

            items: normalizedItems,

            total_price: Math.round(totalGross),

            status: "new",
            payment_method: paymentMethod,
            payment_status: paymentStatus,

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

            updated_at: new Date().toISOString(),
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
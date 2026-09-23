import { NextResponse } from "next/server";
import { assertRestaurantShiftIsOpen } from "@/lib/restaurant/shift";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateCartPrices, type RawCartItem } from "@/lib/orders/pricing";
import {
    getLoyaltyStatusByContact,
    LOYALTY_REWARD_VALUE,
} from "@/lib/customers/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VAT_RATE = 6;

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

type SwishCreateBody = {
    orderNumber?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    loyaltyOptIn?: boolean;
    useLoyaltyReward?: boolean;
    address?: string;
    deliveryType?: string;
    comment?: string | null;
    items?: RawCartItem[];
    totalPrice?: number;
    deliveryFee?: number;
    locale?: string;
    [key: string]: unknown;
};

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

        const body = (await request.json()) as SwishCreateBody;

        /**
         * Server-authoritative pricing.
         * The Swish backend charges exactly the totalPrice it receives, so the
         * amount must be computed here from database prices — never trusted
         * from the browser.
         */
        if (!body.items || body.items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }

        const admin = createAdminClient();
        const priceCheck = await validateCartPrices(admin, body.items);

        if (!priceCheck.ok) {
            return NextResponse.json(
                { error: priceCheck.error },
                { status: priceCheck.status }
            );
        }

        const subtotalGross = priceCheck.subtotalGross;

        const deliveryFeeGross = roundMoney(
            body.deliveryType === "delivery"
                ? Math.max(0, safeNumber(body.deliveryFee))
                : 0
        );

        /**
         * Loyalty reward redemption (stamp card).
         * Server-authoritative: we verify the customer really has an
         * unredeemed reward — the client checkbox alone is never trusted.
         */
        let discountGross = 0;

        if (body.useLoyaltyReward) {
            const loyaltyStatus = await getLoyaltyStatusByContact({
                email: body.customerEmail,
                phone: body.customerPhone,
            });

            if (!loyaltyStatus || loyaltyStatus.rewardsAvailable < 1) {
                return NextResponse.json(
                    { error: "No loyalty reward available for this customer" },
                    { status: 400 }
                );
            }

            discountGross = roundMoney(
                Math.min(LOYALTY_REWARD_VALUE, subtotalGross)
            );
        }

        const totalGross = roundMoney(
            subtotalGross + deliveryFeeGross - discountGross
        );

        const forwardedBody = {
            ...body,
            items: priceCheck.items,
            totalPrice: totalGross,
        };

        const response = await fetch(`${backendUrl}/swish/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": internalSecret,
            },
            body: JSON.stringify(forwardedBody),
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

        const dataWithNumber = data;

        /**
         * The Swish backend only stores the basics. Enrich the order row with
         * the VAT breakdown, loyalty flags and discount so receipts, reports
         * and the loyalty flow see the same numbers as card/cash orders.
         * Non-fatal: a bookkeeping hiccup must never block the payment.
         */
        if (body.orderNumber) {
            try {
                const subtotalBreakdown = calculateVatFromGross(
                    subtotalGross,
                    VAT_RATE
                );
                const deliveryFeeBreakdown = calculateVatFromGross(
                    deliveryFeeGross,
                    VAT_RATE
                );
                const discountBreakdown = calculateVatFromGross(
                    discountGross,
                    VAT_RATE
                );

                await admin
                    .from("orders")
                    .update({
                        customer_email:
                            body.customerEmail?.trim().toLowerCase() || null,
                        loyalty_opt_in: Boolean(body.loyaltyOptIn),

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

                        loyalty_reward_used: discountGross,

                        total_gross: totalGross,
                        total_net: roundMoney(
                            subtotalBreakdown.net +
                                deliveryFeeBreakdown.net -
                                discountBreakdown.net
                        ),
                        total_vat: roundMoney(
                            subtotalBreakdown.vat +
                                deliveryFeeBreakdown.vat -
                                discountBreakdown.vat
                        ),

                        updated_at: new Date().toISOString(),
                    })
                    .eq("order_number", body.orderNumber);
            } catch (enrichError) {
                console.error("Swish order enrich error:", enrichError);
            }
        }

        return NextResponse.json(dataWithNumber);
    } catch (error) {
        console.error("Swish proxy error:", error);

        const message =
            error instanceof Error ? error.message : "Could not start Swish payment";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
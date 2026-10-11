import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRestaurantShiftIsOpen } from "@/lib/restaurant/shift";
import { validateCartPrices } from "@/lib/orders/pricing";
import {
  getLoyaltyStatusByContact,
  LOYALTY_REWARD_VALUE,
} from "@/lib/customers/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VAT_RATE = 6;

type CheckoutItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  [key: string]: unknown;
};

type CheckoutBody = {
  orderId: string;
  clientOrderId?: string;

  customerName: string;
  customerPhone: string;
  customerEmail?: string;

  loyaltyOptIn?: boolean;
  marketingConsent?: boolean;
  useLoyaltyReward?: boolean;

  address: string;
  deliveryType: "delivery" | "pickup";
  comment?: string;

  items: CheckoutItem[];
  totalPrice: number;
  deliveryFee?: number;

  locale?: string;
};

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing");
  }

  return new Stripe(secretKey);
}

function getSafeLocale(locale?: string) {
  if (!locale) return "sv";

  const allowedLocales = ["sv", "en", "pl", "ru"];

  return allowedLocales.includes(locale) ? locale : "sv";
}

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return siteUrl.replace(/\/+$/, "");
}

function normalizeEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();

  return value || null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function calculateVatFromGross(gross: number, vatRate: number) {
  const normalizedGross = roundMoney(gross);
  const net = roundMoney(normalizedGross / (1 + vatRate / 100));
  const vat = roundMoney(normalizedGross - net);

  return {
    gross: normalizedGross,
    net,
    vat,
  };
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
    const stripe = getStripe();
    const supabase = createAdminClient();

    const shiftCheck = await assertRestaurantShiftIsOpen();

    if (!shiftCheck.ok) {
      return NextResponse.json({ error: shiftCheck.error }, { status: 403 });
    }

    const body = (await request.json()) as CheckoutBody;

    const {
      orderId,
      clientOrderId,

      customerName,
      customerPhone,
      customerEmail,

      loyaltyOptIn,
      useLoyaltyReward,

      address,
      deliveryType,
      comment,

      items,
      totalPrice,
      deliveryFee,

      locale,
    } = body;

    const technicalOrderId = orderId || clientOrderId;
    const normalizedCustomerEmail = normalizeEmail(customerEmail);
    const shouldCreateLoyaltyProfile = Boolean(loyaltyOptIn);

    if (!technicalOrderId?.trim()) {
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

    const providedTotalPrice = roundMoney(safeNumber(totalPrice));

    if (providedTotalPrice < 3) {
      return NextResponse.json(
          { error: "Minimum card payment is 3 kr" },
          { status: 400 }
      );
    }

    // The database assigns the shared daily number when payment is confirmed.
    const displayOrderNumber = null;

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

      const unitBreakdown = calculateVatFromGross(item.price, VAT_RATE);
      const lineBreakdown = calculateVatFromGross(lineTotalGross, VAT_RATE);

      return {
        id: item.id,
                lineId: item.lineId,
                selections: item.selections,
        name: item.name,
        quantity: item.quantity,
        price: item.price,

        vat_rate: VAT_RATE,

        unit_price_gross: unitBreakdown.gross,
        unit_price_net: unitBreakdown.net,
        unit_price_vat: unitBreakdown.vat,

        line_total_gross: lineBreakdown.gross,
        line_total_net: lineBreakdown.net,
        line_total_vat: lineBreakdown.vat,
      };
    });

    const subtotalGross = priceCheck.subtotalGross;

    const deliveryFeeGross = roundMoney(
        deliveryType === "delivery" ? Math.max(0, safeNumber(deliveryFee)) : 0
    );

    // Combo pricing can split a drink into full-price and discounted portions.
    // Reject an oversized Stripe session before creating its pending order.
    if (normalizedItems.length + (deliveryFeeGross > 0 ? 1 : 0) > 100) {
      return NextResponse.json(
          { error: "Too many items for card checkout. Reduce the number of different selections." },
          { status: 400 }
      );
    }

    const subtotalBreakdown = calculateVatFromGross(subtotalGross, VAT_RATE);
    const deliveryFeeBreakdown = calculateVatFromGross(
        deliveryFeeGross,
        VAT_RATE
    );

    /**
     * Loyalty reward redemption (stamp card).
     * Server-authoritative: we verify the customer really has an
     * unredeemed reward — the client checkbox alone is never trusted.
     */
    let discountGross = 0;

    if (useLoyaltyReward) {
      const loyaltyStatus = await getLoyaltyStatusByContact({
        email: normalizedCustomerEmail,
        phone: customerPhone,
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

    if (providedTotalPrice !== totalGross) {
      console.warn("Stripe checkout total mismatch:", {
        orderId: technicalOrderId,
        providedTotalPrice,
        calculatedTotalGross: totalGross,
        subtotalGross,
        deliveryFeeGross,
      });
    }

    const siteUrl = getSiteUrl();
    const safeLocale = getSafeLocale(locale);
    const now = new Date().toISOString();

    const { error: orderError } = await supabase.from("orders").upsert({
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
      payment_method: "card",
      payment_status: "awaiting_payment",
      order_channel: "website",
      sale_type: "distance_online",
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

      loyalty_reward_used: discountGross,

      total_gross: totalGross,
      total_net: totalNet,
      total_vat: totalVat,

      paid_at: null,

      refund_status: "none",
      refunded_at: null,
      refunded_gross: 0,
      refunded_net: 0,
      refunded_vat: 0,

      updated_at: now,
    });

    if (orderError) {
      console.error("Stripe order upsert error:", orderError);

      return NextResponse.json(
          { error: orderError.message },
          { status: 500 }
      );
    }

    type StripeLineItem = NonNullable<
        Stripe.Checkout.SessionCreateParams["line_items"]
    >[number];

    const stripeLineItems: StripeLineItem[] =
        normalizedItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "sek",
            product_data: {
              name: String(item.name),
            },
            unit_amount: Math.round(safeNumber(item.price) * 100),
          },
        }));

    if (deliveryFeeBreakdown.gross > 0) {
      stripeLineItems.push({
        quantity: 1,
        price_data: {
          currency: "sek",
          product_data: {
            name: "Delivery fee",
          },
          unit_amount: Math.round(deliveryFeeBreakdown.gross * 100),
        },
      });
    }

    /**
     * The loyalty discount is applied in Stripe as a one-off coupon so the
     * amount the customer pays matches the order totals in the database.
     */
    let stripeDiscounts:
        | Array<{ coupon: string }>
        | undefined = undefined;

    if (discountGross > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountGross * 100),
        currency: "sek",
        duration: "once",
        name: `Loyalty reward ${LOYALTY_REWARD_VALUE} kr`,
      });

      stripeDiscounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: stripeLineItems,

      discounts: stripeDiscounts,

      metadata: {
        orderId: technicalOrderId,
        orderNumber: technicalOrderId,
        orderDate,
        loyaltyOptIn: String(shouldCreateLoyaltyProfile),
      },

      success_url: `${siteUrl}/${safeLocale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${safeLocale}/checkout`,
    });

    const { error: updateError } = await supabase
        .from("orders")
        .update({
          stripe_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("order_number", technicalOrderId);

    if (updateError) {
      console.error("Stripe session ID update error:", updateError);

      return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
      orderId: technicalOrderId,
      orderNumber: technicalOrderId,
      displayOrderNumber,
      orderDate,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    const message =
        error instanceof Error ? error.message : "Stripe checkout failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

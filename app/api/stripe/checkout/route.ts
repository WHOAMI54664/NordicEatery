import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const supabase = createAdminClient();

    const body = (await request.json()) as CheckoutBody;

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
      deliveryFee,
      locale,
    } = body;

    const technicalOrderId = orderId || clientOrderId;

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
      const quantity = Math.max(1, Math.trunc(safeNumber(item.quantity, 1)));
      const unitPriceGross = roundMoney(safeNumber(item.price));
      const lineTotalGross = roundMoney(unitPriceGross * quantity);

      const unitBreakdown = calculateVatFromGross(unitPriceGross, VAT_RATE);
      const lineBreakdown = calculateVatFromGross(lineTotalGross, VAT_RATE);

      return {
        ...item,
        quantity,
        price: unitPriceGross,

        vat_rate: VAT_RATE,

        unit_price_gross: unitBreakdown.gross,
        unit_price_net: unitBreakdown.net,
        unit_price_vat: unitBreakdown.vat,

        line_total_gross: lineBreakdown.gross,
        line_total_net: lineBreakdown.net,
        line_total_vat: lineBreakdown.vat,
      };
    });

    const subtotalGross = roundMoney(
        normalizedItems.reduce(
            (sum, item) => sum + safeNumber(item.line_total_gross),
            0
        )
    );

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

    if (providedTotalPrice !== totalGross) {
      console.warn("Stripe checkout total mismatch:", {
        orderId: technicalOrderId,
        providedTotalPrice,
        calculatedTotalGross: totalGross,
        subtotalGross,
        deliveryFeeGross,
      });
    }

    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const safeLocale = getSafeLocale(locale);

    const { error: orderError } = await supabase.from("orders").upsert({
      /**
       * Technical order ID.
       * The visible short number is display_order_number.
       */
      id: technicalOrderId,
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
       * Existing legacy field.
       * Keep it because the current site/admin already relies on it.
       */
      total_price: Math.round(totalGross),

      status: "new",
      payment_method: "card",
      payment_status: "awaiting_payment",

      /**
       * Accounting / Skatteverket reporting fields
       */
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

    if (orderError) {
      console.error("Stripe order upsert error:", orderError);

      return NextResponse.json(
          { error: orderError.message },
          { status: 500 }
      );
    }

    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: stripeLineItems,

      metadata: {
        orderId: technicalOrderId,
        orderNumber: technicalOrderId,
        displayOrderNumber,
        orderDate,
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
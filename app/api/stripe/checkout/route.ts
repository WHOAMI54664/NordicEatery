import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

type CheckoutBody = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryType: "delivery" | "pickup";
  comment?: string;
  items: CheckoutItem[];
  totalPrice: number;
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

  const allowedLocales = ["sv", "en", "ru"];
  return allowedLocales.includes(locale) ? locale : "sv";
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const supabase = createAdminClient();

    const body = (await request.json()) as CheckoutBody;

    const {
      orderId,
      customerName,
      customerPhone,
      address,
      deliveryType,
      comment,
      items,
      totalPrice,
      locale,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (totalPrice < 3) {
      return NextResponse.json(
          { error: "Minimum card payment is 3 kr" },
          { status: 400 }
      );
    }

    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const safeLocale = getSafeLocale(locale);
    const { error: orderError } = await supabase.from("orders").upsert({
      order_number: orderId,
      customer_name: customerName,
      customer_phone: customerPhone,
      address,
      delivery_type: deliveryType,
      comment: comment || null,
      items,
      total_price: totalPrice,
      status: "new",
      payment_method: "card",
      payment_status: "awaiting_payment",
    });

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "sek",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
      })),

      metadata: {
        orderId,
      },
      success_url: `${siteUrl}/${safeLocale}/order/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${safeLocale}/checkout`,
    });
    const { error: updateError } = await supabase
        .from("orders")
        .update({
          stripe_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("order_number", orderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    const message =
        error instanceof Error ? error.message : "Stripe checkout failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
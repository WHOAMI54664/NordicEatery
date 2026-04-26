import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type CheckoutItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export async function POST(request: Request) {
  try {
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
    } = body as {
      orderId: string;
      customerName: string;
      customerPhone: string;
      address: string;
      deliveryType: "delivery" | "pickup";
      comment?: string;
      items: CheckoutItem[];
      totalPrice: number;
    };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "sek",
          product_data: {
            name: item.name,
          },
          unit_amount: item.price * 100,
        },
      })),

      metadata: {
        orderId,
        customerName,
        customerPhone,
        address,
        deliveryType,
        comment: comment || "",
        totalPrice: String(totalPrice),
      },

      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    return NextResponse.json(
      { error: "Stripe checkout failed" },
      { status: 500 }
    );
  }
}
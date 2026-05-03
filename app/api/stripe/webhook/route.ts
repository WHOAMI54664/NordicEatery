import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing");
  }

  return new Stripe(secretKey);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = createAdminClient();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET is missing" },
        { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
        { error: "Missing stripe-signature" },
        { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature error:", error);

    return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const orderId = session.metadata?.orderId;

    if (!orderId) {
      return NextResponse.json(
          { error: "Missing orderId in metadata" },
          { status: 400 }
      );
    }

    if (session.payment_status === "paid") {
      const { error } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            stripe_session_id: session.id,
            stripe_payment_intent_id:
                typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : null,
            updated_at: new Date().toISOString(),
          })
          .eq("order_number", orderId);

      if (error) {
        console.error("Order payment update error:", error);

        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}

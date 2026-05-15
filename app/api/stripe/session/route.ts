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

function getPaymentIntentId(
    paymentIntent: string | Stripe.PaymentIntent | null
) {
  if (!paymentIntent) return null;

  return typeof paymentIntent === "string"
      ? paymentIntent
      : paymentIntent.id;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
          { error: "Missing session_id" },
          { status: 400 }
      );
    }

    const stripe = getStripe();
    const supabase = createAdminClient();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    const orderId = session.metadata?.orderId || null;
    const paymentIntentId = getPaymentIntentId(session.payment_intent);

    /**
     * Stripe Checkout Session can return:
     * - payment_status: "paid"
     * - "unpaid"
     * - "no_payment_required"
     *
     * For Nordic Eatery, only "paid" means the order becomes a confirmed online sale.
     */
    if (session.payment_status === "paid" && orderId) {
      const paidAt = new Date().toISOString();

      const { error: updateError } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            paid_at: paidAt,
            payment_reference: paymentIntentId || session.id,
            stripe_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            updated_at: paidAt,
          })
          .eq("order_number", orderId)
          /**
           * Important:
           * do not overwrite paid_at every time this endpoint is refreshed.
           * We only finalize orders that are still awaiting payment.
           */
          .in("payment_status", ["awaiting_payment", "unpaid"]);

      if (updateError) {
        console.error("Stripe order payment update error:", updateError);

        return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
        );
      }
    }

    return NextResponse.json({
      id: session.id,
      orderId,
      paymentStatus: session.payment_status,
      status: session.status,
      paymentIntentId,
    });
  } catch (error) {
    console.error("Stripe session error:", error);

    return NextResponse.json(
        { error: "Could not verify payment" },
        { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleGroupSession, handleFailedGroupSession } from "@/lib/group-orders/payments";

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

async function markStripeOrderAsPaid(session: Stripe.Checkout.Session) {
  const supabase = createAdminClient();

  const orderId = session.metadata?.orderId;
  const paymentIntentId = getPaymentIntentId(session.payment_intent);

  if (!orderId) {
    console.warn("Stripe webhook: Missing orderId in session metadata", {
      sessionId: session.id,
    });

    return {
      success: true,
      updated: false,
      reason: "missing_order_id",
    };
  }

  if (session.payment_status !== "paid") {
    console.log("Stripe webhook: Session is not paid yet", {
      orderId,
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });

    return {
      success: true,
      updated: false,
      reason: "session_not_paid",
    };
  }

  const paidAt = new Date().toISOString();

  const { data, error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        paid_at: paidAt,

        /**
         * Generic payment reference for accounting exports.
         * PaymentIntent is better for reconciliation in Stripe.
         * If unavailable, we fall back to Checkout Session ID.
         */
        payment_reference: paymentIntentId || session.id,

        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,

        updated_at: paidAt,
      })
      .eq("order_number", orderId)
      /**
       * Important:
       * Do not rewrite already-paid orders on repeated webhook deliveries.
       * Stripe can retry events, and webhooks must be idempotent.
       */
      .in("payment_status", ["awaiting_payment", "unpaid"])
      .select("id, order_number, payment_status, paid_at");

  if (error) {
    console.error("Stripe webhook: Order payment update error:", error);

    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    console.log("Stripe webhook: Order was already paid or not found", {
      orderId,
      sessionId: session.id,
    });

    return {
      success: true,
      updated: false,
      reason: "already_paid_or_not_found",
    };
  }

  console.log("Stripe webhook: Order marked as paid", {
    orderId,
    sessionId: session.id,
    paymentIntentId,
  });

  return {
    success: true,
    updated: true,
    orderId,
  };
}

export async function POST(request: Request) {
  const stripe = getStripe();

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

  try {
    switch (event.type) {
        /**
         * Main event for Stripe Checkout.
         * Stripe recommends this event for fulfillment after Checkout payment.
         */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.group_id) await handleGroupSession(session);
        else await markStripeOrderAsPaid(session);
        break;
      }

        /**
         * Future-proof handling for delayed payment methods.
         * If Stripe payment methods are expanded later,
         * this event can confirm a payment that completed asynchronously.
         */
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.group_id) await handleGroupSession(session);
        else await markStripeOrderAsPaid(session);
        break;
      }

      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.group_id) await handleFailedGroupSession(session);
        break;
      }

      default:
        console.log(`Stripe webhook: Unhandled event type ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    const message =
        error instanceof Error
            ? error.message
            : "Webhook processing failed";

    /**
     * 500 is intentional:
     * Stripe should retry if our database update temporarily fails.
     */
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_number: string | null;
  display_order_number: string | null;
  order_date: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  payment_status: string | null;
  total_price: number | null;
  total_gross: number | null;
  total_net: number | null;
  total_vat: number | null;
  created_at: string | null;
  paid_at: string | null;
};

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

  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
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

    if (!orderId) {
      return NextResponse.json(
          { error: "Missing orderId in Stripe session metadata" },
          { status: 400 }
      );
    }

    /**
     * Stripe Checkout Session can return:
     * - payment_status: "paid"
     * - "unpaid"
     * - "no_payment_required"
     *
     * For Nordic Eatery, only "paid" means the order becomes a confirmed online sale.
     */
    if (session.payment_status === "paid") {
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

    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
            `
        id,
        order_number,
        display_order_number,
        order_date,
        customer_name,
        customer_phone,
        payment_method,
        payment_status,
        total_price,
        total_gross,
        total_net,
        total_vat,
        created_at,
        paid_at
      `
        )
        .eq("order_number", orderId)
        .maybeSingle<OrderRow>();

    if (orderError) {
      console.error("Stripe session order fetch error:", orderError);

      return NextResponse.json(
          { error: orderError.message },
          { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,

      stripe: {
        id: session.id,
        paymentStatus: session.payment_status,
        status: session.status,
        paymentIntentId,
      },

      order: {
        id: order.id,
        orderId: order.id,
        orderNumber: order.order_number,
        displayOrderNumber: order.display_order_number,
        orderDate: order.order_date,

        customerName: order.customer_name,
        customerPhone: order.customer_phone,

        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,

        totalPrice: order.total_price,
        totalGross: order.total_gross,
        totalNet: order.total_net,
        totalVat: order.total_vat,

        createdAt: order.created_at,
        paidAt: order.paid_at,
      },
    });
  } catch (error) {
    console.error("Stripe session error:", error);

    return NextResponse.json(
        { error: "Could not verify payment" },
        { status: 500 }
    );
  }
}
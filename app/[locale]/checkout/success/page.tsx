"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { KitchenOrder } from "@/types/order";

const ORDERS_STORAGE_KEY = "mikes-food-orders";
const PENDING_STRIPE_ORDER_KEY = "mikes-food-pending-stripe-order";

export default function CheckoutSuccessPage() {
  const [status, setStatus] = useState<"checking" | "paid" | "failed">(
    "checking"
  );
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");

      if (!sessionId) {
        setStatus("failed");
        return;
      }

      const response = await fetch(`/api/stripe/session?session_id=${sessionId}`);
      const data = await response.json();

      if (!response.ok || data.paymentStatus !== "paid") {
        setStatus("failed");
        return;
      }

      const rawPendingOrder = window.localStorage.getItem(
        PENDING_STRIPE_ORDER_KEY
      );

      if (!rawPendingOrder) {
        setStatus("paid");
        return;
      }

      const pendingOrder = JSON.parse(rawPendingOrder) as KitchenOrder;

      const paidOrder: KitchenOrder = {
        ...pendingOrder,
        paymentStatus: "paid",
        status: "new",
      };

      const rawOrders = window.localStorage.getItem(ORDERS_STORAGE_KEY);
      const existingOrders = rawOrders
        ? (JSON.parse(rawOrders) as KitchenOrder[])
        : [];

      const alreadyExists = existingOrders.some(
        (order) => order.id === paidOrder.id
      );

      if (!alreadyExists) {
        window.localStorage.setItem(
          ORDERS_STORAGE_KEY,
          JSON.stringify([paidOrder, ...existingOrders])
        );
      }

      window.localStorage.removeItem(PENDING_STRIPE_ORDER_KEY);

      setOrderId(paidOrder.id);
      setStatus("paid");
    }

    verifyPayment();
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
      <div className="glass-card w-full p-8 text-center">
        {status === "checking" && (
          <>
            <div className="text-5xl">⏳</div>
            <h1 className="mt-6 text-3xl font-black text-dark">
              Checking payment...
            </h1>
            <p className="mt-3 text-dark/60">
              Please wait while we confirm your payment.
            </p>
          </>
        )}

        {status === "paid" && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-paprika/10 text-4xl">
              ✅
            </div>

            <h1 className="mt-6 text-3xl font-black text-dark">
              Payment received
            </h1>

            <p className="mt-3 text-dark/60">
              Your order{" "}
              {orderId && (
                <span className="font-black text-paprika">{orderId}</span>
              )}{" "}
              has been sent to the kitchen.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/kitchen" className="btn-primary">
                Open kitchen board
              </Link>

              <Link href="/menu" className="btn-secondary">
                Back to menu
              </Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="text-5xl">❌</div>
            <h1 className="mt-6 text-3xl font-black text-dark">
              Payment not confirmed
            </h1>

            <p className="mt-3 text-dark/60">
              We could not confirm your payment. Please try again.
            </p>

            <Link href="/checkout" className="btn-primary mt-6">
              Back to checkout
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
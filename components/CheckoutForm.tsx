"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import type { KitchenOrder, PaymentMethod } from "@/types/order";

const ORDERS_STORAGE_KEY = "mikes-food-orders";
const PENDING_STRIPE_ORDER_KEY = "mikes-food-pending-stripe-order";

function createOrderId() {
  return `MF-${Date.now().toString(36).toUpperCase()}`;
}

function getPaymentStatus(paymentMethod: PaymentMethod) {
  if (paymentMethod === "cash") return "unpaid";
  return "awaiting_payment";
}

export function CheckoutForm() {
  const { items, totalPrice, clearCart } = useCart();

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    const formData = new FormData(event.currentTarget);

    const selectedPaymentMethod = String(
      formData.get("paymentMethod") || "cash"
    ) as PaymentMethod;

    setPaymentMethod(selectedPaymentMethod);
    setIsLoading(true);

    const generatedOrderId = createOrderId();

    const deliveryType =
      String(formData.get("deliveryType")) === "pickup"
        ? "pickup"
        : "delivery";

    const customerName = String(formData.get("customerName") || "");
    const customerPhone = String(formData.get("customerPhone") || "");
    const address = String(formData.get("address") || "");
    const comment = String(formData.get("comment") || "");

    if (selectedPaymentMethod === "card") {
      const pendingOrder: KitchenOrder = {
        id: generatedOrderId,
        customerName,
        customerPhone,
        address,
        deliveryType,
        paymentMethod: "card",
        paymentStatus: "awaiting_payment",
        comment,
        items,
        totalPrice,
        status: "new",
        createdAt: new Date().toISOString(),
      };

      window.localStorage.setItem(
        PENDING_STRIPE_ORDER_KEY,
        JSON.stringify(pendingOrder)
      );

      try {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: generatedOrderId,
            customerName,
            customerPhone,
            address,
            deliveryType,
            comment,
            items,
            totalPrice,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          window.localStorage.removeItem(PENDING_STRIPE_ORDER_KEY);
          alert("Stripe payment could not be started.");
          setIsLoading(false);
          return;
        }

        window.location.href = data.url;
        return;
      } catch (error) {
        console.error("Stripe error:", error);
        window.localStorage.removeItem(PENDING_STRIPE_ORDER_KEY);
        alert("Stripe payment could not be started.");
        setIsLoading(false);
        return;
      }
    }

    const newOrder: KitchenOrder = {
      id: generatedOrderId,
      customerName,
      customerPhone,
      address,
      deliveryType,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: getPaymentStatus(selectedPaymentMethod),
      comment,
      items,
      totalPrice,
      status: "new",
      createdAt: new Date().toISOString(),
    };

    const rawOrders = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    const existingOrders = rawOrders
      ? (JSON.parse(rawOrders) as KitchenOrder[])
      : [];

    window.localStorage.setItem(
      ORDERS_STORAGE_KEY,
      JSON.stringify([newOrder, ...existingOrders])
    );

    setOrderId(newOrder.id);
    clearCart();
    setIsSubmitted(true);
    setIsLoading(false);
  }

  if (isSubmitted) {
    return (
      <div className="glass-card mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-paprika/10 text-4xl">
          ✅
        </div>

        <h1 className="mt-6 text-3xl font-black text-dark">Order received</h1>

        <p className="mt-3 text-dark/60">
          Order <span className="font-black text-paprika">{orderId}</span> was
          sent to the kitchen board.
        </p>

        {paymentMethod === "cash" && (
          <div className="mt-6 rounded-3xl bg-white/70 p-5 text-left">
            <p className="font-black text-dark">Pay on pickup / delivery</p>
            <p className="mt-2 text-sm leading-6 text-dark/60">
              The customer will pay when receiving the order.
            </p>
          </div>
        )}

        {paymentMethod === "swish" && (
          <div className="mt-6 rounded-3xl bg-white/70 p-5 text-left">
            <p className="font-black text-dark">Swish payment</p>
            <p className="mt-2 text-sm leading-6 text-dark/60">
              Please Swish the total amount to the restaurant number. Your order
              is marked as awaiting payment.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/kitchen" className="btn-primary">
            Open kitchen board
          </Link>

          <Link href="/menu" className="btn-secondary">
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-card mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-3xl font-black text-dark">Cart is empty</h1>

        <p className="mt-3 text-dark/60">
          Add food to your cart before checkout.
        </p>

        <Link href="/menu" className="btn-primary mt-6">
          Go to menu
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[1fr_380px]"
    >
      <div className="glass-card p-6">
        <h1 className="text-3xl font-black text-dark">Checkout</h1>

        <p className="mt-2 text-sm text-dark/60">
          Customer information, delivery and payment details.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-bold text-dark">Name</span>
            <input
              required
              name="customerName"
              className="input-field"
              placeholder="Your name"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-dark">
              Phone
            </span>
            <input
              required
              name="customerPhone"
              className="input-field"
              placeholder="+46..."
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-dark">
              Address
            </span>
            <input
              required
              name="address"
              className="input-field"
              placeholder="Street, apartment, city"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-dark">
              Delivery type
            </span>
            <select
              name="deliveryType"
              className="input-field"
              defaultValue="delivery"
            >
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
            </select>
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-dark">
              Payment method
            </span>

            <select
              name="paymentMethod"
              className="input-field"
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as PaymentMethod)
              }
            >
              <option value="cash">Pay on pickup / delivery</option>
              <option value="swish">Swish</option>
              <option value="card">Card / Apple Pay / Google Pay</option>
            </select>
          </label>

          {paymentMethod === "swish" && (
            <div className="sm:col-span-2 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-dark/60">
              Pay with Swish after placing the order. The kitchen will see this
              order as <span className="font-black">awaiting payment</span>.
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="sm:col-span-2 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-dark/60">
              You will be redirected to Stripe. Card, Apple Pay and Google Pay
              will be available there. The order will not be sent to the kitchen
              before payment is confirmed.
            </div>
          )}

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-dark">
              Comment
            </span>

            <textarea
              name="comment"
              className="input-field min-h-28 resize-none"
              placeholder="No onion, extra sauce..."
            />
          </label>
        </div>
      </div>

      <aside className="glass-card h-fit p-6">
        <h2 className="text-2xl font-black text-dark">Your order</h2>

        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 text-sm">
              <div>
                <p className="font-black text-dark">{item.name}</p>
                <p className="text-dark/50">x{item.quantity}</p>
              </div>

              <p className="font-black">{item.price * item.quantity} kr</p>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-dark/10 pt-4">
          <div className="flex justify-between text-lg">
            <span className="font-black">Total</span>
            <span className="font-black text-paprika">{totalPrice} kr</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? "Processing..."
            : paymentMethod === "card"
              ? "Continue to payment"
              : "Place order"}
        </button>

        <p className="mt-4 text-center text-xs leading-5 text-dark/45">
          Selected payment:{" "}
          <span className="font-black">
            {paymentMethod === "cash"
              ? "Pay on pickup / delivery"
              : paymentMethod === "swish"
                ? "Swish"
                : "Card / Apple Pay / Google Pay"}
          </span>
        </p>
      </aside>
    </form>
  );
}
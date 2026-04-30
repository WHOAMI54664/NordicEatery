"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import type { PaymentMethod } from "@/types/order";

function createOrderId() {
  return `MF-${Date.now().toString(36).toUpperCase()}`;
}

export function CheckoutForm() {
  const router = useRouter();
  const params = useParams();
  const locale = String(params.locale || "sv");

  const { items, totalPrice, clearCart } = useCart();

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

    const orderId = createOrderId();

    const deliveryType =
        String(formData.get("deliveryType")) === "pickup"
            ? "pickup"
            : "delivery";

    const orderPayload = {
      orderId,
      customerName: String(formData.get("customerName") || ""),
      customerPhone: String(formData.get("customerPhone") || ""),
      address: String(formData.get("address") || ""),
      deliveryType,
      comment: String(formData.get("comment") || ""),
      items,
      totalPrice,
      paymentMethod: selectedPaymentMethod,
      locale,
    };

    try {
      if (selectedPaymentMethod === "card") {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          alert(data.error || "Stripe payment could not be started.");
          setIsLoading(false);
          return;
        }

        clearCart();
        window.location.href = data.url;
        return;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Order could not be created.");
        setIsLoading(false);
        return;
      }

      clearCart();
      router.push(`/${locale}/order/${orderId}`);
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  if (items.length === 0) {
    return (
        <div className="glass-card mx-auto max-w-2xl p-8 text-center">
          <h1 className="text-3xl font-black text-dark">Cart is empty</h1>

          <p className="mt-3 text-dark/60">
            Add food to your cart before checkout.
          </p>

          <Link href={`/${locale}/menu`} className="btn-primary mt-6">
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
              <span className="mb-2 block text-sm font-bold text-dark">Phone</span>
              <input
                  required
                  name="customerPhone"
                  className="input-field"
                  placeholder="+46..."
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-dark">Address</span>
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
              <select name="deliveryType" className="input-field" defaultValue="delivery">
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
                  Pay with Swish after placing the order. Your order will be marked
                  as <span className="font-black">awaiting payment</span> until the
                  payment is confirmed.
                </div>
            )}

            {paymentMethod === "card" && (
                <div className="sm:col-span-2 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-dark/60">
                  You will be redirected to Stripe. Card, Apple Pay and Google Pay
                  are processed securely. The order will appear in the kitchen only
                  after payment is confirmed.
                </div>
            )}

            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-dark">Comment</span>
              <textarea
                  name="comment"
                  className="input-field min-h-28 resize-none"
                  placeholder="No onion, extra sauce..."
              />
            </label>

            <div className="sm:col-span-2 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-dark/60">
              <p className="font-black text-dark">Secure payments</p>
              <p className="mt-1">
                Card, Apple Pay and Google Pay are handled through Stripe. Swish
                will be available after bank approval.
              </p>
            </div>

            <label className="sm:col-span-2 flex gap-3 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-dark/60">
              <input required type="checkbox" className="mt-1 h-4 w-4" />
              <span>
              I accept the{" "}
                <Link
                    href={`/${locale}/terms`}
                    className="font-black text-paprika underline"
                >
                Terms and Conditions
              </Link>{" "}
                and{" "}
                <Link
                    href={`/${locale}/privacy`}
                    className="font-black text-paprika underline"
                >
                Privacy Policy
              </Link>
              .
            </span>
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

            <p className="mt-2 text-xs leading-5 text-dark/45">
              All prices are shown in SEK and include applicable taxes.
            </p>
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
            Delivery estimate: 30–40 min. For complaints or refunds, contact
            kontakt@nordiceatery.se.
          </p>
        </aside>
      </form>
  );
}
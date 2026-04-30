"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Store, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/CartProvider";
import { PaymentIcons } from "@/components/PaymentIcons";
import type { PaymentMethod } from "@/types/order";

function createOrderId() {
  return `MF-${Date.now().toString(36).toUpperCase()}`;
}

export function CheckoutForm() {
  const t = useTranslations("pages.checkout");

  const router = useRouter();
  const params = useParams();
  const locale = String(params.locale || "sv");

  const { items, totalPrice, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
      "delivery"
  );
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    const formData = new FormData(event.currentTarget);
    setIsLoading(true);

    const orderId = createOrderId();

    const orderPayload = {
      orderId,
      customerName: String(formData.get("customerName") || ""),
      customerPhone: String(formData.get("customerPhone") || ""),
      address: String(formData.get("address") || ""),
      deliveryType,
      comment: String(formData.get("comment") || ""),
      items,
      totalPrice,
      paymentMethod,
      locale
    };

    try {
      if (paymentMethod === "card") {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload)
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          alert(data.error || t("stripeError"));
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
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || t("orderError"));
        setIsLoading(false);
        return;
      }

      clearCart();
      router.push(`/${locale}/order/${orderId}`);
    } catch (error) {
      console.error("Checkout error:", error);
      alert(t("generalError"));
      setIsLoading(false);
    }
  }

  if (items.length === 0) {
    return (
        <div className="glass-card mx-auto max-w-2xl p-8 text-center">
          <h1 className="text-3xl font-black text-dark">{t("emptyTitle")}</h1>

          <p className="mt-3 text-dark/60">{t("emptyText")}</p>

          <Link href={`/${locale}/menu`} className="btn-primary mt-6">
            {t("goToMenu")}
          </Link>
        </div>
    );
  }

  return (
      <form
          onSubmit={handleSubmit}
          className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_390px]"
      >
        <div className="glass-card w-full min-w-0 p-5 sm:p-6">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-paprika/70">
              {t("eyebrow")}
            </p>

            <h1 className="mt-2 text-3xl font-black text-dark sm:text-4xl">
              {t("title")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-dark/60">
              {t("subtitle")}
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <label>
            <span className="mb-2 block text-sm font-bold text-dark">
              {t("name")}
            </span>
              <input
                  required
                  name="customerName"
                  className="input-field"
                  placeholder={t("namePlaceholder")}
              />
            </label>

            <label>
            <span className="mb-2 block text-sm font-bold text-dark">
              {t("phone")}
            </span>
              <input
                  required
                  name="customerPhone"
                  className="input-field"
                  placeholder={t("phonePlaceholder")}
              />
            </label>

            <div className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-dark">
              {t("deliveryType")}
            </span>

              <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setDeliveryType("delivery")}
                    className={`min-w-0 rounded-3xl border p-4 text-left transition ${
                        deliveryType === "delivery"
                            ? "border-paprika bg-paprika text-white"
                            : "border-dark/10 bg-white/70 text-dark hover:border-paprika/40"
                    }`}
                >
                  <Truck className="h-5 w-5" />
                  <p className="mt-2 truncate font-black">{t("delivery")}</p>
                  <p className="mt-1 text-xs opacity-70">{t("deliveryTime")}</p>
                </button>

                <button
                    type="button"
                    onClick={() => setDeliveryType("pickup")}
                    className={`min-w-0 rounded-3xl border p-4 text-left transition ${
                        deliveryType === "pickup"
                            ? "border-paprika bg-paprika text-white"
                            : "border-dark/10 bg-white/70 text-dark hover:border-paprika/40"
                    }`}
                >
                  <Store className="h-5 w-5" />
                  <p className="mt-2 truncate font-black">{t("pickup")}</p>
                  <p className="mt-1 text-xs opacity-70">{t("pickupText")}</p>
                </button>
              </div>
            </div>

            {deliveryType === "delivery" && (
                <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-dark">
                {t("address")}
              </span>
                  <input
                      required
                      name="address"
                      className="input-field"
                      placeholder={t("addressPlaceholder")}
                  />
                </label>
            )}

            {deliveryType === "pickup" && (
                <input type="hidden" name="address" value="Pickup" />
            )}

            <div className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-dark">
              {t("paymentMethod")}
            </span>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`min-w-0 rounded-3xl border px-3 py-4 text-left transition sm:p-4 ${
                        paymentMethod === "card"
                            ? "border-paprika bg-paprika text-white"
                            : "border-dark/10 bg-white/70 text-dark hover:border-paprika/40"
                    }`}
                >
                  <p className="truncate font-black">{t("card")}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-4 opacity-70">
                    {t("cardText")}
                  </p>
                </button>

                <button
                    type="button"
                    onClick={() => setPaymentMethod("swish")}
                    className={`min-w-0 rounded-3xl border px-3 py-4 text-left transition sm:p-4 ${
                        paymentMethod === "swish"
                            ? "border-paprika bg-paprika text-white"
                            : "border-dark/10 bg-white/70 text-dark hover:border-paprika/40"
                    }`}
                >
                  <p className="truncate font-black">{t("swish")}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-4 opacity-70">
                    {t("swishText")}
                  </p>
                </button>

                <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`min-w-0 rounded-3xl border px-3 py-4 text-left transition sm:p-4 ${
                        paymentMethod === "cash"
                            ? "border-paprika bg-paprika text-white"
                            : "border-dark/10 bg-white/70 text-dark hover:border-paprika/40"
                    }`}
                >
                  <p className="truncate font-black">{t("cash")}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-4 opacity-70">
                    {t("cashText")}
                  </p>
                </button>
              </div>

              <input type="hidden" name="paymentMethod" value={paymentMethod} />
            </div>

            {paymentMethod === "swish" && (
                <div className="sm:col-span-2 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-dark/60">
                  {t("swishInfo")}
                </div>
            )}

            {paymentMethod === "card" && (
                <div className="sm:col-span-2 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-dark/60">
                  {t("cardInfo")}
                </div>
            )}

            <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-dark">
              {t("comment")}
            </span>
              <textarea
                  name="comment"
                  className="input-field min-h-28 resize-none"
                  placeholder={t("commentPlaceholder")}
              />
            </label>

            <div className="sm:col-span-2 rounded-3xl bg-white/70 p-4">
              <p className="font-black text-dark">{t("securePayments")}</p>

              <div className="mt-3">
                <PaymentIcons />
              </div>

              <p className="mt-3 text-sm leading-6 text-dark/60">
                {t("securePaymentsText")}
              </p>
            </div>

            <label className="sm:col-span-2 flex gap-3 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-dark/60">
              <input required type="checkbox" className="mt-1 h-4 w-4 shrink-0" />

              <span>
              {t("accept")}{" "}
                <Link
                    href={`/${locale}/terms`}
                    className="font-black text-paprika underline"
                >
                {t("terms")}
              </Link>{" "}
                {t("and")}{" "}
                <Link
                    href={`/${locale}/privacy`}
                    className="font-black text-paprika underline"
                >
                {t("privacy")}
              </Link>
              .
            </span>
            </label>
          </div>
        </div>

        <aside className="glass-card h-fit w-full min-w-0 p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-2xl font-black text-dark">{t("orderTitle")}</h2>

          <div className="mt-6 space-y-4">
            {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-black text-dark">{item.name}</p>
                    <p className="text-dark/50">x{item.quantity}</p>
                  </div>

                  <p className="shrink-0 font-black">
                    {item.price * item.quantity} kr
                  </p>
                </div>
            ))}
          </div>

          <div className="mt-6 border-t border-dark/10 pt-4">
            <div className="flex justify-between gap-4 text-lg">
              <span className="font-black">{t("total")}</span>
              <span className="font-black text-paprika">{totalPrice} kr</span>
            </div>

            <p className="mt-2 text-xs leading-5 text-dark/45">
              {t("taxInfo")}
            </p>
          </div>

          <button
              type="submit"
              disabled={isLoading}
              className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
                ? t("processing")
                : paymentMethod === "card"
                    ? t("continuePayment")
                    : t("placeOrder")}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-dark/45">
            {t("bottomInfo")}
          </p>
        </aside>
      </form>
  );
}
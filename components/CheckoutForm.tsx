"use client";

import { getPublicPath } from "@/i18n/paths";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, Truck } from "lucide-react";
import {
  EditableMessage,
  useEditableTranslations,
} from "@/components/site-content/EditableMessage";
import { useCart } from "@/components/CartProvider";
import { FoodTruckLocation } from "@/components/FoodTruckLocation";
import type { TruckCoordinates } from "@/lib/restaurant/location";
import type { PaymentMethod } from "@/types/order";

type CheckoutSettings = {
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  estimated_delivery_time: string | null;
  delivery_area: string | null;
  cash_enabled: boolean;
  card_enabled: boolean;
  swish_enabled: boolean;
  pickup_address?: string | null;
  pickup_coordinates?: TruckCoordinates | null;
};

type CheckoutFormProps = {
  locale: string;
  settings: CheckoutSettings;
};

type SwishCreateResponse = {
  error?: string;

  swishUrl?: string;
  paymentUrl?: string;
  deeplink?: string;

  orderNumber?: string;
  order_number?: string;
  orderId?: string;
  order_id?: string;

  order?: {
    orderNumber?: string;
    order_number?: string;
    id?: string;
  };
};

function createClientOrderId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `client-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function getSwishOrderNumber(data: SwishCreateResponse) {
  return (
    data.orderNumber ||
    data.order_number ||
    data.order?.orderNumber ||
    data.order?.order_number ||
    data.orderId ||
    data.order_id ||
    data.order?.id ||
    null
  );
}

function getSwishLaunchUrl(data: SwishCreateResponse) {
  return data.swishUrl || data.paymentUrl || data.deeplink || null;
}

export function CheckoutForm({ locale, settings }: CheckoutFormProps) {
  const t = useEditableTranslations("pages.checkout");
  const router = useRouter();

  const combo = useEditableTranslations("combo");
  const { items, totalPrice, pricing, clearCart } = useCart();

  const deliveryOptions = useMemo(
    () =>
      [
        {
          value: "delivery" as const,
          title: t.edit("delivery"),
          description:
            settings.estimated_delivery_time || t.edit("deliveryTime"),
          icon: Truck,
          enabled: settings.delivery_enabled,
        },
        {
          value: "pickup" as const,
          title: t.edit("pickup"),
          description: t.edit("pickupText"),
          icon: Store,
          enabled: settings.pickup_enabled,
        },
      ].filter((option) => option.enabled),
    [
      settings.delivery_enabled,
      settings.pickup_enabled,
      settings.estimated_delivery_time,
      t,
    ],
  );

  const paymentOptions = useMemo(
    () =>
      [
        {
          value: "card" as PaymentMethod,
          title: t.edit("card"),
          description: t.edit("cardText"),
          enabled: settings.card_enabled,
        },
        {
          value: "swish" as PaymentMethod,
          title: t.edit("swish"),
          description: t.edit("swishText"),
          enabled: settings.swish_enabled,
        },
        {
          value: "cash" as PaymentMethod,
          title: t.edit("cash"),
          description: t.edit("cashText"),
          enabled: settings.cash_enabled,
        },
      ].filter((option) => option.enabled),
    [settings.card_enabled, settings.swish_enabled, settings.cash_enabled, t],
  );

  const defaultDeliveryType = deliveryOptions[0]?.value || "delivery";
  const defaultPaymentMethod = paymentOptions[0]?.value || "card";

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(defaultPaymentMethod);

  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    defaultDeliveryType,
  );

  const [pickupOption, setPickupOption] = useState<"eat_in" | "takeaway">(
    "takeaway",
  );

  const [loyaltyOptIn, setLoyaltyOptIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Stamp-card loyalty: when the customer enters their contact details we
   * look up their stamps and unredeemed rewards, and offer to apply a
   * reward to this order. The server re-validates everything.
   */
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [useLoyaltyReward, setUseLoyaltyReward] = useState(false);

  const [loyaltyStatus, setLoyaltyStatus] = useState<{
    stamps: number;
    rewardsAvailable: number;
    stampsPerReward: number;
    rewardValue: number;
  } | null>(null);

  useEffect(() => {
    const email = contactEmail.trim().toLowerCase();
    const phone = contactPhone.trim();

    if (!email.includes("@") && phone.replace(/\D/g, "").length < 8) {
      setLoyaltyStatus(null);
      setUseLoyaltyReward(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/loyalty/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, phone }),
        });

        if (!response.ok) return;

        const data = await response.json();

        setLoyaltyStatus({
          stamps: Number(data.stamps || 0),
          rewardsAvailable: Number(data.rewardsAvailable || 0),
          stampsPerReward: Number(data.stampsPerReward || 10),
          rewardValue: Number(data.rewardValue || 100),
        });
      } catch {
        // Non-fatal: checkout works fine without loyalty info.
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [contactEmail, contactPhone]);

  const rewardValue = loyaltyStatus?.rewardValue ?? 100;

  const appliedLoyaltyDiscount =
    useLoyaltyReward && (loyaltyStatus?.rewardsAvailable ?? 0) > 0
      ? Math.min(rewardValue, totalPrice)
      : 0;

  const totalToPay = Math.max(0, totalPrice - appliedLoyaltyDiscount);

  const selectedPaymentMethodIsAvailable = paymentOptions.some(
    (option) => option.value === paymentMethod,
  );

  const selectedDeliveryTypeIsAvailable = deliveryOptions.some(
    (option) => option.value === deliveryType,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;
    if (items.length === 0) return;

    if (paymentOptions.length === 0) {
      alert("No payment methods are currently available.");
      return;
    }

    if (deliveryOptions.length === 0) {
      alert("No delivery options are currently available.");
      return;
    }

    if (!selectedPaymentMethodIsAvailable) {
      alert("Selected payment method is currently unavailable.");
      return;
    }

    if (!selectedDeliveryTypeIsAvailable) {
      alert("Selected delivery option is currently unavailable.");
      return;
    }

    if (!settings.cash_enabled && paymentMethod === "cash") {
      alert("Cash payment is currently disabled.");
      return;
    }

    if (!settings.card_enabled && paymentMethod === "card") {
      alert("Card payment is currently disabled.");
      return;
    }

    if (!settings.swish_enabled && paymentMethod === "swish") {
      alert("Swish payment is currently disabled.");
      return;
    }

    if (!settings.delivery_enabled && deliveryType === "delivery") {
      alert("Delivery is currently disabled.");
      return;
    }

    if (!settings.pickup_enabled && deliveryType === "pickup") {
      alert("Pickup is currently disabled.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    const customerEmail = String(formData.get("customerEmail") || "")
      .trim()
      .toLowerCase();

    if (loyaltyOptIn && !customerEmail) {
      alert("Please enter your email to create a customer profile.");
      return;
    }

    setIsLoading(true);

    const clientOrderId = createClientOrderId();

    const orderPayload = {
      orderId: clientOrderId,
      clientOrderId,

      customerName: String(formData.get("customerName") || ""),
      customerPhone: String(formData.get("customerPhone") || ""),
      customerEmail,

      loyaltyOptIn,
      marketingConsent: false,
      useLoyaltyReward: appliedLoyaltyDiscount > 0,

      address:
        deliveryType === "pickup"
          ? "Pickup"
          : String(formData.get("address") || ""),

      deliveryType,
      comment: (() => {
        const userComment = String(formData.get("comment") || "").trim();

        if (deliveryType !== "pickup") return userComment;

        const pickupLabel =
          pickupOption === "eat_in" ? t("eatIn") : t("takeaway");

        return [pickupLabel, userComment].filter(Boolean).join(" — ");
      })(),
      items,
      totalPrice,
      paymentMethod,
      locale,
    };

    try {
      if (paymentMethod === "card") {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
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

      if (paymentMethod === "swish") {
        const response = await fetch("/api/swish/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });

        const data = (await response.json()) as SwishCreateResponse;

        if (!response.ok) {
          alert(data.error || "Swish payment could not be started.");
          setIsLoading(false);
          return;
        }

        const orderNumber = getSwishOrderNumber(data);

        if (!orderNumber) {
          console.error("Missing Swish order number:", data);
          alert("Swish payment started, but order number is missing.");
          setIsLoading(false);
          return;
        }

        clearCart();

        const pendingUrl = `/${locale}/checkout/swish-pending?order_number=${encodeURIComponent(
          orderNumber,
        )}`;

        const swishLaunchUrl = getSwishLaunchUrl(data);

        // Keep the token in the fragment so it is not sent in server requests.
        // The pending page opens Swish in the same tab, with a manual fallback.
        const token = swishLaunchUrl
          ? new URL(swishLaunchUrl).searchParams.get("token")
          : null;
        router.push(
          token
            ? `${pendingUrl}#swish_token=${encodeURIComponent(token)}`
            : pendingUrl,
        );
        return;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || t("orderError"));
        setIsLoading(false);
        return;
      }

      clearCart();

      const trackingId = data.orderNumber || data.orderId || clientOrderId;
      router.push(`/${locale}/order/${trackingId}`);
    } catch (error) {
      console.error("Checkout error:", error);
      alert(t("generalError"));
      setIsLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="glass-card mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-3xl font-black text-dark">
          {t.edit("emptyTitle")}
        </h1>

        <p className="mt-3 text-dark/60">{t.edit("emptyText")}</p>

        <Link
          href={getPublicPath(locale, "/menu")}
          className="btn-primary mt-6"
        >
          {t.edit("goToMenu")}
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto grid w-full max-w-xl gap-4"
    >
      <div className="glass-card w-full min-w-0 p-5 sm:p-6">
        <div>
          <h1 className="text-3xl font-black text-dark sm:text-4xl">
            {t.edit("title")}
          </h1>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-bold text-dark">
              {t.edit("name")}
              <EditableMessage
                namespace="pages.checkout"
                messageKey="namePlaceholder"
                pencilOnly
              />
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
              {t.edit("phone")}
              <EditableMessage
                namespace="pages.checkout"
                messageKey="phonePlaceholder"
                pencilOnly
              />
            </span>
            <input
              required
              onChange={(event) => setContactPhone(event.target.value)}
              name="customerPhone"
              className="input-field"
              placeholder={t("phonePlaceholder")}
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-dark">
              {t.edit("email")}
              <EditableMessage
                namespace="pages.checkout"
                messageKey="emailPlaceholder"
                pencilOnly
              />
            </span>
            <input
              onChange={(event) => setContactEmail(event.target.value)}
              name="customerEmail"
              type="email"
              required={loyaltyOptIn}
              className="input-field"
              placeholder={t("emailPlaceholder")}
            />
          </label>

          <details className="sm:col-span-2 text-sm">
            <summary className="cursor-pointer font-semibold">
              {t.edit("loyaltyTitle")}
            </summary>
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <p className="mt-1 text-sm leading-6 text-dark/60">
                  {t.edit("loyaltyText", {
                    min: 150,
                    count: loyaltyStatus?.stampsPerReward ?? 10,
                    value: rewardValue,
                  })}
                </p>

                {loyaltyStatus && (
                  <div className="mt-3 rounded-2xl bg-cream px-3 py-2 text-xs font-bold text-dark/55">
                    {t.edit("loyaltyProgress", {
                      stamps: loyaltyStatus.stamps,
                      total: loyaltyStatus.stampsPerReward,
                    })}
                  </div>
                )}

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-dark/10 bg-cream/70 p-3 text-sm leading-6 text-dark/70">
                  <input
                    type="checkbox"
                    checked={loyaltyOptIn}
                    onChange={(event) => setLoyaltyOptIn(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0"
                  />

                  <span>{t.edit("loyaltyOptIn")}</span>
                </label>

                {(loyaltyStatus?.rewardsAvailable ?? 0) > 0 && (
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-paprika/40 bg-paprika/5 p-3 text-sm font-bold leading-6 text-dark">
                    <input
                      type="checkbox"
                      checked={useLoyaltyReward}
                      onChange={(event) =>
                        setUseLoyaltyReward(event.target.checked)
                      }
                      className="mt-1 h-4 w-4 shrink-0"
                    />

                    <span>
                      {t.edit("loyaltyUseReward", { value: rewardValue })}
                    </span>
                  </label>
                )}
              </div>
            </div>
          </details>

          {deliveryOptions.length !== 1 && (
            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-dark">
                {t.edit("deliveryType")}
              </span>

              {deliveryOptions.length === 0 ? (
                <div className="rounded-3xl border border-paprika/20 bg-paprika/10 p-4 text-sm font-bold text-paprika">
                  {t.edit("fulfillmentUnavailable")}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {deliveryOptions.map((option) => {
                    const Icon = option.icon;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDeliveryType(option.value)}
                        className={`min-w-0 rounded-3xl border p-4 text-left transition ${
                          deliveryType === option.value
                            ? "border-paprika bg-paprika text-white"
                            : "border-dark/10 bg-white/70 text-dark hover:border-paprika/40"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <p className="mt-2 break-words font-black">
                          {option.title}
                        </p>
                        <p className="mt-1 text-xs opacity-70">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {deliveryType === "pickup" && (
            <FoodTruckLocation
              address={settings.pickup_address || null}
              coordinates={settings.pickup_coordinates || null}
              className="sm:col-span-2"
            />
          )}

          {deliveryType === "pickup" && (
            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-dark">
                {t.edit("pickupOptionTitle")}
              </span>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "eat_in" as const, label: t.edit("eatIn") },
                  { value: "takeaway" as const, label: t.edit("takeaway") },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPickupOption(option.value)}
                    className={`min-w-0 rounded-3xl border p-4 text-left font-black transition ${
                      pickupOption === option.value
                        ? "border-paprika bg-paprika text-white"
                        : "border-dark/10 bg-white/70 text-dark hover:border-paprika/40"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {deliveryType === "delivery" && settings.delivery_enabled && (
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-dark">
                {t.edit("address")}
                <EditableMessage
                  namespace="pages.checkout"
                  messageKey="addressPlaceholder"
                  pencilOnly
                />
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
              {t.edit("paymentMethod")}
            </span>

            {paymentOptions.length === 0 ? (
              <div className="rounded-3xl border border-paprika/20 bg-paprika/10 p-4 text-sm font-bold text-paprika">
                {t.edit("paymentsUnavailable")}
              </div>
            ) : paymentOptions.length === 1 ? (
              <p className="text-sm">{paymentOptions[0].title}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {paymentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentMethod(option.value)}
                    className={`min-w-0 rounded-3xl border px-3 py-4 text-left transition sm:p-4 ${
                      paymentMethod === option.value
                        ? "border-paprika bg-paprika text-white"
                        : "border-dark/10 bg-white/70 text-dark hover:border-paprika/40"
                    }`}
                  >
                    <p className="break-words font-black">{option.title}</p>
                  </button>
                ))}
              </div>
            )}

            <input type="hidden" name="paymentMethod" value={paymentMethod} />
          </div>

          {paymentMethod === "swish" && settings.swish_enabled && (
            <div className="sm:col-span-2 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-dark/60">
              {t.edit("swishInfo")}
            </div>
          )}

          <details className="sm:col-span-2 text-sm">
            <summary className="cursor-pointer font-semibold">
              {t.edit("comment")}
            </summary>
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-dark">
                {t.edit("comment")}
                <EditableMessage
                  namespace="pages.checkout"
                  messageKey="commentPlaceholder"
                  pencilOnly
                />
              </span>
              <textarea
                name="comment"
                className="input-field min-h-28 resize-none"
                placeholder={t("commentPlaceholder")}
              />
            </label>
          </details>
          <label className="sm:col-span-2 flex gap-3 rounded-3xl bg-white/70 p-4 text-sm leading-6 text-dark/60">
            <input required type="checkbox" className="mt-1 h-4 w-4 shrink-0" />

            <span>
              {t.edit("accept")}{" "}
              <Link
                href={`/${locale}/terms`}
                className="font-black text-paprika underline"
              >
                {t.edit("terms")}
              </Link>{" "}
              {t.edit("and")}{" "}
              <Link
                href={`/${locale}/privacy`}
                className="font-black text-paprika underline"
              >
                {t.edit("privacy")}
              </Link>
              .
            </span>
          </label>
        </div>
      </div>

      <aside className="glass-card h-fit w-full min-w-0 p-5 sm:p-6 ">
        <details>
          <summary className="cursor-pointer text-lg font-bold text-dark">
            {t.edit("orderTitle")}
          </summary>
          <div className="mt-4 space-y-4">
            {items.map((item) => (
              <div
                key={item.lineId}
                className="flex justify-between gap-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-black text-dark">{item.name}</p>
                  <p className="text-dark/60">{item.optionSummary}</p>
                  <p className="text-dark/50">x{item.quantity}</p>
                </div>

                <p className="shrink-0 font-black">
                  {pricing.lineTotals[item.lineId] / 100} kr
                </p>
              </div>
            ))}
          </div>
        </details>
        <div className="mt-4 border-t border-dark/10 pt-4">
          {pricing.discountAmount > 0 && (
            <p className="mb-3 text-sm font-bold text-paprika">
              {combo.edit("saving", {
                amount: `${pricing.discountAmount / 100} kr`,
              })}
            </p>
          )}
          {appliedLoyaltyDiscount > 0 && (
            <div className="mb-2 flex justify-between gap-4 text-sm text-dark/60">
              <span className="font-bold">
                {t.edit("loyaltyDiscountLabel")}
              </span>
              <span className="font-bold">−{appliedLoyaltyDiscount} kr</span>
            </div>
          )}

          <div className="flex justify-between gap-4 text-lg">
            <span className="font-black">{t.edit("total")}</span>
            <span className="font-black text-paprika">{totalToPay} kr</span>
          </div>

          <p className="mt-2 text-xs leading-5 text-dark/45">
            {t.edit("taxInfo")}
          </p>
        </div>

        <button
          type="submit"
          disabled={
            isLoading ||
            paymentOptions.length === 0 ||
            deliveryOptions.length === 0 ||
            !selectedPaymentMethodIsAvailable ||
            !selectedDeliveryTypeIsAvailable
          }
          className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? t.edit("processing")
            : paymentMethod === "card" || paymentMethod === "swish"
              ? t.edit("continuePayment")
              : t.edit("placeOrder")}
        </button>
      </aside>
    </form>
  );
}

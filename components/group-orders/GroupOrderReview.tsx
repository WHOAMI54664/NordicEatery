"use client";
import { useState } from "react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import type {
  PublicGroup,
  GroupCheckoutSettings,
} from "@/lib/group-orders/model";

export function GroupOrderReview({
  group,
  busy,
  act,
  settings,
}: {
  group: PublicGroup;
  busy: boolean;
  settings: GroupCheckoutSettings;
  act: (body: Record<string, unknown>) => Promise<void>;
}) {
  const t = useEditableTranslations("groupOrder");
  const receipt = useEditableTranslations("receipt");
  const [deliveryType, setDeliveryType] = useState(
    group.customer?.deliveryType ||
      (settings.pickup_enabled ? "pickup" : "delivery"),
  );
  const methods = (["card", "swish", "cash"] as const).filter(
    (method) => settings[`${method}_enabled`],
  );
  const canLock =
    group.members.every((member) => member.ready) &&
    group.members.some((member) => member.items.length);
  return (
    <form
      className="mt-6 space-y-4 border-t border-dark/10 pt-6"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void act({
          action: "lock",
          version: group.version,
          paymentMethod: form.get("paymentMethod"),
          customer: Object.fromEntries(form.entries()),
        });
      }}
    >
      <h3 className="text-xl font-bold">{t.edit("reviewTitle")}</h3>
      <label className="block text-sm font-semibold">
        {t.edit("contactName")}
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={group.customer?.name || group.hostName}
          autoComplete="name"
          className="input-field mt-2"
        />
      </label>
      <label className="block text-sm font-semibold">
        {t.edit("phone")}
        <input
          name="phone"
          type="tel"
          required
          maxLength={30}
          defaultValue={group.customer?.phone}
          autoComplete="tel"
          className="input-field mt-2"
        />
      </label>
      {group.individualCheckout ||
      !settings.delivery_enabled ||
      !settings.pickup_enabled ? (
        <input type="hidden" name="deliveryType" value={deliveryType} />
      ) : (
        <label className="block text-sm font-semibold">
          {t.edit("fulfillment")}
          <select
            name="deliveryType"
            value={deliveryType}
            onChange={(event) =>
              setDeliveryType(event.target.value as "pickup" | "delivery")
            }
            className="input-field mt-2"
          >
            <option value="pickup">{t("pickup")}</option>
            <option value="delivery">{t("delivery")}</option>
          </select>
        </label>
      )}
      {deliveryType === "delivery" && (
        <label className="block text-sm font-semibold">
          {t.edit("address")}
          <input
            name="address"
            required
            readOnly={group.individualCheckout}
            maxLength={300}
            defaultValue={group.customer?.address || ""}
            autoComplete="street-address"
            className="input-field mt-2"
          />
        </label>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">
          {receipt.edit("details")}
        </summary>
        <label className="mt-3 block font-semibold">
          {t.edit("email")}
          <input
            name="email"
            type="email"
            maxLength={254}
            defaultValue={group.customer?.email}
            autoComplete="email"
            className="input-field mt-2"
          />
        </label>
        <label className="mt-3 block font-semibold">
          {t.edit("comment")}
          <input
            name="comment"
            maxLength={500}
            defaultValue={group.customer?.comment}
            className="input-field mt-2"
          />
        </label>
      </details>
      {group.individualCheckout || methods.length <= 1 ? (
        <input
          type="hidden"
          name="paymentMethod"
          value={
            group.individualCheckout ? group.paymentMethod : methods[0] || ""
          }
        />
      ) : (
        <label className="block text-sm font-semibold">
          {t.edit("paymentMethod")}
          <select
            name="paymentMethod"
            defaultValue={group.paymentMethod}
            required
            className="input-field mt-2"
          >
            {methods.map((method) => (
              <option key={method} value={method}>
                {t(`methods.${method}`)}
              </option>
            ))}
          </select>
        </label>
      )}
      {!canLock && (
        <p className="text-sm text-dark/60">{t.edit("waitingReady")}</p>
      )}
      <button
        disabled={
          busy ||
          !canLock ||
          !methods.length ||
          !(settings.pickup_enabled || settings.delivery_enabled)
        }
        className="btn-primary w-full disabled:opacity-40"
      >
        {t.edit(group.individualCheckout ? "closeGroup" : "lockAndContinue")}
      </button>
    </form>
  );
}

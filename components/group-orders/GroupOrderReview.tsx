"use client";

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
      <h3 className="text-xl font-bold">{t.edit("deliveryDetails")}</h3>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <label className="block text-sm font-semibold">
          {t.edit("phone")}
          <input
            defaultValue={group.customer?.phone}
            name="phone"
            type="tel"
            required
            maxLength={30}
            autoComplete="tel"
            className="input-field mt-2"
          />
        </label>
        <label className="block text-sm font-semibold">
          {t.edit("email")}
          <input
            defaultValue={group.customer?.email}
            name="email"
            type="email"
            maxLength={254}
            autoComplete="email"
            className="input-field mt-2"
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        {t.edit("fulfillment")}
        {group.individualCheckout && (
          <input
            type="hidden"
            name="deliveryType"
            value={group.customer?.deliveryType}
          />
        )}
        <select
          name="deliveryType"
          disabled={group.individualCheckout}
          defaultValue={group.customer?.deliveryType}
          className="input-field mt-2"
        >
          {settings.pickup_enabled && (
            <option value="pickup">{t("pickup")}</option>
          )}
          {settings.delivery_enabled && (
            <option value="delivery">{t("delivery")}</option>
          )}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        {t.edit("address")}
        <input
          name="address"
          defaultValue={
            group.customer?.address === "Pickup" ? "" : group.customer?.address
          }
          readOnly={group.individualCheckout}
          maxLength={300}
          autoComplete="street-address"
          className="input-field mt-2"
        />
        <span className="mt-1 block text-xs font-normal text-dark/70">
          {t.edit("addressHint")}
        </span>
      </label>
      <label className="block text-sm font-semibold">
        {t.edit("comment")}
        <input name="comment" maxLength={500} className="input-field mt-2" />
      </label>
      <p className="text-sm leading-6 text-dark/70">
        {t.edit(
          group.individualCheckout
            ? "closeGroupExplanation"
            : "lockExplanation",
        )}
      </p>
      <label className="block text-sm font-semibold">
        {t.edit("paymentMethod")}
        {group.individualCheckout && (
          <input
            type="hidden"
            name="paymentMethod"
            value={group.paymentMethod}
          />
        )}
        <select
          name="paymentMethod"
          disabled={group.individualCheckout}
          defaultValue={group.paymentMethod}
          className="input-field mt-2"
          required
        >
          {(["card", "swish", "cash"] as const)
            .filter((method) => settings[`${method}_enabled`])
            .map((method) => (
              <option key={method} value={method}>
                {t(`methods.${method}`)}
              </option>
            ))}
        </select>
      </label>
      {!canLock && (
        <p className="text-sm font-semibold text-paprika">
          {t.edit("waitingReady")}
        </p>
      )}
      <button
        disabled={
          busy ||
          !canLock ||
          !(
            settings.card_enabled ||
            settings.swish_enabled ||
            settings.cash_enabled
          ) ||
          !(settings.pickup_enabled || settings.delivery_enabled)
        }
        className="w-full rounded-xl bg-dark px-4 py-4 font-bold text-white disabled:opacity-40"
      >
        {t.edit(group.individualCheckout ? "closeGroup" : "lockAndContinue")}
      </button>
    </form>
  );
}

"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("groupOrder");
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
      <h3 className="text-xl font-bold">{t("deliveryDetails")}</h3>
      <label className="block text-sm font-semibold">
        {t("contactName")}
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={group.hostName}
          autoComplete="name"
          className="input-field mt-2"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <label className="block text-sm font-semibold">
          {t("phone")}
          <input
            name="phone"
            type="tel"
            required
            maxLength={30}
            autoComplete="tel"
            className="input-field mt-2"
          />
        </label>
        <label className="block text-sm font-semibold">
          {t("email")}
          <input
            name="email"
            type="email"
            maxLength={254}
            autoComplete="email"
            className="input-field mt-2"
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        {t("fulfillment")}
        <select name="deliveryType" className="input-field mt-2">
          {settings.pickup_enabled && (
            <option value="pickup">{t("pickup")}</option>
          )}
          {settings.delivery_enabled && (
            <option value="delivery">{t("delivery")}</option>
          )}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        {t("address")}
        <input
          name="address"
          maxLength={300}
          autoComplete="street-address"
          className="input-field mt-2"
        />
        <span className="mt-1 block text-xs font-normal text-dark/70">
          {t("addressHint")}
        </span>
      </label>
      <label className="block text-sm font-semibold">
        {t("comment")}
        <input name="comment" maxLength={500} className="input-field mt-2" />
      </label>
      <p className="text-sm leading-6 text-dark/70">{t("lockExplanation")}</p>
      <label className="block text-sm font-semibold">
        {t("paymentMethod")}
        <select name="paymentMethod" className="input-field mt-2" required>
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
          {t("waitingReady")}
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
        {t("lockAndContinue")}
      </button>
    </form>
  );
}

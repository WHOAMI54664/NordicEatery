"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import { ArrowRight, CreditCard, Link2, Users } from "lucide-react";
import { useGroupReservation } from "./useGroupReservation";
import { GroupSlotWaitlist } from "./GroupSlotWaitlist";
import type {
  GroupCheckoutSettings,
  PaymentMode,
} from "@/lib/group-orders/model";

export function GroupOrderStart({
  locale,
  enabled,
  settings,
}: {
  locale: string;
  enabled: boolean;
  settings: GroupCheckoutSettings;
}) {
  const t = useEditableTranslations("groupOrder");
  const router = useRouter();
  const seats = useGroupReservation(enabled);
  const { availability, failed, refresh, pickupAt, reservation, holding } =
    seats;
  const [mode, setMode] = useState<PaymentMode>("host");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || holding) return;
    const form = new FormData(event.currentTarget);
    const minutes = Number(form.get("deadline"));
    const limit = String(form.get("limit") || "");
    setBusy(true);
    setError("");
    try {
      const held = await seats.reserve();
      if (!held) return;
      const response = await fetch("/api/group-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          name: form.get("name"),
          memberName: form.get("memberName"),
          mode,
          locale,
          pickupAt: held.pickupAt,
          participantCount: held.participantCount,
          reservationId: held.id,
          reservationVersion: held.version,
          ...(mode === "split"
            ? {
                paymentMethod: form.get("paymentMethod"),
                customer: {
                  name: form.get("memberName"),
                  phone: form.get("contactPhone"),
                  email: form.get("contactEmail"),
                  deliveryType: form.get("deliveryType"),
                  address: form.get("address") || "",
                  comment: "",
                },
              }
            : {}),
          deadline: minutes
            ? new Date(Date.now() + minutes * 60000).toISOString()
            : null,
          spendLimit: limit ? Math.round(Number(limit) * 100) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        refresh();
        throw new Error(
          t.has(`errors.${data.error}`)
            ? t(`errors.${data.error}`)
            : t("errors.unavailable"),
        );
      }
      router.push(`/${locale}/group-order/${data.id}`);
    } catch (error) {
      setError(
        error instanceof Error && error.name !== "TimeoutError"
          ? error.message
          : t("errors.unavailable"),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 inline-flex rounded-2xl bg-dark p-4 text-white">
        <Users size={30} />
      </div>
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
        {t.edit("startTitle")}
      </h1>
      <p className="mt-4 text-lg leading-8 text-dark/70">
        {t.edit("startDescription")}
      </p>
      <div className="my-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-dark/75">
        <span className="flex items-center gap-2">
          <Link2 size={18} />
          {t.edit("stepInvite")}
        </span>
        <span className="flex items-center gap-2">
          <Users size={18} />
          {t.edit("stepChoose")}
        </span>
        <span className="flex items-center gap-2">
          <CreditCard size={18} />
          {t.edit("stepPay")}
        </span>
      </div>
      {!enabled ? (
        <p role="status" className="rounded-2xl bg-white p-6">
          {t.edit("errors.unavailable")}
        </p>
      ) : failed && !availability ? (
        <p role="status">{t.edit("errors.unavailable")}</p>
      ) : !availability ? (
        <p role="status">{t.edit("loadingSlots")}</p>
      ) : !availability.slots.some((slot) => slot.available) && !pickupAt ? (
        <GroupSlotWaitlist locale={locale} />
      ) : (
        <form
          onSubmit={submit}
          className="space-y-6 rounded-3xl border border-dark/10 bg-white p-5 shadow-sm sm:p-8"
        >
          <div>
            <label className="block space-y-2 font-semibold">
              <span>{t.edit("participantCount")}</span>
              <input
                type="number"
                name="participantCount"
                min={1}
                max={seats.maximum}
                step={1}
                required
                disabled={busy || holding}
                value={seats.count}
                onChange={(event) => seats.setCount(event.target.value)}
                onBlur={() => {
                  if (seats.count && pickupAt) void seats.reserve();
                }}
                className="input-field"
                aria-describedby="group-seat-hint"
              />
            </label>
            <p id="group-seat-hint" className="mt-2 text-sm text-dark/70">
              {t.edit("participantHint", { count: seats.maximum })}
            </p>
            <p className="mt-2 text-sm text-dark/70">
              {t.edit("reservationExplanation")}
            </p>
            <div aria-live="polite" className="mt-3 text-sm">
              {holding ? (
                t.edit("reservingSeats")
              ) : reservation ? (
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900">
                  <p>
                    {t.edit("reservationHeld", {
                      count: reservation.participantCount,
                      time: new Intl.DateTimeFormat(locale, {
                        timeZone: "Europe/Stockholm",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(reservation.expiresAt)),
                    })}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void seats.release()}
                    className="mt-2 underline"
                  >
                    {t.edit("releaseReservation")}
                  </button>
                </div>
              ) : null}
            </div>
            {seats.error && (
              <p
                role="alert"
                className="mt-2 text-sm font-semibold text-paprika"
              >
                {t.has(`errors.${seats.error}`)
                  ? t(`errors.${seats.error}`)
                  : t("errors.unavailable")}
              </p>
            )}
          </div>
          <fieldset disabled={busy || holding}>
            <legend className="mb-3 text-lg font-bold">
              {t.edit("pickupSlot")}
            </legend>
            <p className="mb-3 text-sm text-dark/70">
              {t.edit("slotExplanation")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {availability.slots.map((slot) => (
                <label
                  key={slot.pickupAt}
                  className={`rounded-2xl border-2 p-4 ${!slot.available ? "opacity-40" : "cursor-pointer"} ${pickupAt === slot.pickupAt ? "border-dark" : "border-dark/10"}`}
                >
                  <input
                    type="radio"
                    name="pickupAt"
                    required
                    value={slot.pickupAt}
                    checked={pickupAt === slot.pickupAt && slot.available}
                    disabled={!slot.available}
                    onChange={() => seats.chooseSlot(slot.pickupAt)}
                    className="mr-3 accent-black"
                  />
                  <span className="font-bold">{slot.time}</span>
                  <span className="mt-1 block text-sm">
                    {t.edit("slotSeats", { count: slot.remaining ?? 0 })}
                  </span>
                  {!slot.available && (
                    <span className="mt-1 block text-sm">
                      {t.edit("slotTaken")}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">
              <span>{t.edit("yourName")}</span>
              <input
                name="memberName"
                autoComplete="given-name"
                required
                maxLength={60}
                className="input-field"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              <span>{t.edit("orderName")}</span>
              <input
                name="name"
                required
                maxLength={80}
                placeholder={t("namePlaceholder")}
                className="input-field"
              />
            </label>
          </div>
          <fieldset>
            <legend className="mb-3 text-lg font-bold">
              {t.edit("whoPays")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["host", "split"] as const).map((value) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition ${mode === value ? "border-dark bg-dark/[0.03]" : "border-dark/10"}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="mode"
                      value={value}
                      checked={mode === value}
                      onChange={() => setMode(value)}
                      className="accent-black"
                    />
                    <span className="font-bold">{t.edit(`${value}Pays`)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-dark/70">
                    {t.edit(`${value}Description`)}
                  </p>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">
              <span>{t.edit("deadline")}</span>
              <select name="deadline" defaultValue="30" className="input-field">
                <option value="0">{t("noDeadline")}</option>
                {[15, 30, 60, 120].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {t("minutes", { count: minutes })}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold">
              <span>{t.edit("spendLimit")}</span>
              <input
                type="number"
                name="limit"
                min={3}
                max={10000}
                step="0.01"
                placeholder={t("noLimit")}
                className="input-field"
              />
            </label>
          </div>
          {mode === "split" && (
            <fieldset className="space-y-4">
              <legend className="mb-2 text-lg font-bold">
                {t.edit("deliveryDetails")}
              </legend>
              <p className="text-sm leading-6 text-dark/70">
                {t.edit("individualSetup")}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  {t.edit("phone")}
                  <input
                    name="contactPhone"
                    type="tel"
                    autoComplete="tel"
                    required
                    maxLength={30}
                    className="input-field mt-2"
                  />
                </label>
                <label className="text-sm font-semibold">
                  {t.edit("email")}
                  <input
                    name="contactEmail"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    className="input-field mt-2"
                  />
                </label>
                <label className="text-sm font-semibold">
                  {t.edit("fulfillment")}
                  <select
                    name="deliveryType"
                    required
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
                <label className="text-sm font-semibold">
                  {t.edit("paymentMethod")}
                  <select
                    name="paymentMethod"
                    required
                    className="input-field mt-2"
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
              </div>
              <label className="block text-sm font-semibold">
                {t.edit("address")}
                <input
                  name="address"
                  autoComplete="street-address"
                  maxLength={300}
                  className="input-field mt-2"
                />
                <span className="mt-1 block text-xs font-normal">
                  {t.edit("addressHint")}
                </span>
              </label>
            </fieldset>
          )}
          <p className="text-sm leading-6 text-dark/70">
            {t.edit("linkPrivacy")}
          </p>
          {error && (
            <p role="alert" className="text-sm font-semibold text-paprika">
              {error}
            </p>
          )}
          <button
            disabled={
              busy ||
              holding ||
              seats.maximum === 0 ||
              !availability.slots.some(
                (slot) => slot.available && slot.pickupAt === pickupAt,
              )
            }
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-dark px-6 py-4 font-bold text-white disabled:opacity-50"
          >
            {busy ? t.edit("saving") : t.edit("createAndInvite")}
            <ArrowRight size={20} />
          </button>
        </form>
      )}
    </div>
  );
}

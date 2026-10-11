"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import { ArrowRight, Users } from "lucide-react";
import { useGroupAvailability } from "./useGroupAvailability";
import { GroupSlotWaitlist } from "./GroupSlotWaitlist";
import { reservableSeats } from "@/lib/group-orders/slots";
import type { PaymentMode } from "@/lib/group-orders/model";

export function GroupOrderStart({
  locale,
  enabled,
}: {
  locale: string;
  enabled: boolean;
}) {
  const t = useEditableTranslations("groupOrder");
  const router = useRouter();
  const { availability, failed, refresh } = useGroupAvailability(enabled);
  const [pickupAt, setPickupAt] = useState("");
  const [count, setCount] = useState("1");
  const [mode, setMode] = useState<PaymentMode>("host");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (availability?.createdGroupId) {
      router.replace(`/${locale}/group-order/${availability.createdGroupId}`);
    }
  }, [availability?.createdGroupId, locale, router]);

  useEffect(() => {
    if (!availability) return;
    const availableSlots = availability.slots.filter((slot) => slot.available);
    if (!availableSlots.length) {
      setPickupAt("");
      return;
    }
    const current = availability.slots.find(
      (slot) => slot.pickupAt === pickupAt,
    );
    if (!current?.available) setPickupAt(availableSlots[0].pickupAt);
  }, [availability, pickupAt]);

  const selectedSlot = availability?.slots.find(
    (slot) => slot.pickupAt === pickupAt,
  );
  const maximum = selectedSlot
    ? reservableSeats(selectedSlot, availability?.reservation)
    : 0;

  useEffect(() => {
    const selectedCount = Number(count);
    if (maximum > 0 && selectedCount > maximum) setCount(String(maximum));
  }, [count, maximum]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/group-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          name: "SSAB",
          memberName: form.get("memberName"),
          mode,
          locale,
          pickupAt,
          participantCount: Number(form.get("participantCount")),
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
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name !== "TimeoutError"
          ? failure.message
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
      {!enabled ? (
        <p role="status" className="mt-6 rounded-2xl bg-white p-6">
          {t.edit("errors.unavailable")}
        </p>
      ) : failed && !availability ? (
        <p role="status" className="mt-6">
          {t.edit("errors.unavailable")}
        </p>
      ) : !availability ? (
        <p role="status" className="mt-6">
          {t.edit("loadingSlots")}
        </p>
      ) : !availability.slots.some((slot) => slot.available) ? (
        <div className="mt-6">
          <GroupSlotWaitlist locale={locale} />
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="mt-6 space-y-6 rounded-3xl border border-dark/10 bg-white p-5 shadow-sm sm:p-8"
        >
          <label className="block space-y-2 font-semibold">
            <span>{t.edit("participantCount")}</span>
            <input
              type="number"
              name="participantCount"
              min={1}
              max={maximum}
              step={1}
              required
              disabled={busy || maximum < 1}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className="input-field"
            />
          </label>

          <fieldset disabled={busy}>
            <legend className="mb-3 font-semibold">
              {t.edit("pickupSlot")}
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {availability.slots.map((slot) => (
                <label
                  key={slot.pickupAt}
                  className={`rounded-2xl border-2 p-4 ${
                    slot.available
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-40"
                  } ${pickupAt === slot.pickupAt ? "border-dark" : "border-dark/10"}`}
                >
                  <input
                    type="radio"
                    name="pickupAt"
                    required
                    value={slot.pickupAt}
                    checked={pickupAt === slot.pickupAt && slot.available}
                    disabled={!slot.available}
                    onChange={() => setPickupAt(slot.pickupAt)}
                    className="mr-3 accent-black"
                  />
                  <span className="font-bold">{slot.time}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-2 text-sm font-semibold">
            <span>{t.edit("yourName")}</span>
            <input
              name="memberName"
              autoComplete="given-name"
              required
              maxLength={60}
              className="input-field"
            />
          </label>

          <fieldset>
            <legend className="mb-3 font-semibold">{t.edit("whoPays")}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["host", "split"] as const).map((value) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition ${
                    mode === value
                      ? "border-dark bg-dark/[0.03]"
                      : "border-dark/10"
                  }`}
                >
                  <span className="flex items-center gap-3 font-bold">
                    <input
                      type="radio"
                      name="mode"
                      value={value}
                      checked={mode === value}
                      onChange={() => setMode(value)}
                      className="accent-black"
                    />
                    {t.edit(`${value}Pays`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm font-semibold text-paprika">
              {error}
            </p>
          )}
          <button
            disabled={busy || maximum < 1 || Number(count) < 1}
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

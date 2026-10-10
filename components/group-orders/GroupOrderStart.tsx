"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, CreditCard, Link2, Users } from "lucide-react";
import type { PaymentMode } from "@/lib/group-orders/model";

export function GroupOrderStart({
  locale,
  enabled,
}: {
  locale: string;
  enabled: boolean;
}) {
  const t = useTranslations("groupOrder");
  const router = useRouter();
  const [mode, setMode] = useState<PaymentMode>("host");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const minutes = Number(form.get("deadline"));
    const limit = String(form.get("limit") || "");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/group-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          name: form.get("name"),
          memberName: form.get("memberName"),
          mode,
          locale,
          deadline: minutes
            ? new Date(Date.now() + minutes * 60000).toISOString()
            : null,
          spendLimit: limit ? Math.round(Number(limit) * 100) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          t.has(`errors.${data.error}`)
            ? t(`errors.${data.error}`)
            : t("errors.unavailable"),
        );
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
      <p className="text-sm font-bold uppercase tracking-widest text-paprika">
        Nordic Eatery
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
        {t("startTitle")}
      </h1>
      <p className="mt-4 text-lg leading-8 text-dark/70">
        {t("startDescription")}
      </p>
      <div className="my-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-dark/75">
        <span className="flex items-center gap-2">
          <Link2 size={18} />
          {t("stepInvite")}
        </span>
        <span className="flex items-center gap-2">
          <Users size={18} />
          {t("stepChoose")}
        </span>
        <span className="flex items-center gap-2">
          <CreditCard size={18} />
          {t("stepPay")}
        </span>
      </div>
      {!enabled ? (
        <p role="status" className="rounded-2xl bg-white p-6">
          {t("errors.unavailable")}
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-6 rounded-3xl border border-dark/10 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">
              <span>{t("yourName")}</span>
              <input
                name="memberName"
                autoComplete="given-name"
                required
                maxLength={60}
                className="input-field"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              <span>{t("orderName")}</span>
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
            <legend className="mb-3 text-lg font-bold">{t("whoPays")}</legend>
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
                    <span className="font-bold">{t(`${value}Pays`)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-dark/70">
                    {t(`${value}Description`)}
                  </p>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">
              <span>{t("deadline")}</span>
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
              <span>{t("spendLimit")}</span>
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
          <p className="text-sm leading-6 text-dark/70">{t("linkPrivacy")}</p>
          {error && (
            <p role="alert" className="text-sm font-semibold text-paprika">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-dark px-6 py-4 font-bold text-white disabled:opacity-50"
          >
            {busy ? t("saving") : t("createAndInvite")}
            <ArrowRight size={20} />
          </button>
        </form>
      )}
    </div>
  );
}

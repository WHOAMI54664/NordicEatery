"use client";
import { useState } from "react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";

export function GroupSlotWaitlist({ locale }: { locale: string }) {
  const t = useEditableTranslations("groupOrder");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = new FormData(event.currentTarget).get("email");
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/group-order-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ email, locale }),
      });
      if (!response.ok) throw new Error("unavailable");
      setSent(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border border-dark/10 bg-white p-5 sm:p-6">
      <h2 className="text-xl font-black">{t.edit("slotsClosed")}</h2>
      <p className="mt-2 text-sm leading-6 text-dark/70">
        {t.edit("slotsClosedDescription")}
      </p>
      {sent ? (
        <p role="status" className="mt-4 font-semibold">
          {t.edit("notificationSaved")}
        </p>
      ) : (
        <form
          onSubmit={subscribe}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm font-semibold">
            {t.edit("notificationEmail")}
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              className="input-field mt-2"
            />
          </label>
          <button
            disabled={busy}
            className="rounded-xl bg-dark px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {busy ? t.edit("saving") : t.edit("notifyMe")}
          </button>
        </form>
      )}
      {failed && (
        <p role="alert" className="mt-3 text-sm text-paprika">
          {t.edit("notificationFailed")}
        </p>
      )}
    </section>
  );
}

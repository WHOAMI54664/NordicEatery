"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/browser";
import { normalizeEmail } from "@/lib/notifications/opening-email";

export function ZReportEmailField({
  initialEmail,
}: {
  initialEmail: string | null;
}) {
  const t = useTranslations("admin.businessSettingsForm");
  const db = useMemo(() => createClient(), []);
  const [email, setEmail] = useState(initialEmail || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save() {
    const value = email.trim() ? normalizeEmail(email) : null;
    setError("");
    setSaved(false);
    if (email.trim() && !value) {
      setError(t("messages.invalidReportEmail"));
      return;
    }
    setBusy(true);
    try {
      const { error: failure } = await db
        .from("z_report_settings")
        .upsert({ id: 1, email: value })
        .select("id")
        .abortSignal(AbortSignal.timeout(10000))
        .single();
      if (failure) throw new Error("Could not save report recipient");
      setEmail(value || "");
      setSaved(true);
    } catch {
      setError(t("messages.reportEmailFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-[0.14em] text-[#A39388]">
        {t("fields.zReportEmail")}
        <input
          type="email"
          value={email}
          disabled={busy}
          onChange={(e) => {
            setEmail(e.target.value);
            setSaved(false);
          }}
          className="mt-2 w-full rounded-2xl border border-[#EADDCF] bg-white/80 px-4 py-3 text-sm font-bold normal-case tracking-normal text-[#25120F] shadow-inner outline-none focus:border-[#E51B23]/40"
        />
      </label>
      <p className="mt-2 text-xs leading-5 text-[#7B6A61]">
        {t("contact.zReportDescription")}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="mt-2 rounded-xl border border-[#E51B23]/20 bg-white px-3 py-2 text-sm font-bold text-[#C7192E] disabled:opacity-50"
      >
        {busy ? t("buttons.saving") : t("buttons.saveReportEmail")}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="mt-2 text-xs text-emerald-700">
          {t("messages.success")}
        </p>
      ) : null}
    </div>
  );
}

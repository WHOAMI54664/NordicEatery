"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, Plus, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  MAX_GROUP_SLOTS,
  parseScheduleSlots,
  type GroupSchedule,
  type GroupScheduleSlot,
} from "@/lib/group-orders/schedule";

type SlotRow = GroupScheduleSlot & { key: string };

export function GroupSlotSettings() {
  const t = useTranslations("admin.groupSlots");
  const [schedule, setSchedule] = useState<GroupSchedule | null>(null);
  const [rows, setRows] = useState<SlotRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const request = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (inFlight.current && !request.current?.signal.aborted) return;
    inFlight.current = true;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/admin/group-slots", {
        cache: "no-store",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15000),
        ]),
      });
      if (!response.ok) throw new Error("unavailable");
      const next: GroupSchedule = await response.json();
      if (controller.signal.aborted) return;
      setSchedule(next);
      setRows(next.slots.map((s) => ({ ...s, key: crypto.randomUUID() })));
      setDirty(false);
    } catch {
      if (!controller.signal.aborted) setError("unavailable");
    } finally {
      if (request.current === controller) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  function changed(next: SlotRow[]) {
    setRows(next);
    setDirty(true);
    setSaved(false);
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!schedule || inFlight.current) return;
    const slots = parseScheduleSlots(rows);
    if (!slots) {
      setError("invalidSchedule");
      return;
    }
    inFlight.current = true;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/admin/group-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15000),
        ]),
        body: JSON.stringify({ version: schedule.version, slots }),
      });
      const next = await response.json();
      if (!response.ok) {
        setError(
          ["scheduleConflict", "invalidSchedule", "forbidden"].includes(
            next.error,
          )
            ? next.error
            : "unavailable",
        );
        return;
      }
      setSchedule(next);
      setRows(
        next.slots.map((s: GroupScheduleSlot) => ({
          ...s,
          key: crypto.randomUUID(),
        })),
      );
      setDirty(false);
      setSaved(true);
    } catch {
      if (!controller.signal.aborted) setError("unavailable");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      id="group-slots"
      className="scroll-mt-24 rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6] p-5 lg:p-6"
      aria-labelledby="group-slots-title"
    >
      <div className="mb-5 flex items-start gap-4">
        <Clock className="mt-1 shrink-0 text-paprika" aria-hidden="true" />
        <div>
          <h2 id="group-slots-title" className="text-xl font-black">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-dark/70">
            {t("description")}
          </p>
          <p className="mt-2 text-sm font-semibold">{t("preserveBookings")}</p>
        </div>
      </div>
      {!schedule && busy && <p role="status">{t("loading")}</p>}
      {schedule && (
        <form onSubmit={save}>
          <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
            <legend className="sr-only">{t("title")}</legend>
            {rows.length === 0 && <p className="py-3 text-sm">{t("empty")}</p>}
            {rows.map((slot, index) => (
              <div
                key={slot.key}
                className="flex flex-wrap items-end gap-3 rounded-2xl border border-dark/10 bg-white p-3 sm:gap-5 sm:p-4"
              >
                <label className="min-w-32 flex-1 text-sm font-semibold">
                  {t("time", { index: index + 1 })}
                  <input
                    type="time"
                    step="60"
                    required
                    value={slot.time}
                    onChange={(e) =>
                      changed(
                        rows.map((s) =>
                          s.key === slot.key
                            ? { ...s, time: e.target.value }
                            : s,
                        ),
                      )
                    }
                    className="mt-2 block h-12 w-full rounded-xl border border-dark/20 bg-white px-3 text-base"
                  />
                </label>
                <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={(e) =>
                      changed(
                        rows.map((s) =>
                          s.key === slot.key
                            ? { ...s, enabled: e.target.checked }
                            : s,
                        ),
                      )
                    }
                    className="h-5 w-5 accent-paprika"
                  />
                  {t("enabled")}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    changed(rows.filter((s) => s.key !== slot.key))
                  }
                  aria-label={t("removeSlot", { index: index + 1 })}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-dark/10 text-paprika hover:bg-red-50"
                >
                  <Trash2 size={20} aria-hidden="true" />
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={rows.length >= MAX_GROUP_SLOTS}
                onClick={() =>
                  changed([
                    ...rows,
                    { key: crypto.randomUUID(), time: "", enabled: true },
                  ])
                }
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-dark/20 px-4 font-bold disabled:opacity-50"
              >
                <Plus size={20} aria-hidden="true" />
                {t("add")}
              </button>
              <button
                type="submit"
                disabled={!dirty}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-paprika px-5 font-bold text-white disabled:opacity-50"
              >
                <Save size={20} aria-hidden="true" />
                {busy ? t("saving") : t("save")}
              </button>
            </div>
            {!rows.some((slot) => slot.enabled) && rows.length > 0 && (
              <p className="text-sm text-dark/70">{t("empty")}</p>
            )}
          </fieldset>
        </form>
      )}
      {saved && (
        <p role="status" className="mt-4 font-semibold text-green-800">
          {t("saved")}
        </p>
      )}
      {error && (
        <div className="mt-4 space-y-3">
          <p role="alert" className="text-sm font-semibold text-paprika">
            {t(error)}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="rounded-xl border border-dark/20 px-4 py-3 text-sm font-bold"
          >
            {t("reload")}
          </button>
        </div>
      )}
    </section>
  );
}

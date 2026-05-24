"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
    Clock,
    Loader2,
    Lock,
    Power,
    ShieldCheck,
    Unlock,
} from "lucide-react";

type ShiftState = {
    isOpen: boolean;
    openedAt: string | null;
    closedAt: string | null;
    updatedAt: string | null;
};

function formatStockholmTime(value: string | null) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

export function ShiftControlCard() {
    const t = useTranslations("admin.shift");

    const [shift, setShift] = useState<ShiftState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function fetchShift() {
        try {
            const response = await fetch("/api/admin/shift", {
                method: "GET",
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok) {
                setErrorMessage(data.error || t("errors.load"));
                return;
            }

            setShift(data.shift);
            setErrorMessage("");
        } catch (error) {
            console.error("Shift fetch error:", error);
            setErrorMessage(t("errors.load"));
        } finally {
            setIsLoading(false);
        }
    }

    async function updateShift(action: "open" | "close") {
        if (isUpdating) return;

        setIsUpdating(true);
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/shift", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ action }),
            });

            const data = await response.json();

            if (!response.ok) {
                setErrorMessage(data.error || t("errors.update"));
                return;
            }

            setShift(data.shift);
        } catch (error) {
            console.error("Shift update error:", error);
            setErrorMessage(t("errors.update"));
        } finally {
            setIsUpdating(false);
        }
    }

    useEffect(() => {
        fetchShift();
    }, []);

    const isOpen = Boolean(shift?.isOpen);

    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-4 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl sm:p-5 lg:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.14),transparent_36%)]" />

            <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                    <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border sm:h-16 sm:w-16 ${
                            isOpen
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                                : "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]"
                        }`}
                    >
                        {isOpen ? (
                            <Unlock className="h-6 w-6" />
                        ) : (
                            <Lock className="h-6 w-6" />
                        )}
                    </div>

                    <div className="min-w-0 max-w-4xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A39388]">
                                {t("eyebrow")}
                            </p>

                            <span
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black ${
                                    isOpen
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                                        : "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]"
                                }`}
                            >
                <ShieldCheck className="h-3.5 w-3.5" />
                                {isLoading ? t("checking") : isOpen ? t("open") : t("closed")}
              </span>
                        </div>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.045em] text-[#25120F] sm:text-3xl">
                            {isLoading
                                ? t("loading")
                                : isOpen
                                    ? t("titleOpen")
                                    : t("titleClosed")}
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#7B6A61]">
                            {isOpen ? t("descriptionOpen") : t("descriptionClosed")}
                        </p>

                        <div className="mt-4 grid gap-2 text-xs font-bold text-[#7B6A61] md:grid-cols-2">
                            <div className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-3 py-2">
                                <Clock className="h-3.5 w-3.5 shrink-0 text-[#C7192E]" />
                                <span className="shrink-0 text-[#25120F]">{t("opened")}:</span>
                                <span className="truncate">
                  {formatStockholmTime(shift?.openedAt || null)}
                </span>
                            </div>

                            <div className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-3 py-2">
                                <Clock className="h-3.5 w-3.5 shrink-0 text-[#7B6A61]" />
                                <span className="shrink-0 text-[#25120F]">{t("closedAt")}:</span>
                                <span className="truncate">
                  {formatStockholmTime(shift?.closedAt || null)}
                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex w-full lg:w-[230px]">
                    <button
                        type="button"
                        disabled={isLoading || isUpdating}
                        onClick={() => updateShift(isOpen ? "close" : "open")}
                        className={`inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isOpen
                                ? "bg-[#2A1712] hover:opacity-90"
                                : "bg-[#E51B23] shadow-[#E51B23]/15 hover:bg-[#C7192E]"
                        }`}
                    >
                        {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Power className="h-4 w-4" />
                        )}

                        {isOpen ? t("closeButton") : t("openButton")}
                    </button>
                </div>
            </div>

            {errorMessage ? (
                <div className="relative mt-4 rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 p-3 text-sm font-bold text-[#C7192E]">
                    {errorMessage}
                </div>
            ) : null}
        </section>
    );
}
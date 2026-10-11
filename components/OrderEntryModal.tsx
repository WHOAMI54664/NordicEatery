"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag, Users, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { getPublicPath } from "@/i18n/paths";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import { useGroupAvailability } from "@/components/group-orders/useGroupAvailability";

export function OrderEntryModal({
  locale,
  isShiftOpen,
  openedAt,
  groupsEnabled,
}: {
  locale: string;
  isShiftOpen: boolean;
  openedAt: string | null;
  groupsEnabled: boolean;
}) {
  const t = useEditableTranslations("orderEntry");
  const group = useEditableTranslations("groupOrder");
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const storageKey = `nordic-order-entry:${openedAt || "open"}`;
  const { availability, failed } = useGroupAvailability(open && groupsEnabled);

  useEffect(() => {
    if (!isShiftOpen) {
      setOpen(false);
      return;
    }
    try {
      setOpen(sessionStorage.getItem(storageKey) !== "dismissed");
    } catch {
      setOpen(true);
    }
  }, [isShiftOpen, storageKey]);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      focused?.focus();
    };
  }, [open]);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(storageKey, "dismissed");
    } catch {
      // Browsing and ordering must still work when browser storage is blocked.
    }
  }

  if (!open) return null;
  const availableSlots = availability?.slots.filter((slot) => slot.available);
  const exhausted = availableSlots?.length === 0;
  const card =
    "group flex min-w-0 flex-col break-words [hyphens:auto] rounded-2xl border border-dark/15 bg-white p-3 text-left sm:rounded-3xl transition-colors hover:border-paprika hover:bg-paprika/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paprika sm:p-7";

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto rounded-[2rem] border-0 bg-cream p-0 text-dark shadow-2xl backdrop:bg-dark/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-3 sm:p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="pt-1 text-xl font-black tracking-tight sm:text-3xl"
          >
            {t.edit("title")}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-dark/5 hover:bg-dark/10"
          >
            <X size={22} />
          </button>
        </div>
        <div
          className={`grid gap-2 sm:gap-4 ${groupsEnabled ? "grid-cols-2" : ""}`}
        >
          <Link
            href={getPublicPath(locale, "/menu")}
            onClick={close}
            className={card}
            lang={locale}
          >
            <ShoppingBag
              className="mb-4 h-7 w-7 text-paprika"
              aria-hidden="true"
            />
            <h3 className="text-base font-black sm:text-xl">
              {t.edit("regularTitle")}
            </h3>
            <p className="mt-2 text-xs text-dark/65 sm:text-sm">
              {t.edit("regularLocation")}
            </p>
            <p className="mt-4 text-xl font-black sm:mt-5 sm:text-2xl">
              {t.edit("regularHours")}
            </p>
            <p className="mt-1 text-xs font-medium text-dark/65 sm:text-sm">
              {t.edit("regularDays")}
            </p>
            <p className="mb-5 mt-4 text-sm leading-6 sm:mb-6 sm:text-base sm:leading-7">
              {t.edit("regularPickup")}
            </p>
            <span className="mt-auto flex items-center justify-between gap-2 text-sm font-bold text-paprika sm:gap-3 sm:text-base">
              {t.edit("regularAction")}
              <ArrowRight size={20} className="shrink-0" aria-hidden="true" />
            </span>
          </Link>
          {groupsEnabled && (
            <Link
              href={`/${locale}/group-order`}
              onClick={close}
              className={card}
              lang={locale}
            >
              <Users className="mb-4 h-7 w-7 text-paprika" aria-hidden="true" />
              <h3 className="text-base font-black sm:text-xl">
                {t.edit("groupTitle")}
              </h3>
              <p className="mt-2 text-xs text-dark/65 sm:text-sm">
                {t.edit("groupLocation")}
              </p>
              <div className="mt-5" role="status">
                {failed ? (
                  <p className="text-xs text-dark/65 sm:text-sm">
                    {group.edit("errors.unavailable")}
                  </p>
                ) : !availability ? (
                  <p className="text-xs text-dark/65 sm:text-sm">
                    {group.edit("loadingSlots")}
                  </p>
                ) : exhausted ? (
                  <p className="font-bold">{t.edit("groupFull")}</p>
                ) : (
                  <p className="text-xl font-black sm:text-2xl">
                    {availableSlots?.map((slot) => slot.time).join(" / ")}
                  </p>
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-dark/65 sm:text-sm">
                {t.edit("groupTimes")}
              </p>
              <p className="mb-5 mt-4 text-sm leading-6 sm:mb-6 sm:text-base sm:leading-7">
                {t.edit("groupPickup")}
              </p>
              <span className="mt-auto flex items-center justify-between gap-2 text-sm font-bold text-paprika sm:gap-3 sm:text-base">
                {t.edit(exhausted ? "notifyAction" : "groupAction")}
                <ArrowRight size={20} className="shrink-0" aria-hidden="true" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </dialog>
  );
}

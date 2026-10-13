"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import { useGroupAvailability } from "./useGroupAvailability";
import { GroupSlotWaitlist } from "./GroupSlotWaitlist";

export function GroupOrderEntry({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const t = useEditableTranslations("groupOrder");
  const { availability, failed } = useGroupAvailability();
  const hasAvailableSlots =
    !failed && availability?.slots.some((slot) => slot.available);
  const entry = (
    <div className="mx-auto mt-8 max-w-2xl text-center">
      {failed ? (
        <p role="status">{t.edit("errors.unavailable")}</p>
      ) : !availability ? (
        <p role="status">{t.edit("loadingSlots")}</p>
      ) : hasAvailableSlots ? (
        <div>
          <Link
            href={`/${locale}/group-order`}
            className="ssab-group-cta inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-paprika px-6 py-5 text-xl font-black text-white transition-colors hover:bg-[#a51521] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paprika sm:w-auto sm:min-w-96 sm:px-10 sm:text-2xl"
          >
            <Users size={28} aria-hidden="true" />
            {t.edit("entryButton")}
          </Link>
          <p className="mt-3 text-sm font-semibold text-dark/70">
            {availability.slots
              .filter((slot) => slot.available)
              .map((slot) => slot.time)
              .join(" / ")}{" "}
            · {t.edit("swedishTime")}
          </p>
        </div>
      ) : (
        <GroupSlotWaitlist locale={locale} />
      )}
    </div>
  );

  return (
    <>
      {hasAvailableSlots ? entry : null}
      {children}
      {!hasAvailableSlots ? entry : null}
    </>
  );
}

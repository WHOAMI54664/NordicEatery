"use client";
import { useTranslations } from "next-intl";
import type { PublicGroup } from "@/lib/group-orders/model";

export function GroupPaymentSummary({
  group,
  locale,
}: {
  group: PublicGroup;
  locale: string;
}) {
  const t = useTranslations("groupOrder");
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SEK",
    }).format(amount / 100);
  return (
    <div className="mt-6 divide-y divide-dark/10">
      {group.payments.map((payment) => (
        <div
          key={payment.memberId}
          className="flex flex-wrap items-center justify-between gap-2 py-4"
        >
          <span className="font-semibold">
            {
              group.members.find((member) => member.id === payment.memberId)
                ?.name
            }
          </span>
          <span>
            {money(payment.amount)} · {t(`payment.${payment.status}`)}
          </span>
        </div>
      ))}
    </div>
  );
}

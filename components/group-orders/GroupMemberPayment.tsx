"use client";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import type { PublicGroup } from "@/lib/group-orders/model";
export function GroupMemberPayment({
  group,
  locale,
  busy,
  expired,
  swishPending,
  act,
}: {
  group: PublicGroup;
  locale: string;
  busy: boolean;
  expired: boolean;
  swishPending: boolean;
  act: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const t = useEditableTranslations("groupOrder");
  const myPayment = group.payments.find((p) => p.memberId === group.me?.id);
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SEK",
    }).format(amount / 100);
  return (
    <div>
      {myPayment?.status === "pending" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void act({
              action: "pay",
              phone: form.get("phone"),
              amount: myPayment.amount,
              method: group.paymentMethod,
            });
          }}
        >
          {group.paymentMethod === "swish" && (
            <label className="mt-4 block text-sm font-semibold">
              {t.edit("swishPhone")}
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required={!myPayment.started}
                disabled={myPayment.started}
                maxLength={30}
                defaultValue={group.customer?.phone || ""}
                className="input-field mt-2"
              />
            </label>
          )}
          <button
            disabled={busy || expired}
            className="mt-5 w-full rounded-xl bg-dark px-5 py-4 font-bold text-white disabled:opacity-40"
          >
            {t.edit(group.paymentMethod === "cash" ? "confirmOnSite" : "payAmount", {
              amount: money(myPayment.amount),
            })}
          </button>
        </form>
      )}
      {swishPending && myPayment?.status === "pending" && (
        <div role="status" className="mt-4 rounded-xl bg-dark/5 p-4">
          <p>{t.edit("swishPending")}</p>
          <a href="swish://" className="mt-3 inline-block font-bold underline">
            {t.edit("openSwish")}
          </a>
        </div>
      )}
      {myPayment?.status === "pay_on_site" && (
        <p role="status" className="mt-5 font-semibold">
          {t.edit("cashWaiting")}
        </p>
      )}
      {myPayment?.status === "paid" && (
        <p role="status" className="mt-5 font-semibold text-emerald-700">
          {t.edit("paidWaiting")}
        </p>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Clock,
  Copy,
  LockKeyhole,
  Minus,
  Plus,
  Share2,
  Users,
  X,
} from "lucide-react";
import type { Product } from "@/types/product";
import type { GroupItem, PublicGroup } from "@/lib/group-orders/model";
import { GroupOrderReview } from "./GroupOrderReview";
import { GroupOrderMenu } from "./GroupOrderMenu";
import { GroupPaymentSummary } from "./GroupPaymentSummary";

export function GroupOrderRoom({
  id,
  locale,
  products,
  catalogError,
  settings,
  menuContent,
}: {
  id: string;
  locale: string;
  products: Product[];
  catalogError: boolean;
  menuContent: Record<string, string>;
  settings: import("@/lib/group-orders/model").GroupCheckoutSettings;
}) {
  const t = useTranslations("groupOrder");
  const [group, setGroup] = useState<PublicGroup | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [inviteUrl, setInviteUrl] = useState("");
  const [swishPending, setSwishPending] = useState(false);
  const endpoint = `/api/group-orders/${id}`;
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SEK",
    }).format(amount / 100);
  const explain = useCallback(
    (code: string) =>
      t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.unavailable"),
    [t],
  );
  const accept = useCallback(
    (incoming: PublicGroup) =>
      setGroup((current) =>
        !current || incoming.version >= current.version ? incoming : current,
      ),
    [],
  );
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(endpoint, { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(explain(data.error));
      accept(data);
    },
    [endpoint, explain, accept],
  );

  useEffect(() => {
    setInviteUrl(`${window.location.origin}/${locale}/group-order/${id}`);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (!document.hidden)
          await refresh(
            AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
          );
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error && error.name !== "TimeoutError"
              ? error.message
              : explain("unavailable"),
          );
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
      }
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [refresh, id, locale, explain]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function act(body: Record<string, unknown>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(explain(data.error));
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.id) accept(data);
      else await refresh();
      if (data.swishPending) setSwishPending(true);
    } catch (error) {
      setError(
        error instanceof Error &&
          !["TimeoutError", "TypeError"].includes(error.name)
          ? error.message
          : explain("unavailable"),
      );
      try {
        await refresh();
      } catch {
        /* Keep the last confirmed state and visible error. */
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title: group?.name, url: inviteUrl });
      else {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
      }
    } catch {
      setCopied(false);
    }
  }
  if (!group)
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-8" role="status">
        {error || t("loading")}
      </div>
    );
  const me = group.members.find((member) => member.id === group.me?.id);
  const deadlinePassed =
    Boolean(group.deadline && Date.parse(group.deadline) <= now) ||
    Date.parse(group.expiresAt) <= now;
  const editing = group.status === "open" && !deadlinePassed && !me?.ready;
  const myPayment = group.payments.find(
    (payment) => payment.memberId === me?.id,
  );
  const timeLeft = group.paymentDeadline || group.deadline;
  const remaining = timeLeft
    ? Math.max(0, Math.ceil((Date.parse(timeLeft) - now) / 60000))
    : null;
  const productMap = new Map(
    products.map((product) => [String(product.id), product]),
  );
  const itemAmount = (memberId: string, item: GroupItem) =>
    group.status === "open"
      ? Math.round(Number(productMap.get(item.productId)?.price || 0) * 100) *
        item.quantity
      : (group.lines.find(
          (line) =>
            line.memberId === memberId && line.productId === item.productId,
        )?.unitAmount || 0) * item.quantity;
  const total = group.members.reduce(
    (sum, member) =>
      sum +
      member.items.reduce(
        (subtotal, item) => subtotal + itemAmount(member.id, item),
        0,
      ),
    0,
  );
  function updateItem(productId: string, quantity: number, note?: string) {
    if (!me || !editing) return;
    const previous = me.items.find((item) => item.productId === productId);
    const items = me.items.filter((item) => item.productId !== productId);
    if (quantity > 0)
      items.push({ productId, quantity, note: note ?? previous?.note ?? "" });
    void act({ action: "items", revision: me.revision, items });
  }
  return (
    <div>
      <Link
        href={`/${locale}/menu`}
        className="text-sm font-semibold text-dark/70"
      >
        ← {t("backToMenu")}
      </Link>
      <header className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-paprika">
            <Users size={18} />
            {t("groupOrder")}
          </p>
          <h1 className="mt-2 break-words text-3xl font-black sm:text-4xl">
            {group.name}
          </h1>
          <p className="mt-2 text-dark/70">
            {t("hostedBy", { name: group.hostName })} ·{" "}
            {t(`${group.mode}PaymentLabel`)}
          </p>
        </div>
        {group.me && group.status === "open" && (
          <button
            onClick={share}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-dark px-5 py-3 font-bold text-white"
          >
            <Share2 size={18} />
            {copied ? t("copied") : t("invite")}
          </button>
        )}
      </header>
      <div className="my-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-white px-4 py-2 font-semibold">
          {t(`status.${group.status}`)}
        </span>
        {remaining !== null &&
          !["submitted", "cancelled"].includes(group.status) && (
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2">
              <Clock size={16} />
              {remaining ? t("minutesLeft", { count: remaining }) : t("timeUp")}
            </span>
          )}
        {group.spendLimit && (
          <span className="rounded-full bg-white px-4 py-2">
            {t("limitLabel", { amount: money(group.spendLimit) })}
          </span>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-paprika/20 bg-white p-4 text-sm text-paprika"
        >
          <span>{error}</span>
          <button aria-label={t("dismiss")} onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}
      {!group.me ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void act({
              action: "join",
              name: new FormData(event.currentTarget).get("name"),
            });
          }}
          className="mx-auto my-10 max-w-lg rounded-3xl bg-white p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold">{t("joinTitle")}</h2>
          <p className="my-4 leading-7 text-dark/70">{t("joinDescription")}</p>
          <label className="block text-sm font-semibold">
            {t("yourName")}
            <input
              name="name"
              required
              maxLength={60}
              autoComplete="given-name"
              className="input-field mt-2"
            />
          </label>
          <button
            disabled={busy || group.status !== "open" || deadlinePassed}
            className="mt-5 w-full rounded-xl bg-dark p-4 font-bold text-white disabled:opacity-40"
          >
            {t("join")}
          </button>
        </form>
      ) : (
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0">
            {group.status === "submitted" ? (
              <div className="rounded-3xl bg-white p-8">
                <Check size={40} className="text-emerald-600" />
                <h2 className="mt-4 text-3xl font-bold">
                  {t("orderPlaced")}
                  {group.displayOrderNumber
                    ? ` #${group.displayOrderNumber}`
                    : ""}
                </h2>
                <p className="mt-3 text-lg">
                  {t.has(`kitchen.${group.orderStatus}`)
                    ? t(`kitchen.${group.orderStatus}`)
                    : t("orderPlacedDescription")}
                </p>
                <p className="mt-3 text-dark/70">
                  {t(
                    group.paymentMethod === "cash"
                      ? "cashSubmitted"
                      : "oneOrder",
                  )}
                </p>
              </div>
            ) : group.status === "cancelled" ? (
              <div className="rounded-3xl bg-white p-8">
                <h2 className="text-2xl font-bold">{t("cancelledTitle")}</h2>
                <p className="mt-4 leading-7 text-dark/70">
                  {t("refundExplanation")}
                </p>
                <GroupPaymentSummary group={group} locale={locale} />
              </div>
            ) : group.status !== "open" ? (
              <div className="rounded-3xl bg-white p-6 sm:p-8">
                <LockKeyhole size={32} />
                <h2 className="mt-4 text-2xl font-bold">{t("reviewTitle")}</h2>
                <p className="mt-3 leading-7 text-dark/70">
                  {t(
                    group.paymentMethod === "cash"
                      ? "cashExplanation"
                      : group.mode === "split"
                        ? "splitPaymentExplanation"
                        : "hostPaymentExplanation",
                  )}
                </p>
                {group.customer && (
                  <p className="mt-4 rounded-xl bg-dark/5 p-4 text-sm">
                    {t(group.customer.deliveryType)} ·{" "}
                    {group.customer.deliveryType === "delivery"
                      ? group.customer.address
                      : group.customer.name}
                  </p>
                )}
                <GroupPaymentSummary group={group} locale={locale} />
                <p className="mt-4 font-semibold">
                  {t(`methods.${group.paymentMethod}`)}
                </p>
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
                        {t("swishPhone")}
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
                      disabled={busy || remaining === 0}
                      className="mt-5 w-full rounded-xl bg-dark px-5 py-4 font-bold text-white disabled:opacity-40"
                    >
                      {t(
                        group.paymentMethod === "cash"
                          ? "confirmOnSite"
                          : "payAmount",
                        { amount: money(myPayment.amount) },
                      )}
                    </button>
                  </form>
                )}
                {swishPending && myPayment?.status === "pending" && (
                  <div role="status" className="mt-4 rounded-xl bg-dark/5 p-4">
                    <p>{t("swishPending")}</p>
                    <a
                      href="swish://"
                      className="mt-3 inline-block font-bold underline"
                    >
                      {t("openSwish")}
                    </a>
                  </div>
                )}
                {myPayment?.status === "pay_on_site" && (
                  <p role="status" className="mt-5 font-semibold">
                    {t("cashWaiting")}
                  </p>
                )}
                {myPayment?.status === "paid" && (
                  <p
                    role="status"
                    className="mt-5 font-semibold text-emerald-700"
                  >
                    {t("paidWaiting")}
                  </p>
                )}
                {group.me.isHost && group.status === "locked" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act({ action: "reopen", version: group.version })
                    }
                    className="mt-4 w-full rounded-xl border border-dark/20 p-3 font-semibold disabled:opacity-40"
                  >
                    {t("reopen")}
                  </button>
                )}
                <p className="mt-5 text-sm leading-6 text-dark/70">
                  {t(
                    group.paymentMethod === "cash"
                      ? "cashExplanation"
                      : "paymentSafety",
                  )}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 rounded-2xl bg-white p-5">
                  <h2 className="font-bold">
                    {t("yourSelection", { name: me?.name || "" })}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-dark/70">
                    {me?.ready
                      ? t("readyExplanation")
                      : t("selectionExplanation")}
                  </p>
                  {deadlinePassed && (
                    <p className="mt-2 text-sm font-semibold text-paprika">
                      {t("deadlineExplanation")}
                    </p>
                  )}
                </div>
                <GroupOrderMenu
                  locale={locale}
                  products={products}
                  me={me}
                  editing={editing}
                  busy={busy}
                  catalogError={catalogError}
                  content={menuContent}
                  updateItem={updateItem}
                />
              </>
            )}
          </section>
          <aside
            id="group-basket"
            className="scroll-mt-8 rounded-3xl border border-dark/10 bg-white p-5 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("sharedCart")}</h2>
              <span className="flex items-center gap-1 text-sm">
                <Users size={17} />
                {group.members.length}/18
              </span>
            </div>
            <div className="mt-5 divide-y divide-dark/10">
              {group.members.map((member) => (
                <section key={member.id} className="py-4 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="break-words font-bold">
                      {member.name}
                      {member.id === me?.id ? ` (${t("you")})` : ""}
                    </h3>
                    <span
                      className={`shrink-0 text-xs font-semibold ${member.ready ? "text-emerald-700" : "text-dark/60"}`}
                    >
                      {member.ready ? t("ready") : t("choosing")}
                    </span>
                  </div>
                  {!member.items.length && (
                    <p className="mt-2 text-sm text-dark/60">{t("noItems")}</p>
                  )}
                  <ul className="mt-2 space-y-3">
                    {member.items.map((item) => {
                      const product = productMap.get(item.productId);
                      const frozen = group.lines.find(
                        (line) =>
                          line.memberId === member.id &&
                          line.productId === item.productId,
                      );
                      const name = product
                        ? String(
                            product[`name_${locale}` as keyof Product] ||
                              product.name,
                          )
                        : frozen?.name || t("unavailableProduct");
                      return (
                        <li key={item.productId}>
                          <div className="flex justify-between gap-3 text-sm">
                            <span>
                              {item.quantity} × {name}
                            </span>
                            <span className="shrink-0">
                              {money(itemAmount(member.id, item))}
                            </span>
                          </div>
                          {member.id === me?.id && editing ? (
                            <div className="mt-2">
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={busy}
                                  aria-label={t("decrease", { name })}
                                  onClick={() =>
                                    updateItem(
                                      item.productId,
                                      item.quantity - 1,
                                    )
                                  }
                                  className="rounded-full bg-dark/5 p-2 disabled:opacity-40"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="text-sm">{item.quantity}</span>
                                <button
                                  disabled={busy || item.quantity >= 20}
                                  aria-label={t("addProduct", { name })}
                                  onClick={() =>
                                    updateItem(
                                      item.productId,
                                      item.quantity + 1,
                                    )
                                  }
                                  className="rounded-full bg-dark/5 p-2 disabled:opacity-40"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <input
                                key={`${item.productId}:${member.revision}`}
                                aria-label={t("itemNote", { name })}
                                defaultValue={item.note}
                                maxLength={200}
                                onBlur={(event) => {
                                  if (event.target.value.trim() !== item.note)
                                    updateItem(
                                      item.productId,
                                      item.quantity,
                                      event.target.value,
                                    );
                                }}
                                placeholder={t("notePlaceholder")}
                                className="mt-2 w-full rounded-lg border border-dark/10 px-3 py-2 text-xs"
                              />
                            </div>
                          ) : (
                            item.note && (
                              <p className="mt-1 text-xs text-dark/70">
                                {item.note}
                              </p>
                            )
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {group.me?.isHost &&
                    member.id !== me?.id &&
                    group.status === "open" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void act({
                            action: "remove",
                            memberId: member.id,
                            version: group.version,
                          })
                        }
                        className="mt-3 text-xs font-semibold text-paprika disabled:opacity-40"
                      >
                        {t("removeMember")}
                      </button>
                    )}
                </section>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-dark/10 pt-4 text-lg font-bold">
              <span>{t("total")}</span>
              <span>{money(total)}</span>
            </div>
            {me && group.status === "open" && (
              <button
                disabled={busy || (deadlinePassed && me.ready)}
                onClick={() =>
                  void act({
                    action: "ready",
                    ready: !me.ready,
                    revision: me.revision,
                  })
                }
                className={`mt-5 w-full rounded-xl p-4 font-bold disabled:opacity-40 ${me.ready ? "border border-dark/20" : "bg-dark text-white"}`}
              >
                {me.ready ? t("editSelection") : t("doneChoosing")}
              </button>
            )}
            {group.me.isHost && group.status === "open" && (
              <GroupOrderReview
                group={group}
                busy={busy}
                act={act}
                settings={settings}
              />
            )}
            {group.status === "open" && (
              <details className="mt-5 text-sm">
                <summary className="cursor-pointer font-semibold">
                  {t("invitationLink")}
                </summary>
                <div className="mt-2 flex gap-2">
                  <input
                    readOnly
                    value={inviteUrl}
                    aria-label={t("invitationLink")}
                    onFocus={(event) => event.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-lg border border-dark/20 p-2 text-xs"
                  />
                  <button
                    aria-label={t("copy")}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteUrl);
                        setCopied(true);
                      } catch {
                        setError(t("selectLink"));
                      }
                    }}
                    className="rounded-lg bg-dark/5 p-2"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </details>
            )}
            {group.me.isHost &&
              !["submitted", "cancelled"].includes(group.status) && (
                <div className="mt-5 border-t border-dark/10 pt-4">
                  {confirmCancel ? (
                    <>
                      <p className="text-sm leading-6">
                        {t("cancelConfirmation")}
                      </p>
                      <div className="mt-3 flex gap-3">
                        <button
                          disabled={busy}
                          onClick={() => void act({ action: "cancel" })}
                          className="rounded-lg bg-paprika px-4 py-2 text-sm font-bold text-white"
                        >
                          {t("confirmCancel")}
                        </button>
                        <button
                          onClick={() => setConfirmCancel(false)}
                          className="text-sm font-semibold"
                        >
                          {t("keepOrder")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmCancel(true)}
                      className="text-sm font-semibold text-paprika"
                    >
                      {t("cancelOrder")}
                    </button>
                  )}
                </div>
              )}
          </aside>
        </div>
      )}
      {group.me && group.status === "open" && (
        <a
          href="#group-basket"
          className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between gap-3 rounded-xl bg-dark px-5 py-4 text-sm font-bold text-white shadow-xl lg:hidden"
        >
          <span>{t("viewBasket")}</span>
          <span>{money(total)}</span>
        </a>
      )}
    </div>
  );
}

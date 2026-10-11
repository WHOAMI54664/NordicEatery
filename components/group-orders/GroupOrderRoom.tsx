"use client";

import { getPublicPath } from "@/i18n/paths";
import { formatGroupPickup } from "@/lib/group-orders/slots";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
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
import {
  resolveSelection,
  selectionKey,
  type Selection,
} from "@/lib/menu-options";
import type { Product } from "@/types/product";
import type { CartAddition } from "@/lib/cart";
import { priceMealCombos } from "@/lib/meal-combo";
import type { GroupItem, PublicGroup } from "@/lib/group-orders/model";
import { GroupOrderReview } from "./GroupOrderReview";
import { GroupOrderMenu } from "./GroupOrderMenu";
import { GroupMemberPayment } from "./GroupMemberPayment";
import { GroupPaymentSummary } from "./GroupPaymentSummary";
import { GroupPickupDirections } from "./GroupPickupDirections";

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
  const t = useEditableTranslations("groupOrder");
  const combo = useEditableTranslations("combo");
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
    if (busyRef.current) return false;
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
        return true;
      }
      if (data.id) accept(data);
      else await refresh(AbortSignal.timeout(10000));
      if (data.swishPending) setSwishPending(true);
      return true;
    } catch (error) {
      setError(
        error instanceof Error &&
          !["TimeoutError", "TypeError"].includes(error.name)
          ? error.message
          : explain("unavailable"),
      );
      try {
        await refresh(AbortSignal.timeout(10000));
      } catch {
        /* Keep the last confirmed state and visible error. */
      }
      return false;
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
        {error || t.edit("loading")}
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
  const timeLeft =
    group.status === "open"
      ? group.deadline || group.expiresAt
      : group.paymentDeadline || group.deadline;
  const remaining = timeLeft
    ? Math.max(0, Math.ceil((Date.parse(timeLeft) - now) / 60000))
    : null;
  const productMap = new Map(
    products.map((product) => [String(product.id), product]),
  );
  const itemKey = (item: GroupItem) =>
    selectionKey(item.productId, item.selections);
  const itemSummary = (item: GroupItem) => {
    try {
      return resolveSelection(
        productMap.get(item.productId)?.modifier_groups,
        item.selections,
      ).summary;
    } catch {
      return t("errors.invalidSelection");
    }
  };
  const pricedLines =
    group.status !== "open"
      ? group.lines
      : group.members.flatMap((member) =>
          group.payments.some((p) => p.memberId === member.id)
            ? group.lines.filter((line) => line.memberId === member.id)
            : priceMealCombos(
                member.items.map((item) => {
                  const product = productMap.get(item.productId);
                  let unitAmount = 0;
                  try {
                    if (product)
                      unitAmount =
                        Math.round(Number(product.price) * 100) +
                        resolveSelection(
                          product.modifier_groups,
                          item.selections,
                        ).extraAmount;
                  } catch {
                    /* The server rejects obsolete selections before locking. */
                  }
                  return {
                    ...item,
                    category: product?.category,
                    unitAmount,
                    memberId: member.id,
                    memberName: member.name,
                    name: product?.name || "",
                  };
                }),
              ),
        );
  const itemLines = (memberId: string, item: GroupItem) =>
    pricedLines.filter(
      (line) => line.memberId === memberId && itemKey(line) === itemKey(item),
    );
  const itemAmount = (memberId: string, item: GroupItem) =>
    itemLines(memberId, item).reduce(
      (sum, line) => sum + line.unitAmount * line.quantity,
      0,
    );
  const itemDiscount = (memberId: string, item: GroupItem) =>
    itemLines(memberId, item).reduce(
      (sum, line) => sum + (line.comboDiscount || 0) * line.quantity,
      0,
    );
  const total = group.members.reduce(
    (sum, member) =>
      sum +
      member.items.reduce(
        (subtotal, item) => subtotal + itemAmount(member.id, item),
        0,
      ),
    0,
  );
  function updateItem(
    productId: string,
    quantity: number,
    note?: string,
    selections: Selection[] = [],
  ) {
    if (!me || !editing) return;
    const key = selectionKey(productId, selections);
    const previous = me.items.find((item) => itemKey(item) === key);
    const items = me.items.filter((item) => itemKey(item) !== key);
    if (quantity > 0)
      items.push({
        productId,
        quantity,
        note: note ?? previous?.note ?? "",
        selections,
      });
    void act({ action: "items", revision: me.revision, items });
  }
  async function addItems(additions: CartAddition[]) {
    if (!me || !editing) return false;
    let items = me.items.map((item) => ({ ...item }));
    for (const addition of additions) {
      const key = selectionKey(addition.product.id, addition.selections);
      const previous = items.find((item) => itemKey(item) === key);
      items = items.filter((item) => itemKey(item) !== key);
      items.push({
        productId: addition.product.id,
        quantity: (previous?.quantity || 0) + addition.quantity,
        selections: addition.selections,
        note: previous?.note || "",
      });
    }
    return act({ action: "items", revision: me.revision, items });
  }
  return (
    <div>
      <Link
        href={getPublicPath(locale, "/menu")}
        className="text-sm font-semibold text-dark/70"
      >
        ← {t.edit("backToMenu")}
      </Link>
      <header className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-paprika">
            <Users size={18} />
            {t.edit("groupOrder")}
          </p>
          <h1 className="mt-2 break-words text-3xl font-black sm:text-4xl">
            {group.name}
          </h1>
          <p className="mt-2 text-dark/70">
            {t.edit("hostedBy", { name: group.hostName })} ·{" "}
            {t.edit(`${group.mode}PaymentLabel`)}
          </p>
        </div>
        {group.me && group.status === "open" && (
          <button
            onClick={share}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-dark px-5 py-3 font-bold text-white"
          >
            <Share2 size={18} />
            {copied ? t.edit("copied") : t.edit("invite")}
          </button>
        )}
      </header>
      <div className="my-6 flex flex-wrap items-center gap-3 text-sm">
        {group.pickupAt && (
          <span className="rounded-full bg-dark px-4 py-2 font-bold text-white">
            {t.edit("pickupAt", {
              time: formatGroupPickup(group.pickupAt, locale),
            })}
          </span>
        )}
        <span className="rounded-full bg-white px-4 py-2 font-semibold">
          {t.edit(`status.${group.status}`)}
        </span>
        {remaining !== null &&
          !["submitted", "cancelled"].includes(group.status) && (
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2">
              <Clock size={16} />
              {remaining
                ? t.edit("minutesLeft", { count: remaining })
                : t.edit("timeUp")}
            </span>
          )}
        {group.spendLimit && (
          <span className="rounded-full bg-white px-4 py-2">
            {t.edit("limitLabel", { amount: money(group.spendLimit) })}
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
          <h2 className="text-2xl font-bold">{t.edit("joinTitle")}</h2>
          <p className="my-4 leading-7 text-dark/70">
            {t.edit("joinDescription")}
          </p>
          <label className="block text-sm font-semibold">
            {t.edit("yourName")}
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
            {t.edit("join")}
          </button>
        </form>
      ) : (
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0">
            <GroupPickupDirections group={group} />
            {group.status === "submitted" ? (
              <div className="rounded-3xl bg-white p-8">
                <Check size={40} className="text-emerald-600" />
                <h2 className="mt-4 text-3xl font-bold">
                  {t.edit("orderPlaced")}
                  {group.displayOrderNumber
                    ? ` #${group.displayOrderNumber}`
                    : ""}
                </h2>
                <p className="mt-3 text-lg">
                  {t.has(`kitchen.${group.orderStatus}`)
                    ? t.edit(`kitchen.${group.orderStatus}`)
                    : t.edit("orderPlacedDescription")}
                </p>
                <p className="mt-3 text-dark/70">
                  {t.edit(
                    group.paymentMethod === "cash"
                      ? "cashSubmitted"
                      : "oneOrder",
                  )}
                </p>
              </div>
            ) : group.status === "cancelled" ? (
              <div className="rounded-3xl bg-white p-8">
                <h2 className="text-2xl font-bold">
                  {t.edit("cancelledTitle")}
                </h2>
                <p className="mt-4 leading-7 text-dark/70">
                  {t.edit("refundExplanation")}
                </p>
                <GroupPaymentSummary group={group} locale={locale} />
              </div>
            ) : group.status !== "open" ? (
              <div className="rounded-3xl bg-white p-6 sm:p-8">
                <LockKeyhole size={32} />
                <h2 className="mt-4 text-2xl font-bold">
                  {t.edit("reviewTitle")}
                </h2>
                <p className="mt-3 leading-7 text-dark/70">
                  {t.edit(
                    group.paymentMethod === "cash"
                      ? "cashExplanation"
                      : group.mode === "split"
                        ? "splitPaymentExplanation"
                        : "hostPaymentExplanation",
                  )}
                </p>
                {group.customer && (
                  <p className="mt-4 rounded-xl bg-dark/5 p-4 text-sm">
                    {t.edit(group.customer.deliveryType)} ·{" "}
                    {group.customer.deliveryType === "delivery"
                      ? group.customer.address
                      : group.customer.name}
                  </p>
                )}
                <GroupPaymentSummary group={group} locale={locale} />
                <p className="mt-4 font-semibold">
                  {t.edit(`methods.${group.paymentMethod}`)}
                </p>
                <GroupMemberPayment
                  group={group}
                  locale={locale}
                  busy={busy}
                  expired={remaining === 0}
                  swishPending={swishPending}
                  act={act}
                />
                {group.me.isHost && group.status === "locked" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act({ action: "reopen", version: group.version })
                    }
                    className="mt-4 w-full rounded-xl border border-dark/20 p-3 font-semibold disabled:opacity-40"
                  >
                    {t.edit("reopen")}
                  </button>
                )}
                <p className="mt-5 text-sm leading-6 text-dark/70">
                  {t.edit(
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
                    {t.edit("yourSelection", { name: me?.name || "" })}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-dark/70">
                    {myPayment?.started
                      ? t.edit("selectionFrozen")
                      : me?.ready
                        ? t.edit("readyExplanation")
                        : t.edit("selectionExplanation")}
                  </p>
                  {deadlinePassed && (
                    <p className="mt-2 text-sm font-semibold text-paprika">
                      {t.edit("deadlineExplanation")}
                    </p>
                  )}
                </div>
                {group.individualCheckout && myPayment && (
                  <div className="mb-5 rounded-2xl bg-white p-5">
                    <h2 className="text-xl font-bold">
                      {t.edit("payIndependently")}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-dark/70">
                      {t.edit("individualPaymentExplanation")}
                    </p>
                    <p className="mt-3 font-semibold">
                      {t.edit(`methods.${group.paymentMethod}`)} ·{" "}
                      {t.edit(group.deliveryType || "pickup")}
                    </p>
                    <GroupMemberPayment
                      group={group}
                      locale={locale}
                      busy={busy}
                      expired={remaining === 0}
                      swishPending={swishPending}
                      act={act}
                    />
                  </div>
                )}
                <GroupOrderMenu
                  locale={locale}
                  products={products}
                  me={me}
                  editing={editing}
                  busy={busy}
                  catalogError={catalogError}
                  content={menuContent}
                  addItems={addItems}
                />
              </>
            )}
          </section>
          <aside
            id="group-basket"
            className="scroll-mt-8 rounded-3xl border border-dark/10 bg-white p-5 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t.edit("sharedCart")}</h2>
              <span className="flex items-center gap-1 text-sm">
                <Users size={17} />
                {group.members.length}/{group.participantCount ?? 18}
              </span>
            </div>
            <div className="mt-5 divide-y divide-dark/10">
              {group.members.map((member) => (
                <section key={member.id} className="py-4 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="break-words font-bold">
                      {member.name}
                      {member.id === me?.id && <> ({t.edit("you")})</>}
                    </h3>
                    <span
                      className={`shrink-0 text-xs font-semibold ${member.ready ? "text-emerald-700" : "text-dark/60"}`}
                    >
                      {group.payments.some(
                        (p) => p.memberId === member.id && p.status === "paid",
                      )
                        ? t.edit("payment.paid")
                        : member.ready
                          ? t.edit("ready")
                          : t.edit("choosing")}
                    </span>
                  </div>
                  {!member.items.length && (
                    <p className="mt-2 text-sm text-dark/60">
                      {t.edit("noItems")}
                    </p>
                  )}
                  <ul className="mt-2 space-y-3">
                    {member.items.map((item) => {
                      const product = productMap.get(item.productId);
                      const frozenLines = group.lines.filter(
                        (line) =>
                          line.memberId === member.id &&
                          itemKey(line) === itemKey(item),
                      );
                      const frozen =
                        frozenLines.find((line) => !line.comboDiscount) ||
                        frozenLines[0];
                      const name =
                        group.status !== "open" && frozen
                          ? frozen.name
                          : product
                            ? String(
                                product[`name_${locale}` as keyof Product] ||
                                  product.name,
                              )
                            : frozen?.name || t("unavailableProduct");
                      return (
                        <li key={itemKey(item)}>
                          <div className="flex justify-between gap-3 text-sm">
                            <span>
                              {item.quantity} × {name}
                            </span>
                            <span className="shrink-0">
                              {money(itemAmount(member.id, item))}
                            </span>
                          </div>
                          {itemDiscount(member.id, item) > 0 && (
                            <p className="mt-1 text-xs font-semibold text-paprika">
                              {combo.edit("saving", {
                                amount: money(itemDiscount(member.id, item)),
                              })}
                            </p>
                          )}
                          {group.status === "open" &&
                          item.selections?.length ? (
                            <p className="mt-1 text-xs text-dark/60">
                              {itemSummary(item)}
                            </p>
                          ) : null}
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
                                      undefined,
                                      item.selections,
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
                                      undefined,
                                      item.selections,
                                    )
                                  }
                                  className="rounded-full bg-dark/5 p-2 disabled:opacity-40"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <input
                                key={`${itemKey(item)}:${member.revision}`}
                                aria-label={t("itemNote", { name })}
                                defaultValue={item.note}
                                maxLength={200}
                                onBlur={(event) => {
                                  if (event.target.value.trim() !== item.note)
                                    updateItem(
                                      item.productId,
                                      item.quantity,
                                      event.target.value,
                                      item.selections,
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
                    group.status === "open" &&
                    !group.payments.some(
                      (p) => p.memberId === member.id && p.started,
                    ) && (
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
                        {t.edit("removeMember")}
                      </button>
                    )}
                </section>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-dark/10 pt-4 text-lg font-bold">
              <span>{t.edit("total")}</span>
              <span>{money(total)}</span>
            </div>
            {me && group.status === "open" && !myPayment?.started && (
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
                {me.ready ? t.edit("editSelection") : t.edit("doneChoosing")}
              </button>
            )}
            {group.me.isHost && group.status === "open" && (
              <GroupOrderReview
                group={group}
                busy={busy}
                act={async (body) => {
                  await act(body);
                }}
                settings={settings}
              />
            )}
            {group.status === "open" && (
              <details className="mt-5 text-sm">
                <summary className="cursor-pointer font-semibold">
                  {t.edit("invitationLink")}
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
                        {t.edit("cancelConfirmation")}
                      </p>
                      <div className="mt-3 flex gap-3">
                        <button
                          disabled={busy}
                          onClick={() => void act({ action: "cancel" })}
                          className="rounded-lg bg-paprika px-4 py-2 text-sm font-bold text-white"
                        >
                          {t.edit("confirmCancel")}
                        </button>
                        <button
                          onClick={() => setConfirmCancel(false)}
                          className="text-sm font-semibold"
                        >
                          {t.edit("keepOrder")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmCancel(true)}
                      className="text-sm font-semibold text-paprika"
                    >
                      {t.edit("cancelOrder")}
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
          <span>{t.edit("viewBasket")}</span>
          <span>{money(total)}</span>
        </a>
      )}
    </div>
  );
}

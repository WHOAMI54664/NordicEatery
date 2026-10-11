import Stripe from "stripe";
import { groupSwish, swishPhone, type SwishStatus } from "./swish";
import {
  GroupError,
  groupDeadlineMs,
  requireMember,
  type GroupState,
  type GroupPayment,
} from "./model";
import { changeGroup, readGroup, groupDb, checkoutSettings } from "./store";

export function groupStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new GroupError("unavailable", 503);
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    timeout: 10000,
    maxNetworkRetries: 1,
  });
}
export function groupSiteUrl() {
  const url = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new GroupError("unavailable", 503);
  return url.origin;
}
export function sessionParams(
  id: string,
  state: GroupState,
  payment: GroupPayment,
): Stripe.Checkout.SessionCreateParams {
  const returnUrl = `${groupSiteUrl()}/${state.locale}/group-order/${id}`;
  return {
    mode: "payment",
    payment_method_types: ["card"],
    // One immutable share, in ore. Individual items are shown in the group review.
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "sek",
          unit_amount: payment.amount,
          product_data: { name: `Nordic Eatery · ${state.name}` },
        },
      },
    ],
    client_reference_id: payment.id,
    metadata: { group_id: id, group_payment_id: payment.id },
    payment_intent_data: {
      metadata: { group_id: id, group_payment_id: payment.id },
    },
    success_url: returnUrl,
    cancel_url: returnUrl,
  };
}

export function confirmGroupPayment(
  state: GroupState,
  session: Stripe.Checkout.Session,
): GroupState {
  const payment = state.payments.find(
    (item) => item.id === session.metadata?.group_payment_id,
  );
  const intentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (
    !payment ||
    (state.paymentMethod && state.paymentMethod !== "card") ||
    !payment.attemptedAt ||
    !intentId ||
    session.amount_total !== payment.amount ||
    session.currency !== "sek" ||
    (payment.sessionId && payment.sessionId !== session.id)
  )
    throw new GroupError("paymentMismatch", 409);
  if (session.payment_status !== "paid") return state;
  if (payment.intentId && payment.intentId !== intentId)
    throw new GroupError("paymentMismatch", 409);
  payment.sessionId = session.id;
  payment.intentId = intentId;
  if (payment.status === "pending" || payment.status === "expired")
    payment.status = "paid";
  return state;
}

async function ensureSession(
  id: string,
  state: GroupState,
  payment: GroupPayment,
  stripe: Stripe,
) {
  if (payment.sessionId)
    return stripe.checkout.sessions.retrieve(payment.sessionId);
  // Stripe only guarantees idempotency-key retention for at least 24 hours.
  // Never recreate an ambiguous payment after that window; require reconciliation.
  if (
    !payment.attemptedAt ||
    Date.now() - Date.parse(payment.attemptedAt) > 23 * 60 * 60 * 1000
  )
    throw new GroupError("paymentNeedsReview", 503);
  const session = await stripe.checkout.sessions.create(
    sessionParams(id, state, payment),
    { idempotencyKey: `group:${id}:${payment.id}` },
  );
  await changeGroup(id, (current) => {
    const share = current.payments.find((item) => item.id === payment.id);
    if (!share || (share.sessionId && share.sessionId !== session.id))
      throw new GroupError("paymentMismatch", 409);
    share.sessionId = session.id;
    return current;
  });
  return session;
}

export async function startGroupPayment(
  id: string,
  hash: string,
  stripe?: Stripe,
  phone?: unknown,
  expected?: { amount: unknown; method: unknown },
) {
  const before = await readGroup(id);
  const member = requireMember(before.state, hash);
  if (
    !before.state.customer &&
    !(before.state.mode === "split" && before.state.individualCheckout)
  )
    throw new GroupError("locked", 409);
  const method = before.state.paymentMethod || "card";
  await checkoutSettings(
    before.state.customer?.deliveryType || "pickup",
    method,
  );
  const existing = before.state.payments.find((p) => p.memberId === member.id);
  if (!existing) throw new GroupError("hostOnly", 403);
  if (
    expected &&
    (expected.amount !== existing.amount || expected.method !== method)
  )
    throw new GroupError("conflict", 409);
  const payerAlias =
    method === "swish" ? existing?.payerAlias || swishPhone(phone) : undefined;
  if (
    method === "swish" &&
    existing?.attemptedAt &&
    Date.now() - Date.parse(existing.attemptedAt) > 23 * 60 * 60 * 1000
  )
    throw new GroupError("paymentNeedsReview", 503);
  const row = await changeGroup(id, (state) => {
    requireMember(state, hash);
    if (
      !(
        ["locked", "paying"].includes(state.status) ||
        (state.status === "open" &&
          state.mode === "split" &&
          state.individualCheckout)
      ) ||
      !state.paymentDeadline ||
      groupDeadlineMs(state) <= Date.now()
    )
      throw new GroupError("paymentExpired", 409);
    const payment = state.payments.find((item) => item.memberId === member.id);
    if (!payment) throw new GroupError("hostOnly", 403);
    if (
      payment.id !== existing.id ||
      (state.paymentMethod || "card") !== method
    )
      throw new GroupError("conflict", 409);
    if (payment.status !== "pending") throw new GroupError("alreadyPaid", 409);
    if (method === "swish") {
      if (payment.payerAlias && payment.payerAlias !== payerAlias)
        throw new GroupError("conflict", 409);
      payment.payerAlias = payerAlias;
    }
    if (method === "cash") payment.status = "pay_on_site";
    payment.attemptedAt ||= new Date().toISOString();
    if (state.status !== "open") state.status = "paying";
    return state;
  });
  const payment = row.state.payments.find(
    (item) => item.memberId === member.id,
  )!;
  if (method === "cash") {
    await reconcileGroup(id, stripe);
    return { confirmed: true };
  }
  if (method === "swish") {
    await acceptSwish(id, payment.id, await groupSwish("create", id, payment));
    await reconcileGroup(id, stripe);
    const current = await readGroup(id);
    if (current.state.status === "cancelled")
      throw new GroupError("paymentExpired", 409);
    return { swishPending: true };
  }
  stripe ||= groupStripe();
  const session = await ensureSession(id, row.state, payment, stripe);
  if (session.payment_status === "paid") {
    await handleGroupSession(session, stripe);
    return { paid: true };
  }
  const latest = await readGroup(id);
  if (latest.state.status === "cancelled" || session.status === "expired") {
    await reconcileGroup(id, stripe);
    throw new GroupError("paymentExpired", 409);
  }
  if (session.status !== "open" || !session.url)
    throw new GroupError("paymentPending", 409);
  return { url: session.url };
}

export async function handleGroupSession(
  session: Stripe.Checkout.Session,
  stripe = groupStripe(),
) {
  const id = session.metadata?.group_id;
  if (!id || session.payment_status !== "paid") return;
  await changeGroup(id, (state) => confirmGroupPayment(state, session));
  await reconcileGroup(id, stripe);
}

export async function handleFailedGroupSession(
  session: Stripe.Checkout.Session,
  stripe = groupStripe(),
) {
  const id = session.metadata?.group_id;
  if (!id) return;
  await changeGroup(id, (state) => {
    const share = state.payments.find(
      (payment) => payment.id === session.metadata?.group_payment_id,
    );
    if (
      !share ||
      (state.paymentMethod && state.paymentMethod !== "card") ||
      !share.attemptedAt ||
      share.amount !== session.amount_total ||
      session.currency !== "sek" ||
      (share.sessionId && share.sessionId !== session.id)
    )
      throw new GroupError("paymentMismatch", 409);
    // A delayed failure must never undo a confirmed charge or submitted order.
    if (state.status !== "submitted" && share.status === "pending") {
      share.sessionId = session.id;
      share.status = "expired";
      state.status = "cancelled";
    }
    return state;
  });
  await reconcileGroup(id, stripe);
}

async function acceptSwish(id: string, paymentId: string, result: SwishStatus) {
  return changeGroup(id, (state) => {
    const share = state.payments.find((p) => p.id === paymentId);
    if (state.paymentMethod !== "swish" || !share?.attemptedAt)
      throw new GroupError("paymentMismatch", 409);
    if (result.status === "PAID") {
      if (share.intentId && share.intentId !== result.paymentReference)
        throw new GroupError("paymentMismatch", 409);
      share.intentId = result.paymentReference;
      if (["pending", "expired"].includes(share.status)) share.status = "paid";
    } else if (
      ["DECLINED", "CANCELLED", "ERROR"].includes(result.status) &&
      share.status === "pending" &&
      state.status !== "submitted"
    ) {
      share.status = "expired";
      state.status = "cancelled";
    }
    return state;
  });
}

export async function reconcileGroup(id: string, stripe?: Stripe) {
  let row = await readGroup(id);
  if (row.state.status === "submitted") return;
  const expired = groupDeadlineMs(row.state) <= Date.now();
  if (expired && row.state.status !== "cancelled") {
    row = await changeGroup(id, (state) => {
      if (state.status !== "submitted") state.status = "cancelled";
      return state;
    });
  }
  for (const payment of row.state.payments) {
    if (
      !payment.attemptedAt ||
      ["refunded", "expired"].includes(payment.status)
    )
      continue;
    if (row.state.paymentMethod === "swish") {
      if (payment.status === "pending") {
        let result = await groupSwish(
          Date.now() - Date.parse(payment.attemptedAt) > 23 * 60 * 60 * 1000
            ? "read"
            : "create",
          id,
          payment,
        );
        // Re-read cancellation after the network call, including cancellation by another request.
        const latest = await readGroup(id);
        if (latest.state.status === "cancelled" && result.status === "CREATED")
          result = await groupSwish("cancel", id, payment);
        await acceptSwish(id, payment.id, result);
      }
      continue;
    }
    if (payment.status === "pending") {
      stripe ||= groupStripe();
      let session = await ensureSession(id, row.state, payment, stripe);
      if (row.state.status === "cancelled" && session.status === "open") {
        try {
          session = await stripe.checkout.sessions.expire(session.id);
        } catch {
          // Completion can win the race against expiration; retrieve before deciding.
          session = await stripe.checkout.sessions.retrieve(session.id);
          if (session.status === "open")
            throw new GroupError("paymentPending", 503);
        }
      }
      if (session.payment_status === "paid") {
        await changeGroup(id, (state) => confirmGroupPayment(state, session));
      } else if (session.status === "expired") {
        await changeGroup(id, (state) => {
          if (state.status !== "submitted") state.status = "cancelled";
          const share = state.payments.find((item) => item.id === payment.id);
          if (share?.status === "pending") share.status = "expired";
          return state;
        });
      }
    }
  }
  row = await readGroup(id);
  if (
    row.state.status === "paying" &&
    row.state.payments.length &&
    row.state.payments.every(
      (payment) =>
        payment.status ===
        (row.state.paymentMethod === "cash" ? "pay_on_site" : "paid"),
    )
  ) {
    const { error } = await groupDb().rpc("finalize_group_order", {
      p_id: id,
      p_version: row.version,
    });
    if (error) throw new GroupError("unavailable", 503);
    row = await readGroup(id);
  }
  if (row.state.status !== "cancelled") return;
  for (const payment of row.state.payments) {
    if (!["paid", "refunding"].includes(payment.status) || !payment.intentId)
      continue;
    if (row.state.paymentMethod === "swish") {
      const refund = await groupSwish("refund", id, payment);
      await changeGroup(id, (state) => {
        const share = state.payments.find((item) => item.id === payment.id)!;
        share.refundId = refund.id;
        share.status = refund.status === "PAID" ? "refunded" : "refunding";
        return state;
      });
      if (refund.status === "ERROR")
        throw new GroupError("refundNeedsReview", 503);
      continue;
    }
    stripe ||= groupStripe();
    const refund = payment.refundId
      ? await stripe.refunds.retrieve(payment.refundId)
      : await stripe.refunds.create(
          { payment_intent: payment.intentId, amount: payment.amount },
          { idempotencyKey: `group-refund:${payment.id}` },
        );
    await changeGroup(id, (state) => {
      const share = state.payments.find((item) => item.id === payment.id)!;
      share.refundId = refund.id;
      share.status = refund.status === "succeeded" ? "refunded" : "refunding";
      return state;
    });
    if (refund.status === "failed" || refund.status === "canceled")
      throw new GroupError("refundNeedsReview", 503);
  }
}

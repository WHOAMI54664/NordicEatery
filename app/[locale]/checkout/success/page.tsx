"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Home,
  Mail,
  ReceiptText,
  RefreshCw,
  XCircle,
} from "lucide-react";

type PaymentStatus = "checking" | "paid" | "failed";

type SuccessOrder = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  displayOrderNumber: string | null;
  orderDate: string | null;

  customerName: string | null;
  customerPhone: string | null;
  customerEmail?: string | null;

  paymentMethod: string | null;
  paymentStatus: string | null;

  totalPrice: number | null;
  totalGross: number | null;
  totalNet: number | null;
  totalVat: number | null;

  createdAt: string | null;
  paidAt: string | null;
};

type StripeSessionResponse = {
  success?: boolean;
  error?: string;
  stripe?: {
    id: string;
    paymentStatus: string;
    status: string | null;
    paymentIntentId: string | null;
  };
  order?: SuccessOrder;
};

type PaidStatusResponse = {
  success?: boolean;
  error?: string;
  isPaid?: boolean;
  order?: SuccessOrder;
};

export default function CheckoutSuccessPage() {
  const params = useParams<{ locale?: string | string[] }>();

  const locale = typeof params?.locale === "string" ? params.locale : "sv";

  const [status, setStatus] = useState<PaymentStatus>("checking");
  const [order, setOrder] = useState<SuccessOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [isSendingReceipt, setIsSendingReceipt] = useState(false);
  const [receiptMessage, setReceiptMessage] = useState<string | null>(null);

  const orderDisplayNumber = useMemo(() => {
    if (!order) return null;

    return order.displayOrderNumber
        ? `#${order.displayOrderNumber}`
        : order.orderNumber
            ? `#${order.orderNumber}`
            : null;
  }, [order]);

  const totalAmount = useMemo(() => {
    if (!order) return 0;

    return Number(order.totalGross ?? order.totalPrice ?? 0);
  }, [order]);

  const paidDate = useMemo(() => {
    const dateValue = order?.paidAt || order?.createdAt;

    if (!dateValue) return null;

    try {
      return new Intl.DateTimeFormat(locale, {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateValue));
    } catch {
      return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateValue));
    }
  }, [locale, order?.createdAt, order?.paidAt]);

  useEffect(() => {
    async function verifyPayment() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get("session_id");
        const orderNumber = urlParams.get("order_number");

        if (sessionId) {
          const response = await fetch(
              `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`,
              {
                method: "GET",
                cache: "no-store",
              }
          );

          const data = (await response.json()) as StripeSessionResponse;

          if (!response.ok) {
            setErrorMessage(data.error || "Could not verify payment.");
            setStatus("failed");
            return;
          }

          if (data.stripe?.paymentStatus !== "paid" || !data.order) {
            setErrorMessage("Payment was not confirmed.");
            setStatus("failed");
            return;
          }

          setOrder(data.order);
          setStatus("paid");
          return;
        }

        if (orderNumber) {
          const response = await fetch(
              `/api/orders/paid-status?order_number=${encodeURIComponent(
                  orderNumber
              )}`,
              {
                method: "GET",
                cache: "no-store",
              }
          );

          const data = (await response.json()) as PaidStatusResponse;

          if (!response.ok) {
            setErrorMessage(data.error || "Could not verify payment.");
            setStatus("failed");
            return;
          }

          if (!data.isPaid || !data.order) {
            setErrorMessage("Payment was not confirmed.");
            setStatus("failed");
            return;
          }

          setOrder(data.order);
          setStatus("paid");
          return;
        }

        setErrorMessage("Missing payment reference.");
        setStatus("failed");
      } catch (error) {
        console.error("Payment verification error:", error);
        setErrorMessage("Could not verify payment.");
        setStatus("failed");
      }
    }

    verifyPayment();
  }, []);

  async function handleSendReceipt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order?.orderNumber) {
      setReceiptMessage("Order number is missing.");
      return;
    }

    if (!email.trim()) {
      setReceiptMessage("Please enter your email address.");
      return;
    }

    setIsSendingReceipt(true);
    setReceiptMessage(null);

    try {
      const response = await fetch("/api/orders/send-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setReceiptMessage(data.error || "Could not send receipt.");
        return;
      }

      setReceiptMessage("Receipt has been sent to your email.");
    } catch (error) {
      console.error("Send receipt error:", error);
      setReceiptMessage("Could not send receipt.");
    } finally {
      setIsSendingReceipt(false);
    }
  }

  return (
      <main className="min-h-[80vh] bg-cream px-4 py-12 text-dark sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          {status === "checking" && (
              <div className="glass-card w-full p-8 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/80">
                  <RefreshCw className="h-9 w-9 animate-spin text-paprika" />
                </div>

                <h1 className="mt-6 text-3xl font-black text-dark">
                  Checking payment...
                </h1>

                <p className="mt-3 text-dark/60">
                  Please wait while we confirm your payment.
                </p>
              </div>
          )}

          {status === "paid" && order && (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-xl">
                  <CheckCircle2 className="h-11 w-11" />
                </div>

                <h1 className="mt-6 text-center text-3xl font-black tracking-tight text-dark sm:text-4xl">
                  Payment successful
                </h1>

                <p className="mt-3 text-center text-base leading-7 text-dark/60">
                  Your payment has been confirmed and your order has been sent to
                  the kitchen.
                </p>

                <section className="glass-card mt-8 w-full p-6 sm:p-8">
                  <div className="text-center">
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-paprika/70">
                      Amount paid
                    </p>

                    <p className="mt-2 text-5xl font-black text-dark">
                      {totalAmount.toFixed(0)} kr
                    </p>
                  </div>

                  <div className="my-7 h-px bg-dark/10" />

                  <div className="space-y-5">
                    <InfoRow
                        label="Order number"
                        value={orderDisplayNumber || "—"}
                        icon={<ReceiptText className="h-4 w-4" />}
                    />

                    <InfoRow label="Merchant" value="Nordic Eatery" />

                    <InfoRow
                        label="Payment method"
                        value={
                          order.paymentMethod === "card"
                              ? "Card"
                              : order.paymentMethod === "swish"
                                  ? "Swish"
                                  : order.paymentMethod || "—"
                        }
                        icon={<CreditCard className="h-4 w-4" />}
                    />

                    <InfoRow
                        label="Status"
                        value="Paid"
                        icon={<CheckCircle2 className="h-4 w-4" />}
                    />

                    <InfoRow
                        label="Date"
                        value={paidDate || "—"}
                        icon={<Clock3 className="h-4 w-4" />}
                    />
                  </div>

                  <div className="mt-7 rounded-3xl bg-emerald-50 px-4 py-4 text-center text-sm font-black text-emerald-700">
                    Payment confirmed
                  </div>
                </section>

                <section className="glass-card mt-5 w-full p-6 sm:p-7">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paprika/10 text-paprika">
                      <Mail className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-dark">
                        Receipt by email
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-dark/60">
                        Enter your email address if you want to receive a receipt
                        for this payment.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSendReceipt} className="mt-5 space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="input-field"
                        placeholder="your@email.com"
                    />

                    <button
                        type="submit"
                        disabled={isSendingReceipt}
                        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSendingReceipt ? "Sending..." : "Send receipt to email"}
                    </button>

                    {receiptMessage && (
                        <p className="text-center text-sm font-bold text-dark/60">
                          {receiptMessage}
                        </p>
                    )}
                  </form>
                </section>

                <div className="mt-5 grid w-full gap-3">
                  {order.orderNumber && (
                      <a
                          href={`/api/orders/${order.orderNumber}/receipt`}
                          className="flex h-14 items-center justify-center gap-3 rounded-2xl border border-dark/10 bg-white/80 font-black text-dark transition hover:scale-[1.01]"
                      >
                        <Download className="h-5 w-5" />
                        Download receipt
                      </a>
                  )}

                  <Link
                      href={`/${locale}/order/${order.orderNumber || order.id}`}
                      className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-dark font-black text-white transition hover:scale-[1.01]"
                  >
                    <ReceiptText className="h-5 w-5" />
                    Track order
                  </Link>

                  <Link
                      href={`/${locale}`}
                      className="flex h-14 items-center justify-center gap-3 rounded-2xl border border-dark/10 bg-white/80 font-black text-dark transition hover:scale-[1.01]"
                  >
                    <Home className="h-5 w-5" />
                    Back to home
                  </Link>
                </div>
              </>
          )}

          {status === "failed" && (
              <div className="glass-card w-full p-8 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-paprika/10 text-paprika">
                  <XCircle className="h-10 w-10" />
                </div>

                <h1 className="mt-6 text-3xl font-black text-dark">
                  Payment not confirmed
                </h1>

                <p className="mt-3 text-dark/60">
                  {errorMessage || "We could not confirm your payment."}
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link href={`/${locale}/checkout`} className="btn-primary">
                    Back to checkout
                  </Link>

                  <Link href={`/${locale}/menu`} className="btn-secondary">
                    Back to menu
                  </Link>
                </div>
              </div>
          )}
        </div>
      </main>
  );
}

function InfoRow({
                   label,
                   value,
                   icon,
                 }: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-bold text-dark/55">
          {icon}
          {label}
        </div>

        <div className="text-right text-sm font-black text-dark">{value}</div>
      </div>
  );
}
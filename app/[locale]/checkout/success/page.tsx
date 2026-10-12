"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import { ReceiptActions } from "@/components/ReceiptActions";
import { getPublicPath } from "@/i18n/paths";

type Order = {
  id: string;
  orderNumber: string;
  displayOrderNumber: string | null;
  customerEmail?: string | null;
  paymentStatus: string;
  totalGross: number | null;
  totalPrice: number | null;
};
export default function CheckoutSuccessPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = useEditableTranslations("receipt");
  const [status, setStatus] = useState<"checking" | "paid" | "failed">(
    "checking",
  );
  const [order, setOrder] = useState<Order | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const query = new URLSearchParams(window.location.search);
    const session = query.get("session_id") || "";
    const number = query.get("order_number") || "";
    setSessionId(session);
    setStatus("checking");
    let retries = 0;
    async function verify() {
      try {
        if (!session && !number) {
          setStatus("failed");
          return;
        }
        const url = session
          ? `/api/stripe/session?session_id=${encodeURIComponent(session)}`
          : `/api/orders/paid-status?order_number=${encodeURIComponent(number)}`;
        const response = await fetch(url, {
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal: abort.signal,
        });
        const data = await response.json();
        if (
          response.ok &&
          data.order?.paymentStatus === "paid" &&
          (session ? data.stripe?.paymentStatus === "paid" : data.isPaid)
        ) {
          setOrder(data.order);
          setStatus("paid");
          return;
        }
        if (retries++ < 10 && (response.ok || response.status >= 500)) {
          timer = setTimeout(verify, 2000);
          return;
        }
        setStatus("failed");
      } catch {
        if (!abort.signal.aborted) setStatus("failed");
      }
    }
    void verify();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [attempt]);
  return (
    <main className="bg-cream px-4 py-10 text-dark sm:py-16">
      <section className="mx-auto max-w-lg rounded-3xl bg-white p-6 sm:p-8">
        {status === "paid" && order ? (
          <>
            <CheckCircle2
              className="mx-auto h-12 w-12 text-emerald-600"
              aria-hidden="true"
            />
            <h1 className="mt-4 text-center text-3xl font-black">
              {t.edit("title")}
            </h1>
            <p className="mt-5 text-center text-sm text-dark/60">
              {t.edit("order")}
            </p>
            <p className="mt-1 break-words text-center text-3xl font-black">
              #{order.displayOrderNumber || order.orderNumber}
            </p>
            <p className="mb-6 mt-3 text-center text-lg font-semibold">
              {new Intl.NumberFormat(locale, {
                style: "currency",
                currency: "SEK",
              }).format(Number(order.totalGross ?? order.totalPrice ?? 0))}
            </p>
            <ReceiptActions
              initialEmail={order.customerEmail || ""}
              downloadUrl={`/api/orders/${encodeURIComponent(order.orderNumber)}/receipt${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`}
              emailUrl="/api/orders/send-receipt"
              emailBody={{ orderNumber: order.orderNumber, sessionId }}
            />
            <Link
              href={`/${locale}/order/${encodeURIComponent(order.orderNumber)}`}
              className="mt-6 block text-center text-sm font-semibold underline"
            >
              {t.edit("track")}
            </Link>
          </>
        ) : (
          <div className="py-6 text-center" role="status">
            {status === "checking" && (
              <RefreshCw className="mx-auto mb-4 animate-spin text-paprika" />
            )}
            <h1 className="text-2xl font-bold">
              {t.edit(status === "checking" ? "checking" : "failed")}
            </h1>
            {status === "failed" && (
              <button
                onClick={() => setAttempt((value) => value + 1)}
                className="btn-primary mt-5"
              >
                {t.edit("retry")}
              </button>
            )}
          </div>
        )}
        <Link
          href={getPublicPath(locale, "/menu")}
          className="mt-5 block text-center text-sm text-dark/60 underline"
        >
          {t.edit("back")}
        </Link>
      </section>
    </main>
  );
}

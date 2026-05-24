"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    CheckCircle2,
    Clock3,
    Loader2,
    ReceiptText,
    RefreshCw,
    Smartphone,
    XCircle,
} from "lucide-react";

type PendingStatus = "checking" | "paid" | "failed" | "timeout";

type PaidStatusResponse = {
    success?: boolean;
    error?: string;
    isPaid?: boolean;
    order?: {
        id: string;
        orderNumber: string | null;
        displayOrderNumber: string | null;
        paymentMethod: string | null;
        paymentStatus: string | null;
        totalGross: number | null;
        totalPrice: number | null;
    };
};

export default function SwishPendingPage() {
    const router = useRouter();
    const params = useParams<{ locale?: string | string[] }>();

    const locale = typeof params?.locale === "string" ? params.locale : "sv";

    const [status, setStatus] = useState<PendingStatus>("checking");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [attempts, setAttempts] = useState(0);

    const orderNumber = useMemo(() => {
        if (typeof window === "undefined") return null;

        const searchParams = new URLSearchParams(window.location.search);

        return searchParams.get("order_number");
    }, []);

    useEffect(() => {
        if (!orderNumber) {
            setErrorMessage("Missing order number.");
            setStatus("failed");
            return;
        }

        let isMounted = true;
        let timer: window.ReturnType<typeof window.setTimeout> | null = null;

        async function checkPaymentStatus(attempt: number) {
            try {
                const response = await fetch(
                    `/api/orders/paid-status?order_number=${encodeURIComponent(
                        orderNumber || ""
                    )}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );

                const data = (await response.json()) as PaidStatusResponse;

                if (!isMounted) return;

                if (!response.ok) {
                    setErrorMessage(data.error || "Could not check Swish payment.");
                    setStatus("failed");
                    return;
                }

                if (data.isPaid && data.order?.orderNumber) {
                    setStatus("paid");

                    window.setTimeout(() => {
                        router.replace(
                            `/${locale}/checkout/success?order_number=${encodeURIComponent(
                                data.order?.orderNumber || orderNumber
                            )}`
                        );
                    }, 700);

                    return;
                }

                setAttempts(attempt);

                /**
                 * 60 attempts x 2 seconds = about 2 minutes.
                 * After that we stop polling but keep a manual refresh button.
                 */
                if (attempt >= 60) {
                    setStatus("timeout");
                    setErrorMessage(
                        "We are still waiting for Swish confirmation. Please check your Swish app or try refreshing."
                    );
                    return;
                }

                timer = window.setTimeout(() => {
                    checkPaymentStatus(attempt + 1);
                }, 2000);
            } catch (error) {
                console.error("Swish pending status error:", error);

                if (!isMounted) return;

                setErrorMessage("Could not check Swish payment.");
                setStatus("failed");
            }
        }

        checkPaymentStatus(1);

        return () => {
            isMounted = false;

            if (timer) {
                window.clearTimeout(timer);
            }
        };
    }, [locale, orderNumber, router]);

    function handleManualRefresh() {
        window.location.reload();
    }

    return (
        <main className="min-h-[80vh] bg-cream px-4 py-12 text-dark sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-2xl flex-col items-center">
                <section className="glass-card w-full p-7 text-center sm:p-9">
                    {status === "checking" && (
                        <>
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-paprika/10 text-paprika">
                                <Smartphone className="h-10 w-10" />
                            </div>

                            <h1 className="mt-6 text-3xl font-black tracking-tight text-dark sm:text-4xl">
                                Waiting for Swish payment
                            </h1>

                            <p className="mt-3 text-base leading-7 text-dark/60">
                                Please complete the payment in your Swish app. This page will
                                update automatically when the payment is confirmed.
                            </p>

                            <div className="mt-7 rounded-3xl border border-dark/10 bg-white/70 p-5">
                                <div className="flex items-center justify-center gap-3 text-sm font-black text-dark">
                                    <Loader2 className="h-5 w-5 animate-spin text-paprika" />
                                    Checking payment status...
                                </div>

                                <p className="mt-3 text-xs font-bold text-dark/45">
                                    Attempt {attempts}/60
                                </p>
                            </div>
                        </>
                    )}

                    {status === "paid" && (
                        <>
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-xl">
                                <CheckCircle2 className="h-11 w-11" />
                            </div>

                            <h1 className="mt-6 text-3xl font-black tracking-tight text-dark sm:text-4xl">
                                Payment confirmed
                            </h1>

                            <p className="mt-3 text-base leading-7 text-dark/60">
                                Swish payment has been confirmed. Redirecting you to your
                                receipt page...
                            </p>
                        </>
                    )}

                    {status === "timeout" && (
                        <>
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F6A21A]/15 text-[#A96800]">
                                <Clock3 className="h-10 w-10" />
                            </div>

                            <h1 className="mt-6 text-3xl font-black tracking-tight text-dark sm:text-4xl">
                                Still waiting
                            </h1>

                            <p className="mt-3 text-base leading-7 text-dark/60">
                                {errorMessage ||
                                    "We are still waiting for Swish confirmation."}
                            </p>

                            <div className="mt-6 grid gap-3">
                                <button
                                    type="button"
                                    onClick={handleManualRefresh}
                                    className="btn-primary inline-flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="h-5 w-5" />
                                    Check again
                                </button>

                                <Link href={`/${locale}/checkout`} className="btn-secondary">
                                    Back to checkout
                                </Link>
                            </div>
                        </>
                    )}

                    {status === "failed" && (
                        <>
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-paprika/10 text-paprika">
                                <XCircle className="h-10 w-10" />
                            </div>

                            <h1 className="mt-6 text-3xl font-black tracking-tight text-dark sm:text-4xl">
                                Payment not confirmed
                            </h1>

                            <p className="mt-3 text-base leading-7 text-dark/60">
                                {errorMessage || "Could not confirm your Swish payment."}
                            </p>

                            <div className="mt-6 grid gap-3">
                                <button
                                    type="button"
                                    onClick={handleManualRefresh}
                                    className="btn-primary inline-flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="h-5 w-5" />
                                    Try again
                                </button>

                                <Link href={`/${locale}/checkout`} className="btn-secondary">
                                    Back to checkout
                                </Link>
                            </div>
                        </>
                    )}
                </section>

                {orderNumber ? (
                    <div className="mt-5 flex items-center gap-2 rounded-full border border-dark/10 bg-white/70 px-4 py-2 text-xs font-black text-dark/55">
                        <ReceiptText className="h-4 w-4 text-paprika" />
                        Order: {orderNumber}
                    </div>
                ) : null}
            </div>
        </main>
    );
}
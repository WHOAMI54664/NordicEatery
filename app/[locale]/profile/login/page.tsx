"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, UserRound } from "lucide-react";
import { CustomerOAuthButtons } from "@/components/customer/CustomerOAuthButtons";

const CUSTOMER_PROFILE_STORAGE_KEY = "nordic-eatery-customer-profile-login";

type CustomerProfileResponse = {
    success?: boolean;
    error?: string;
    profile?: {
        id: string;
    };
};

function saveLogin(login: { email: string; phone: string }) {
    window.localStorage.setItem(
        CUSTOMER_PROFILE_STORAGE_KEY,
        JSON.stringify(login)
    );
}

export default function CustomerProfileLoginPage() {
    const router = useRouter();
    const params = useParams<{ locale?: string | string[] }>();

    const locale = typeof params?.locale === "string" ? params.locale : "sv";

    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function handleEmailPhoneLogin(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim();

        if (!cleanEmail || !cleanPhone) {
            setMessage("Please enter your email and phone number.");
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const response = await fetch("/api/customer-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: cleanEmail,
                    phone: cleanPhone,
                }),
            });

            const data = (await response.json()) as CustomerProfileResponse;

            if (!response.ok || !data.profile) {
                setMessage(data.error || "Customer profile not found.");
                return;
            }

            saveLogin({
                email: cleanEmail,
                phone: cleanPhone,
            });

            router.replace(`/${locale}/profile`);
        } catch (error) {
            console.error("Customer login error:", error);
            setMessage("Could not login to profile.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-[80vh] bg-cream px-4 py-10 text-dark sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl">
                <Link
                    href={`/${locale}`}
                    className="inline-flex items-center gap-2 rounded-full border border-dark/10 bg-white/70 px-4 py-2 text-sm font-black text-dark/60 transition hover:text-paprika"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Link>

                <section className="glass-card mt-8 p-6 sm:p-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-paprika/10 text-paprika">
                        <UserRound className="h-8 w-8" />
                    </div>

                    <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] text-dark">
                        Login to profile
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-dark/60">
                        Sign in to view your points, discount and Nordic Eatery customer
                        profile.
                    </p>

                    <div className="mt-7">
                        <CustomerOAuthButtons
                            locale={locale}
                            returnTo={`/${locale}/profile`}
                        />
                    </div>

                    <div className="my-7 flex items-center gap-3">
                        <div className="h-px flex-1 bg-dark/10" />
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-dark/35">
              or
            </span>
                        <div className="h-px flex-1 bg-dark/10" />
                    </div>

                    <form onSubmit={handleEmailPhoneLogin} className="space-y-4">
                        <label>
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-dark">
                <Mail className="h-4 w-4 text-paprika" />
                Email
              </span>

                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="input-field"
                                placeholder="your@email.com"
                            />
                        </label>

                        <label>
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-dark">
                <Phone className="h-4 w-4 text-paprika" />
                Phone
              </span>

                            <input
                                required
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                className="input-field"
                                placeholder="073..."
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading ? "Loading..." : "Login with email + phone"}
                        </button>

                        {message ? (
                            <div className="rounded-2xl border border-paprika/15 bg-paprika/10 p-3 text-sm font-bold text-paprika">
                                {message}
                            </div>
                        ) : null}
                    </form>
                </section>
            </div>
        </main>
    );
}
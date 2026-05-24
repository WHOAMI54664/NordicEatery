"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    BadgePercent,
    Gift,
    LogOut,
    Mail,
    Phone,
    ReceiptText,
    RefreshCw,
    Sparkles,
    UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { CustomerOAuthButtons } from "@/components/customer/CustomerOAuthButtons";

const CUSTOMER_PROFILE_STORAGE_KEY = "nordic-eatery-customer-profile-login";

type CustomerProfile = {
    id: string;

    fullName: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;

    totalOrders: number;
    totalSpentGross: number;
    loyaltyPoints: number;
    discountPercent: number;

    lastOrderAt: string | null;
    createdAt: string | null;
};

type CustomerProfileResponse = {
    success?: boolean;
    error?: string;
    profile?: CustomerProfile;
    authEmail?: string;
};

type SavedCustomerLogin = {
    email: string;
    phone: string;
};

function formatCurrency(value: number, locale: string) {
    return new Intl.NumberFormat(locale === "en" ? "en-SE" : locale, {
        style: "currency",
        currency: "SEK",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(value: string | null, locale: string) {
    if (!value) return "—";

    try {
        return new Intl.DateTimeFormat(locale, {
            timeZone: "Europe/Stockholm",
            year: "numeric",
            month: "short",
            day: "2-digit",
        }).format(new Date(value));
    } catch {
        return new Intl.DateTimeFormat("sv-SE", {
            timeZone: "Europe/Stockholm",
            year: "numeric",
            month: "short",
            day: "2-digit",
        }).format(new Date(value));
    }
}

function getInitials(name: string | null, email: string | null) {
    const source = name?.trim() || email?.trim() || "Customer";

    return source
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

function getNextReward(points: number) {
    if (points < 500) {
        return {
            next: 500,
            label: "5%",
            remaining: 500 - points,
        };
    }

    if (points < 1000) {
        return {
            next: 1000,
            label: "10%",
            remaining: 1000 - points,
        };
    }

    if (points < 2000) {
        return {
            next: 2000,
            label: "15%",
            remaining: 2000 - points,
        };
    }

    if (points < 3000) {
        return {
            next: 3000,
            label: "20%",
            remaining: 3000 - points,
        };
    }

    return {
        next: 3000,
        label: "20%",
        remaining: 0,
    };
}

function readSavedLogin(): SavedCustomerLogin | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY);

        if (!raw) return null;

        const parsed = JSON.parse(raw) as SavedCustomerLogin;

        if (!parsed.email || !parsed.phone) return null;

        return parsed;
    } catch {
        return null;
    }
}

function saveLogin(login: SavedCustomerLogin) {
    window.localStorage.setItem(
        CUSTOMER_PROFILE_STORAGE_KEY,
        JSON.stringify(login)
    );
}

function clearSavedLogin() {
    window.localStorage.removeItem(CUSTOMER_PROFILE_STORAGE_KEY);
}

export default function CustomerProfilePage() {
    const params = useParams<{ locale?: string | string[] }>();
    const locale = typeof params?.locale === "string" ? params.locale : "sv";

    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [authEmail, setAuthEmail] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isAutoChecking, setIsAutoChecking] = useState(true);
    const [message, setMessage] = useState<string | null>(null);

    const initials = useMemo(() => {
        return getInitials(profile?.fullName || null, profile?.email || null);
    }, [profile?.email, profile?.fullName]);

    const reward = useMemo(() => {
        return getNextReward(profile?.loyaltyPoints || 0);
    }, [profile?.loyaltyPoints]);

    const progressPercent = useMemo(() => {
        const points = profile?.loyaltyPoints || 0;

        if (points >= 3000) return 100;

        if (points < 500) return Math.min(100, Math.round((points / 500) * 100));
        if (points < 1000) return Math.round(((points - 500) / 500) * 100);
        if (points < 2000) return Math.round(((points - 1000) / 1000) * 100);

        return Math.round(((points - 2000) / 1000) * 100);
    }, [profile?.loyaltyPoints]);

    async function loadProfileByEmailAndPhone(params: {
        email: string;
        phone: string;
        shouldSaveLogin?: boolean;
    }) {
        setIsLoading(true);
        setMessage(null);

        try {
            const response = await fetch("/api/customer-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: params.email,
                    phone: params.phone,
                }),
            });

            const data = (await response.json()) as CustomerProfileResponse;

            if (!response.ok || !data.profile) {
                setProfile(null);
                setMessage(data.error || "Could not load your profile.");

                if (params.shouldSaveLogin) {
                    clearSavedLogin();
                }

                return;
            }

            setProfile(data.profile);
            setEmail(params.email);
            setPhone(params.phone);
            setAuthEmail(null);

            if (params.shouldSaveLogin) {
                saveLogin({
                    email: params.email,
                    phone: params.phone,
                });
            }
        } catch (error) {
            console.error("Customer profile page error:", error);
            setProfile(null);
            setMessage("Could not load your profile.");
        } finally {
            setIsLoading(false);
            setIsAutoChecking(false);
        }
    }

    async function loadProfileByAuth() {
        setIsLoading(true);
        setMessage(null);

        try {
            const response = await fetch("/api/customer-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    useAuth: true,
                }),
            });

            const data = (await response.json()) as CustomerProfileResponse;

            if (!response.ok || !data.profile) {
                setProfile(null);
                setAuthEmail(data.authEmail || null);
                setMessage(
                    data.error ||
                    "No loyalty profile found for this social account email."
                );
                return;
            }

            setProfile(data.profile);
            setEmail(data.profile.email || "");
            setPhone(data.profile.phone || "");
            setAuthEmail(data.profile.email || null);
        } catch (error) {
            console.error("Customer auth profile error:", error);
            setProfile(null);
            setMessage("Could not load your profile.");
        } finally {
            setIsLoading(false);
            setIsAutoChecking(false);
        }
    }

    useEffect(() => {
        async function checkInitialLogin() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                setAuthEmail(user.email || null);
                await loadProfileByAuth();
                return;
            }

            const savedLogin = readSavedLogin();

            if (!savedLogin) {
                setIsAutoChecking(false);
                return;
            }

            setEmail(savedLogin.email);
            setPhone(savedLogin.phone);

            await loadProfileByEmailAndPhone({
                email: savedLogin.email,
                phone: savedLogin.phone,
                shouldSaveLogin: false,
            });
        }

        checkInitialLogin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim();

        if (!cleanEmail || !cleanPhone) {
            setMessage("Please enter your email and phone number.");
            return;
        }

        await loadProfileByEmailAndPhone({
            email: cleanEmail,
            phone: cleanPhone,
            shouldSaveLogin: true,
        });
    }

    async function handleLogout() {
        clearSavedLogin();

        await supabase.auth.signOut();

        setProfile(null);
        setEmail("");
        setPhone("");
        setAuthEmail(null);
        setMessage(null);
    }

    function handleRefresh() {
        if (authEmail) {
            loadProfileByAuth();
            return;
        }

        if (!email.trim() || !phone.trim()) return;

        loadProfileByEmailAndPhone({
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            shouldSaveLogin: true,
        });
    }

    return (
        <main className="min-h-[80vh] bg-cream px-4 py-10 text-dark sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <Link
                    href={`/${locale}`}
                    className="inline-flex items-center gap-2 rounded-full border border-dark/10 bg-white/70 px-4 py-2 text-sm font-black text-dark/60 transition hover:text-paprika"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Link>

                {isAutoChecking ? (
                    <section className="glass-card mt-8 flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
                        <RefreshCw className="h-10 w-10 animate-spin text-paprika" />

                        <h1 className="mt-5 text-3xl font-black text-dark">
                            Checking profile...
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-dark/55">
                            Please wait while we load your customer profile.
                        </p>
                    </section>
                ) : (
                    <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                        <section className="glass-card p-6 sm:p-8">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paprika/10 text-paprika">
                                <UserRound className="h-7 w-7" />
                            </div>

                            <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-dark sm:text-4xl">
                                {profile ? "Profile login" : "Login to profile"}
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-dark/60">
                                Login with Apple, Google or GitHub. If your social account email
                                matches your loyalty profile, your points will load
                                automatically.
                            </p>

                            {!profile ? (
                                <div className="mt-6 space-y-6">
                                    <CustomerOAuthButtons locale={locale} />

                                    <div className="flex items-center gap-3">
                                        <div className="h-px flex-1 bg-dark/10" />
                                        <span className="text-xs font-black uppercase tracking-[0.18em] text-dark/35">
                      or
                    </span>
                                        <div className="h-px flex-1 bg-dark/10" />
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <label>
                      <span className="mb-2 block text-sm font-bold text-dark">
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
                      <span className="mb-2 block text-sm font-bold text-dark">
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
                                </div>
                            ) : (
                                <div className="mt-6 space-y-3">
                                    <div className="rounded-3xl border border-dark/10 bg-white/70 p-4">
                                        <p className="text-xs font-black uppercase tracking-[0.18em] text-dark/40">
                                            Logged in as
                                        </p>

                                        <p className="mt-2 text-lg font-black text-dark">
                                            {profile.fullName || "Customer"}
                                        </p>

                                        <p className="mt-1 text-sm font-bold text-dark/50">
                                            {profile.email}
                                        </p>

                                        {authEmail ? (
                                            <p className="mt-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                                                Social login active
                                            </p>
                                        ) : null}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleRefresh}
                                        disabled={isLoading}
                                        className="btn-secondary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <RefreshCw
                                            className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
                                        />
                                        Refresh profile
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-paprika/15 bg-paprika/10 px-5 py-3 font-black text-paprika transition hover:bg-paprika hover:text-white"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </section>

                        <section className="glass-card overflow-hidden p-6 sm:p-8">
                            {!profile ? (
                                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/80 text-dark/25">
                                        <UserRound className="h-11 w-11" />
                                    </div>

                                    <h2 className="mt-5 text-2xl font-black text-dark">
                                        Your profile will appear here
                                    </h2>

                                    <p className="mt-2 max-w-md text-sm leading-6 text-dark/55">
                                        After login, you will see your points, discount, orders and
                                        contact details.
                                    </p>

                                    {message ? (
                                        <div className="mt-5 max-w-md rounded-2xl border border-paprika/15 bg-paprika/10 p-4 text-sm font-bold leading-6 text-paprika">
                                            {message}
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                                        {profile.avatarUrl ? (
                                            <img
                                                src={profile.avatarUrl}
                                                alt={profile.fullName || "Customer"}
                                                className="h-24 w-24 rounded-full object-cover shadow-xl"
                                            />
                                        ) : (
                                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-paprika text-3xl font-black text-white shadow-xl">
                                                {initials}
                                            </div>
                                        )}

                                        <div className="min-w-0">
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-paprika/70">
                                                Nordic Eatery member
                                            </p>

                                            <h2 className="mt-1 truncate text-3xl font-black tracking-[-0.04em] text-dark">
                                                {profile.fullName || "Customer"}
                                            </h2>

                                            <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-dark/10 bg-white/70 px-3 py-1 text-xs font-bold text-dark/55">
                          <Mail className="h-3.5 w-3.5" />
                            {profile.email}
                        </span>

                                                <span className="inline-flex items-center gap-2 rounded-full border border-dark/10 bg-white/70 px-3 py-1 text-xs font-bold text-dark/55">
                          <Phone className="h-3.5 w-3.5" />
                                                    {profile.phone}
                        </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                        <ProfileStatCard
                                            title="Points"
                                            value={String(profile.loyaltyPoints)}
                                            icon={<Gift className="h-5 w-5" />}
                                        />

                                        <ProfileStatCard
                                            title="Discount"
                                            value={`${profile.discountPercent}%`}
                                            icon={<BadgePercent className="h-5 w-5" />}
                                        />

                                        <ProfileStatCard
                                            title="Orders"
                                            value={String(profile.totalOrders)}
                                            icon={<ReceiptText className="h-5 w-5" />}
                                        />
                                    </div>

                                    <section className="mt-5 rounded-[2rem] border border-dark/10 bg-white/70 p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paprika/10 text-paprika">
                                                <Sparkles className="h-5 w-5" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="font-black text-dark">
                                                            Next reward: {reward.label}
                                                        </p>

                                                        <p className="mt-1 text-sm leading-6 text-dark/55">
                                                            {reward.remaining > 0
                                                                ? `${reward.remaining} more points to reach ${reward.label} discount.`
                                                                : "You have reached the maximum discount level."}
                                                        </p>
                                                    </div>

                                                    <div className="text-left sm:text-right">
                                                        <p className="text-xs font-bold text-dark/45">
                                                            Total spent
                                                        </p>
                                                        <p className="font-black text-dark">
                                                            {formatCurrency(
                                                                profile.totalSpentGross,
                                                                locale
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 h-3 overflow-hidden rounded-full bg-dark/10">
                                                    <div
                                                        className="h-full rounded-full bg-paprika transition-all"
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="mt-5 grid gap-3 rounded-[2rem] border border-dark/10 bg-white/60 p-5 text-sm sm:grid-cols-2">
                                        <div>
                                            <p className="font-bold text-dark/45">Last order</p>
                                            <p className="mt-1 font-black text-dark">
                                                {formatDate(profile.lastOrderAt, locale)}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="font-bold text-dark/45">Member since</p>
                                            <p className="mt-1 font-black text-dark">
                                                {formatDate(profile.createdAt, locale)}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}

function ProfileStatCard({
                             title,
                             value,
                             icon,
                         }: {
    title: string;
    value: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-[1.5rem] border border-dark/10 bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-dark/50">{title}</p>
                <div className="text-paprika">{icon}</div>
            </div>

            <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-dark">
                {value}
            </p>
        </div>
    );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
            label: "5%",
            remaining: 500 - points,
        };
    }

    if (points < 1000) {
        return {
            label: "10%",
            remaining: 1000 - points,
        };
    }

    if (points < 2000) {
        return {
            label: "15%",
            remaining: 2000 - points,
        };
    }

    if (points < 3000) {
        return {
            label: "20%",
            remaining: 3000 - points,
        };
    }

    return {
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

function clearSavedLogin() {
    window.localStorage.removeItem(CUSTOMER_PROFILE_STORAGE_KEY);
}

export default function CustomerProfilePage() {
    const router = useRouter();
    const params = useParams<{ locale?: string | string[] }>();

    const locale = typeof params?.locale === "string" ? params.locale : "sv";
    const supabase = createClient();

    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [authEmail, setAuthEmail] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(true);
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

    async function loadProfileByAuth() {
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
            setMessage(data.error || "Could not load your profile.");
            return;
        }

        setProfile(data.profile);
        setAuthEmail(data.profile.email || null);
        setMessage(null);
    }

    async function loadProfileByEmailPhone(email: string, phone: string) {
        const response = await fetch("/api/customer-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                phone,
            }),
        });

        const data = (await response.json()) as CustomerProfileResponse;

        if (!response.ok || !data.profile) {
            setProfile(null);
            setMessage(data.error || "Could not load your profile.");
            return;
        }

        setProfile(data.profile);
        setAuthEmail(null);
        setMessage(null);
    }

    async function checkProfileAccess() {
        setIsLoading(true);

        try {
            /*
             * After OAuth callback, Supabase session/cookies can need
             * a short moment before the client can read them.
             */
            await new Promise((resolve) => setTimeout(resolve, 400));

            const {
                data: { session },
            } = await supabase.auth.getSession();

            console.log("CUSTOMER PROFILE SESSION:", {
                hasSession: Boolean(session),
                email: session?.user?.email,
            });

            if (session?.user) {
                setAuthEmail(session.user.email || null);
                await loadProfileByAuth();
                return;
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            console.log("CUSTOMER PROFILE USER:", {
                hasUser: Boolean(user),
                email: user?.email,
            });

            if (user) {
                setAuthEmail(user.email || null);
                await loadProfileByAuth();
                return;
            }

            const savedLogin = readSavedLogin();

            if (savedLogin) {
                await loadProfileByEmailPhone(savedLogin.email, savedLogin.phone);
                return;
            }

            router.replace(`/${locale}/profile/login`);
        } catch (error) {
            console.error("Profile load error:", error);
            setMessage("Could not load your profile.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        checkProfileAccess();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleLogout() {
        clearSavedLogin();
        await supabase.auth.signOut();

        setProfile(null);
        setAuthEmail(null);
        setMessage(null);

        router.replace(`/${locale}/profile/login`);
    }

    async function handleRefresh() {
        await checkProfileAccess();
    }

    if (isLoading) {
        return (
            <main className="flex min-h-[80vh] items-center justify-center bg-cream px-6 text-dark">
                <section className="glass-card w-full max-w-md p-8 text-center">
                    <RefreshCw className="mx-auto h-10 w-10 animate-spin text-paprika" />

                    <h1 className="mt-5 text-3xl font-black text-dark">
                        Loading profile...
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-dark/55">
                        Please wait while we load your customer profile.
                    </p>
                </section>
            </main>
        );
    }

    if (!profile) {
        return (
            <main className="flex min-h-[80vh] items-center justify-center bg-cream px-6 text-dark">
                <section className="glass-card w-full max-w-md p-8 text-center">
                    <UserRound className="mx-auto h-12 w-12 text-paprika" />

                    <h1 className="mt-5 text-3xl font-black text-dark">
                        Profile not found
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-dark/60">
                        {message ||
                            "We could not find your customer profile. Please login again or create a profile during checkout."}
                    </p>

                    <Link href={`/${locale}/profile/login`} className="btn-primary mt-6">
                        Login again
                    </Link>
                </section>
            </main>
        );
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

                <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                    <section className="glass-card p-6 sm:p-8">
                        <div className="flex flex-col items-center text-center">
                            {profile.avatarUrl ? (
                                <img
                                    src={profile.avatarUrl}
                                    alt={profile.fullName || "Customer"}
                                    className="h-28 w-28 rounded-full object-cover shadow-xl"
                                />
                            ) : (
                                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-paprika text-4xl font-black text-white shadow-xl">
                                    {initials}
                                </div>
                            )}

                            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-paprika/70">
                                Nordic Eatery member
                            </p>

                            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-dark">
                                {profile.fullName || "Customer"}
                            </h1>

                            <div className="mt-4 flex flex-col gap-2 text-sm font-bold text-dark/55">
                                <span className="inline-flex items-center justify-center gap-2">
                                    <Mail className="h-4 w-4 text-paprika" />
                                    {profile.email || "No email"}
                                </span>

                                <span className="inline-flex items-center justify-center gap-2">
                                    <Phone className="h-4 w-4 text-paprika" />
                                    {profile.phone || "Phone not added yet"}
                                </span>
                            </div>

                            {authEmail ? (
                                <p className="mt-4 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                                    Social login active
                                </p>
                            ) : null}
                        </div>

                        <div className="mt-7 space-y-3">
                            <button
                                type="button"
                                onClick={handleRefresh}
                                className="btn-secondary flex w-full items-center justify-center gap-2"
                            >
                                <RefreshCw className="h-5 w-5" />
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
                    </section>

                    <section className="glass-card p-6 sm:p-8">
                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.22em] text-paprika/70">
                                My rewards
                            </p>

                            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-dark">
                                Your loyalty profile
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-dark/60">
                                View your collected points, current discount and order activity.
                            </p>
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
                                                {formatCurrency(profile.totalSpentGross, locale)}
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

                        {!profile.phone ? (
                            <div className="mt-5 rounded-3xl border border-paprika/15 bg-paprika/10 p-4 text-sm font-bold leading-6 text-paprika">
                                Add your phone later to connect orders made with phone number to
                                this profile.
                            </div>
                        ) : null}
                    </section>
                </div>
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
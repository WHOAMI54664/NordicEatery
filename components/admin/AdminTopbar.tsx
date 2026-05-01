"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    Bell,
    ClipboardList,
    Package,
    Plus,
    Search,
    UserRound,
    UsersRound
} from "lucide-react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type AdminTopbarProps = {
    displayName?: string;
};

type SearchResult = {
    id: string;
    type: "order" | "product" | "staff";
    title: string;
    subtitle: string;
    href: string;
};

function getGreeting(t: ReturnType<typeof useTranslations>) {
    const hour = new Date().getHours();

    if (hour < 12) return t("topbar.goodMorning");
    if (hour < 18) return t("topbar.goodAfternoon");

    return t("topbar.goodEvening");
}

function getResultIcon(type: SearchResult["type"]) {
    switch (type) {
        case "order":
            return ClipboardList;
        case "product":
            return Package;
        case "staff":
            return UsersRound;
        default:
            return Search;
    }
}

export function AdminTopbar({ displayName = "Admin" }: AdminTopbarProps) {
    const t = useTranslations("admin");

    const params = useParams();
    const locale = String(params.locale || "en");

    const supabase = useMemo(() => createClient(), []);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showGreeting, setShowGreeting] = useState(true);

    const greeting = getGreeting(t);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setShowGreeting(false);
        }, 5200);

        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        const searchValue = query.trim();

        if (searchValue.length < 2) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        let isActive = true;

        async function searchData() {
            setIsSearching(true);

            const [ordersRes, productsRes, staffRes] = await Promise.all([
                supabase
                    .from("orders")
                    .select(
                        "id, order_number, customer_name, customer_phone, total_price, status"
                    )
                    .or(
                        `order_number.ilike.%${searchValue}%,customer_name.ilike.%${searchValue}%,customer_phone.ilike.%${searchValue}%`
                    )
                    .limit(4),

                supabase
                    .from("products")
                    .select("id, name, category, price, is_available")
                    .or(
                        `id.ilike.%${searchValue}%,name.ilike.%${searchValue}%,category.ilike.%${searchValue}%`
                    )
                    .limit(4),

                supabase
                    .from("profiles")
                    .select("id, email, full_name, role")
                    .or(
                        `email.ilike.%${searchValue}%,full_name.ilike.%${searchValue}%,role.ilike.%${searchValue}%`
                    )
                    .limit(4)
            ]);

            if (!isActive) return;

            const orderResults: SearchResult[] =
                ordersRes.data?.map((order) => ({
                    id: order.id,
                    type: "order",
                    title: order.order_number || `${t("table.order")} ${order.id.slice(0, 8)}`,
                    subtitle: `${order.customer_name || t("table.customer")} · ${
                        order.total_price || 0
                    } kr · ${order.status}`,
                    href: `/${locale}/admin/orders`
                })) || [];

            const productResults: SearchResult[] =
                productsRes.data?.map((product) => ({
                    id: product.id,
                    type: "product",
                    title: product.name || product.id,
                    subtitle: `${product.category || t("common.products")} · ${
                        product.price || 0
                    } kr`,
                    href: `/${locale}/admin/products/${product.id}/edit`
                })) || [];

            const staffResults: SearchResult[] =
                staffRes.data?.map((staff) => ({
                    id: staff.id,
                    type: "staff",
                    title: staff.full_name || staff.email || t("account.staffMember"),
                    subtitle: `${staff.role || "staff"} · ${
                        staff.email || t("account.noEmail")
                    }`,
                    href: `/${locale}/admin/staff`
                })) || [];

            setResults([...orderResults, ...productResults, ...staffResults].slice(0, 8));
            setIsSearching(false);
        }

        const timer = window.setTimeout(searchData, 250);

        return () => {
            isActive = false;
            window.clearTimeout(timer);
        };
    }, [query, locale, supabase, t]);

    return (
        <header
            className={`relative z-50 overflow-visible rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl transition-all duration-700 ${
                showGreeting ? "p-5 lg:p-6" : "p-3 lg:p-4"
            }`}
        >
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_36%)]" />

            <div
                className={`relative z-[60] flex flex-col gap-5 transition-all duration-700 ${
                    showGreeting
                        ? "xl:flex-row xl:items-center xl:justify-between"
                        : "xl:flex-row xl:items-center xl:justify-end"
                }`}
            >
                <div
                    className={`grid transition-all duration-700 ${
                        showGreeting
                            ? "grid-rows-[1fr] opacity-100"
                            : "pointer-events-none grid-rows-[0fr] opacity-0"
                    }`}
                >
                    <div className="overflow-hidden">
                        <div className="inline-flex rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                            {t("topbar.system")}
                        </div>

                        <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                            {greeting}, {displayName}
                            <span className="ml-2 inline-block origin-[70%_70%] translate-y-1 animate-admin-wave">
                👋
              </span>
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                            {t("topbar.subtitle")}
                        </p>
                    </div>
                </div>

                <div
                    className={`flex flex-col gap-3 transition-all duration-700 sm:flex-row sm:items-center ${
                        showGreeting ? "" : "w-full justify-end"
                    }`}
                >
                    <div
                        className={`relative z-[80] min-w-0 transition-all duration-700 ${
                            showGreeting ? "sm:w-[420px]" : "sm:w-[520px]"
                        }`}
                    >
                        <label
                            className={`flex min-w-0 items-center gap-3 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 text-[#7B6A61] shadow-inner shadow-[#4C2314]/5 transition-all duration-700 ${
                                showGreeting ? "h-12" : "h-11"
                            }`}
                        >
                            <Search className="h-4 w-4 shrink-0" />

                            <input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={t("common.searchPlaceholder")}
                                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#25120F] outline-none placeholder:text-[#A39388]"
                            />
                        </label>

                        {query.trim().length >= 2 ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[999] overflow-hidden rounded-[1.5rem] border border-[#EADDCF] bg-[#FFFCF6] p-2 shadow-2xl shadow-[#4C2314]/20 backdrop-blur-2xl">
                                {isSearching ? (
                                    <div className="px-4 py-4 text-sm font-black text-[#7B6A61]">
                                        {t("topbar.searching")}
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="space-y-1">
                                        {results.map((result) => {
                                            const Icon = getResultIcon(result.type);

                                            return (
                                                <Link
                                                    key={`${result.type}-${result.id}`}
                                                    href={result.href}
                                                    onClick={() => setQuery("")}
                                                    className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-[#E51B23]/8"
                                                >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                            <Icon className="h-4 w-4 text-[#C7192E]" />
                          </span>

                                                    <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-[#25120F]">
                              {result.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-medium text-[#7B6A61]">
                              {result.subtitle}
                            </span>
                          </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="px-4 py-4 text-sm font-black text-[#7B6A61]">
                                        {t("topbar.noResults")}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <button
                        type="button"
                        className={`flex items-center justify-center rounded-2xl border border-[#EADDCF] bg-white/70 text-[#25120F] transition-all duration-700 hover:bg-white ${
                            showGreeting ? "h-12 w-12" : "h-11 w-11"
                        }`}
                        aria-label={t("topbar.notifications")}
                    >
                        <Bell className="h-4 w-4" />
                    </button>

                    <Link
                        href={`/${locale}/admin/account`}
                        className={`flex items-center gap-3 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 text-sm font-black text-[#25120F] transition-all duration-700 hover:bg-white ${
                            showGreeting ? "h-12" : "h-11"
                        }`}
                    >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E51B23]/10 text-[#C7192E]">
              <UserRound className="h-4 w-4" />
            </span>
                        {displayName}
                    </Link>

                    <Link
                        href={`/${locale}/admin/products/new`}
                        className={`flex items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-5 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition-all duration-700 hover:bg-[#C7192E] ${
                            showGreeting ? "h-12" : "h-11"
                        }`}
                    >
                        <Plus className="h-4 w-4" />
                        {t("common.createNew")}
                    </Link>
                </div>
            </div>

            <style jsx>{`
                @keyframes admin-wave {
                    0% {
                        transform: rotate(0deg);
                    }
                    10% {
                        transform: rotate(16deg);
                    }
                    20% {
                        transform: rotate(-10deg);
                    }
                    30% {
                        transform: rotate(16deg);
                    }
                    40% {
                        transform: rotate(-6deg);
                    }
                    50% {
                        transform: rotate(12deg);
                    }
                    60% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(0deg);
                    }
                }

                .animate-admin-wave {
                    animation: admin-wave 1.35s ease-in-out 0.35s 3;
                }
            `}</style>
        </header>
    );
}
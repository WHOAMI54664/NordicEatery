"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import {
    BarChart3,
    BookOpen,
    CalendarDays,
    ChefHat,
    ClipboardList,
    Flame,
    Home,
    LineChart,
    MenuSquare,
    Settings,
    ShoppingBag,
    Users
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type SidebarProfile = {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
};

const mainNavItems = [
    { label: "Dashboard", href: "/admin", icon: Home },
    { label: "Orders", href: "/admin/orders", icon: ClipboardList },
    { label: "Menu", href: "/admin/menu", icon: MenuSquare },
    { label: "Products", href: "/admin/products", icon: ChefHat },
    { label: "Kitchen", href: "/admin/kitchen", icon: ShoppingBag },
    { label: "Reservations", href: "/admin/reservations", icon: CalendarDays }
];

const secondaryNavItems = [
    { label: "Analytics", href: "/admin/analytics", icon: LineChart },
    { label: "Staff", href: "/admin/staff", icon: Users },
    { label: "Settings", href: "/admin/settings", icon: Settings },
    { label: "Docs", href: "/admin/documentation", icon: BookOpen }
];

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function AdminSidebar() {
    const params = useParams();
    const pathname = usePathname();

    const locale = String(params.locale || "en");
    const supabase = useMemo(() => createClient(), []);

    const [profile, setProfile] = useState<SidebarProfile | null>(null);

    function isActive(href: string) {
        const fullHref = `/${locale}${href}`;

        if (href === "/admin") {
            return pathname === fullHref;
        }

        return pathname.startsWith(fullHref);
    }

    function getHref(href: string) {
        return `/${locale}${href}`;
    }

    useEffect(() => {
        let isMounted = true;

        async function loadProfile() {
            const {
                data: { user }
            } = await supabase.auth.getUser();

            if (!user) {
                if (isMounted) setProfile(null);
                return;
            }

            const { data } = await supabase
                .from("profiles")
                .select("full_name, avatar_url, email")
                .eq("id", user.id)
                .single();

            if (!isMounted) return;

            setProfile({
                full_name: data?.full_name || null,
                avatar_url: data?.avatar_url || null,
                email: data?.email || user.email || null
            });
        }

        loadProfile();

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange(() => {
            loadProfile();
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    const displayName =
        profile?.full_name?.trim() ||
        profile?.email?.split("@")[0] ||
        "Admin user";

    return (
        <aside className="hidden w-[290px] shrink-0 border-r border-[#EADDCF] bg-[#FFF4E3]/95 p-4 backdrop-blur-2xl lg:block">
            <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col">
                <Link
                    href={`/${locale}/admin/account`}
                    className="group flex items-center gap-3 rounded-[1.5rem] border border-[#EADDCF] bg-[#FFFCF6] px-3.5 py-3 shadow-sm shadow-[#4C2314]/5 transition hover:bg-white"
                >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/10 text-[#C7192E]">
                        {profile?.avatar_url ? (
                            <Image
                                src={profile.avatar_url}
                                alt={displayName}
                                fill
                                sizes="48px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <Flame className="h-5 w-5" />
                            </div>
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className="truncate text-base font-black leading-none tracking-[-0.03em] text-[#25120F]">
                            {displayName}
                        </div>

                        <div className="mt-1 text-xs font-semibold text-[#7B6A61]">
                            Admin CRM
                        </div>
                    </div>
                </Link>

                <div className="mt-5">
                    <p className="px-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#A39388]">
                        Management
                    </p>

                    <nav className="mt-2.5 space-y-1">
                        {mainNavItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={getHref(item.href)}
                                    className={cn(
                                        "group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition",
                                        active
                                            ? "border border-[#E51B23]/20 bg-[#E51B23]/10 text-[#C7192E]"
                                            : "text-[#6F5E55] hover:bg-white/70 hover:text-[#25120F]"
                                    )}
                                >
                                    {active ? (
                                        <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-[#E51B23]" />
                                    ) : null}

                                    <Icon
                                        className={cn(
                                            "h-4 w-4 transition",
                                            active
                                                ? "text-[#E51B23]"
                                                : "text-[#A39388] group-hover:text-[#C7192E]"
                                        )}
                                    />

                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-5">
                    <p className="px-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#A39388]">
                        Business
                    </p>

                    <nav className="mt-2.5 space-y-1">
                        {secondaryNavItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={getHref(item.href)}
                                    className={cn(
                                        "group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition",
                                        active
                                            ? "border border-[#E51B23]/20 bg-[#E51B23]/10 text-[#C7192E]"
                                            : "text-[#6F5E55] hover:bg-white/70 hover:text-[#25120F]"
                                    )}
                                >
                                    {active ? (
                                        <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-[#E51B23]" />
                                    ) : null}

                                    <Icon
                                        className={cn(
                                            "h-4 w-4 transition",
                                            active
                                                ? "text-[#E51B23]"
                                                : "text-[#A39388] group-hover:text-[#C7192E]"
                                        )}
                                    />

                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto pt-4">
                    <div className="rounded-[1.4rem] border border-[#EADDCF] bg-[linear-gradient(180deg,rgba(255,252,246,0.98)_0%,rgba(255,247,240,0.96)_100%)] shadow-sm shadow-[#4C2314]/5">
                        <div className="p-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                                    <BarChart3 className="h-4 w-4 text-[#C7192E]" />
                                </div>

                                <div>
                                    <h3 className="text-sm font-black text-[#25120F]">
                                        Need help?
                                    </h3>

                                    <p className="mt-0.5 text-xs font-medium leading-4 text-[#7B6A61]">
                                        Docs & support
                                    </p>
                                </div>
                            </div>

                            <Link
                                href={`/${locale}/admin/documentation`}
                                className="mt-3 flex w-full items-center justify-center rounded-2xl bg-[#E51B23] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-[#E51B23]/15 transition hover:bg-[#C7192E]"
                            >
                                Documentation
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
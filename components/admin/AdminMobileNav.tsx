"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminMobileNav() {
    const t = useTranslations("admin");
    const params = useParams();
    const pathname = usePathname();

    const locale = String(params.locale || "en");
    const [isOpen, setIsOpen] = useState(false);

    // Автоматически закрываем меню после перехода на другую страницу
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Запрещаем прокрутку страницы под открытым меню
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    function getCurrentPageTitle() {
        const adminBase = `/${locale}/admin`;

        if (pathname === adminBase) {
            return t("common.dashboard");
        }

        if (pathname.startsWith(`${adminBase}/orders`)) {
            return t("common.orders");
        }

        if (pathname.startsWith(`${adminBase}/menu`)) {
            return t("common.menu");
        }

        if (pathname.startsWith(`${adminBase}/products`)) {
            return t("common.products");
        }

        if (pathname.startsWith(`${adminBase}/kitchen`)) {
            return t("common.kitchen");
        }

        if (pathname.startsWith(`${adminBase}/reservations`)) {
            return t("common.reservations");
        }

        if (pathname.startsWith(`${adminBase}/analytics`)) {
            return t("common.analytics");
        }

        if (pathname.startsWith(`${adminBase}/reports`)) {
            return t("common.reports");
        }

        if (pathname.startsWith(`${adminBase}/staff`)) {
            return t("common.staff");
        }

        if (pathname.startsWith(`${adminBase}/settings`)) {
            return t("common.settings");
        }

        if (pathname.startsWith(`${adminBase}/documentation`)) {
            return t("common.docs");
        }

        return "Admin";
    }

    const currentPageTitle = getCurrentPageTitle();

    return (
        <>
            {/* Верхняя мобильная панель */}
            <header className="sticky top-0 z-40 border-b border-white/70 bg-[#FFF7EA]/85 px-3 py-3 backdrop-blur-2xl lg:hidden sm:px-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#B51F26]/70">
                            Nordic Eatery
                        </p>

                        <h1 className="truncate text-lg font-black tracking-[-0.03em] text-[#25120F]">
                            {currentPageTitle}
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        aria-label="Open admin menu"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-[#25120F] shadow-[0_16px_40px_rgba(76,35,20,0.10)] backdrop-blur-xl transition hover:bg-white active:scale-[0.98]"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Мобильное выезжающее меню */}
            <div
                className={`fixed inset-0 z-[100] lg:hidden ${
                    isOpen ? "pointer-events-auto" : "pointer-events-none"
                }`}
            >
                {/* Затемнение фона */}
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close admin menu"
                    className={`absolute inset-0 bg-[#25120F]/45 backdrop-blur-[2px] transition-opacity duration-300 ${
                        isOpen ? "opacity-100" : "opacity-0"
                    }`}
                />

                {/* Панель меню */}
                <aside
                    className={`absolute left-0 top-0 h-full w-[min(88vw,350px)] overflow-y-auto border-r border-white/75 bg-[#FFF4E3] shadow-[28px_0_90px_rgba(37,18,15,0.28)] transition-transform duration-300 ease-out ${
                        isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#EADDCF] bg-[#FFF4E3]/95 px-4 py-4 backdrop-blur-2xl">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#B51F26]/70">
                                Nordic Eatery
                            </p>

                            <p className="text-lg font-black tracking-[-0.03em] text-[#25120F]">
                                Admin Menu
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close admin menu"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-[#25120F] shadow-sm transition hover:bg-white active:scale-[0.98]"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <AdminSidebar
                        variant="mobile"
                        onNavigate={() => setIsOpen(false)}
                    />
                </aside>
            </div>
        </>
    );
}
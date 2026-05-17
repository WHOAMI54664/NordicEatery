"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Menu, ShoppingBag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/CartProvider";
import { StaffAccountMenu } from "@/components/StaffAccountMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { EditableText } from "@/components/EditableText";

type HeaderClientProps = {
    locale: string;
    canEdit: boolean;
    editableContent: Record<string, string>;
};

function textFromContent(
    editableContent: Record<string, string>,
    key: string,
    fallback: string
) {
    return editableContent[key] || fallback;
}

export function HeaderClient({
                                 locale,
                                 canEdit,
                                 editableContent,
                             }: HeaderClientProps) {
    const t = useTranslations("nav");
    const { totalItems } = useCart();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    function text(key: string, fallbackKey: string) {
        return textFromContent(editableContent, key, t(fallbackKey));
    }

    const cartLabel =
        totalItems > 0
            ? `${text("header.cart", "cart")}, ${totalItems}`
            : text("header.cart", "cart");

    const navLinks = [
        {
            href: "/menu",
            label: text("header.menu", "menu"),
        },
        {
            href: "/about",
            label: text("header.about", "about"),
        },
        {
            href: "/booking",
            label: text("header.booking", "booking"),
        },
        {
            href: "/mikes",
            label: text("header.mikes", "mikes"),
        },
        {
            href: "/catering",
            label: text("header.catering", "catering"),
        },
        {
            href: "/contact",
            label: text("header.contact", "contact"),
        },
        {
            href: "/support",
            label: text("header.support", "support"),
        },
    ];

    function localePath(path: string) {
        return `/${locale}${path}`;
    }

    function closeMenu() {
        setIsMenuOpen(false);
    }

    return (
        <header className="sticky top-0 z-50 border-b border-white/60 bg-cream/75 shadow-sm backdrop-blur-2xl">
            <div className="container-page flex h-20 items-center justify-between gap-4">
                <Link
                    href={`/${locale}`}
                    className="flex items-center"
                    onClick={closeMenu}
                    aria-label="Nordic Eatery home"
                >
                    <Image
                        src="/logo9.png"
                        alt="Nordic Eatery logo"
                        width={180}
                        height={70}
                        className="object-contanano /root/swish-server/src/server.tsin"
                        priority
                    />
                </Link>

                <nav
                    className="hidden items-center gap-6 text-sm font-bold text-dark/70 lg:flex"
                    aria-label="Main navigation"
                >
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={localePath(link.href)}
                            className="transition hover:text-paprika"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2 sm:gap-3">
                    <LanguageSwitcher />
                    <StaffAccountMenu />

                    <Link
                        href={localePath("/cart")}
                        className="btn-secondary gap-2 px-4 py-2.5"
                        aria-label={cartLabel}
                    >
                        <ShoppingBag size={18} aria-hidden="true" />

                        <span className="hidden sm:inline">
              {text("header.cart", "cart")}
            </span>

                        {totalItems > 0 && (
                            <span
                                className="flex h-6 min-w-6 items-center justify-center rounded-full bg-paprika px-2 text-xs font-black text-white"
                                aria-hidden="true"
                            >
                {totalItems}
              </span>
                        )}
                    </Link>

                    <button
                        type="button"
                        onClick={() => setIsMenuOpen((value) => !value)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-dark shadow-sm transition hover:bg-white lg:hidden"
                        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-navigation"
                    >
                        {isMenuOpen ? (
                            <X size={22} aria-hidden="true" />
                        ) : (
                            <Menu size={22} aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>

            {isMenuOpen && (
                <div
                    id="mobile-navigation"
                    className="border-t border-white/60 bg-cream/95 px-6 py-5 shadow-xl backdrop-blur-2xl lg:hidden"
                >
                    <nav
                        className="container-page flex flex-col gap-3"
                        aria-label="Mobile navigation"
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={localePath(link.href)}
                                onClick={closeMenu}
                                className="rounded-2xl bg-white/70 px-5 py-4 text-sm font-black text-dark shadow-sm hover:bg-white hover:text-paprika"
                            >
                                {link.label}
                            </Link>
                        ))}

                        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/70 px-5 py-4 text-xs font-black text-dark/50 shadow-sm">
                            <Clock size={15} className="text-paprika" aria-hidden="true" />

                            <EditableText
                                value={text("header.delivery", "delivery")}
                                textKey="header.delivery"
                                locale={locale}
                                page="header"
                                canEdit={canEdit}
                                as="span"
                            />
                        </div>
                    </nav>
                </div>
            )}

            {canEdit && (
                <div className="hidden border-t border-paprika/10 bg-white/80 px-6 py-3 backdrop-blur lg:block">
                    <div className="container-page flex flex-wrap items-center gap-3 text-xs">
            <span className="font-black uppercase tracking-[0.2em] text-paprika">
              Header edit:
            </span>

                        {[
                            ["header.menu", "menu"],
                            ["header.about", "about"],
                            ["header.booking", "booking"],
                            ["header.mikes", "mikes"],
                            ["header.catering", "catering"],
                            ["header.contact", "contact"],
                            ["header.support", "support"],
                            ["header.cart", "cart"],
                        ].map(([key, fallbackKey]) => (
                            <span
                                key={key}
                                className="rounded-full border border-dark/10 bg-cream px-3 py-1.5 font-bold text-dark/70"
                            >
                <EditableText
                    value={text(key, fallbackKey)}
                    textKey={key}
                    locale={locale}
                    page="header"
                    canEdit={canEdit}
                    as="span"
                />
              </span>
                        ))}
                    </div>
                </div>
            )}
        </header>
    );
}
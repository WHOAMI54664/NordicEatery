"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, Menu, ShoppingBag, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/CartProvider";
import { StaffAccountMenu } from "@/components/StaffAccountMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Header() {
  const t = useTranslations("nav");
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const params = useParams();
  const locale = String(params.locale || "en");

  const navLinks = [
    { href: "/menu", label: t("menu") },
    { href: "/about", label: t("about") },
    { href: "/booking", label: t("booking") },
    { href: "/mikes", label: t("mikes") },
    { href: "/catering", label: t("catering") },
    { href: "/contact", label: t("contact") },
    { href: "/support", label: t("support") },
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
        <Link href={`/${locale}`} className="flex items-center" onClick={closeMenu}>
          <Image
            src="/logo.png"
            alt="Mike's Food logo"
            width={180}
            height={70}
            className="object-contain"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-dark/70 lg:flex">
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
          <div className="hidden items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-black text-dark/50 shadow-sm xl:flex">
            <Clock size={15} className="text-paprika" />
            {t("delivery")}
          </div>

          <LanguageSwitcher />

          <StaffAccountMenu />

          <Link href={localePath("/cart")} className="btn-secondary gap-2 px-4 py-2.5">
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">{t("cart")}</span>
            {totalItems > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-paprika px-2 text-xs font-black text-white">
                {totalItems}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-dark shadow-sm transition hover:bg-white lg:hidden"
            aria-label="Open menu"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-white/60 bg-cream/95 px-6 py-5 shadow-xl backdrop-blur-2xl lg:hidden">
          <nav className="container-page flex flex-col gap-3">
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
              <Clock size={15} className="text-paprika" />
              {t("delivery")}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
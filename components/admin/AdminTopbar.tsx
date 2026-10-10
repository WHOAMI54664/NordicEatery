"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  Package,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  canManageOrders,
  canManageStaff,
  type StaffRole,
} from "@/lib/auth/roles";
import { adminSearchTerm, currentAdminSection } from "@/lib/admin/navigation";
import { AdminMobileNav } from "./AdminMobileNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type SearchResult = {
  id: string;
  type: "order" | "product" | "staff";
  title: string;
  subtitle: string;
  href: string;
};
const resultIcons = {
  order: ClipboardList,
  product: Package,
  staff: UsersRound,
};

export function AdminTopbar({
  displayName,
  role,
}: {
  displayName: string;
  role: StaffRole;
}) {
  const t = useTranslations("admin");
  const locale = String(useParams().locale || "en");
  const pathname = usePathname();
  const current = currentAdminSection(pathname, locale);
  const supabase = useMemo(() => createClient(), []);
  const searchBox = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const canSearch = canManageOrders(role);
  const searchValue = adminSearchTerm(query);

  useEffect(() => {
    setQuery("");
    setSearchOpen(false);
  }, [pathname]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!searchBox.current?.contains(event.target as Node))
        setSearchOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  useEffect(() => {
    setResults([]);
    setSearchFailed(false);
    if (!canSearch || searchValue.length < 2) {
      setIsSearching(false);
      return;
    }
    const controller = new AbortController();
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const [orders, products, staff] = await Promise.all([
          supabase
            .from("orders")
            .select("id, order_number, customer_name, total_price, status")
            .or(
              `order_number.ilike.%${searchValue}%,customer_name.ilike.%${searchValue}%,customer_phone.ilike.%${searchValue}%`,
            )
            .limit(4)
            .abortSignal(controller.signal),
          supabase
            .from("products")
            .select("id, name, category, price")
            .or(`name.ilike.%${searchValue}%,category.ilike.%${searchValue}%`)
            .limit(4)
            .abortSignal(controller.signal),
          canManageStaff(role)
            ? supabase
                .from("profiles")
                .select("id, email, full_name, role")
                .or(
                  `email.ilike.%${searchValue}%,full_name.ilike.%${searchValue}%,role.ilike.%${searchValue}%`,
                )
                .limit(4)
                .abortSignal(controller.signal)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (controller.signal.aborted) return;
        setSearchFailed(Boolean(orders.error || products.error || staff.error));
        setResults(
          [
            ...(orders.data || []).map((order): SearchResult => ({
              id: order.id,
              type: "order",
              title:
                order.order_number ||
                `${t("table.order")} ${order.id.slice(0, 8)}`,
              subtitle: `${order.customer_name || t("table.customer")} · ${order.total_price || 0} kr`,
              href: `/${locale}/admin/orders`,
            })),
            ...(products.data || []).map((product): SearchResult => ({
              id: product.id,
              type: "product",
              title: product.name || product.id,
              subtitle: `${product.category || t("common.products")} · ${product.price || 0} kr`,
              href: `/${locale}/admin/products/${product.id}/edit`,
            })),
            ...(staff.data || []).map((person): SearchResult => ({
              id: person.id,
              type: "staff",
              title:
                person.full_name || person.email || t("account.staffMember"),
              subtitle: person.role || t("account.staffMember"),
              href: `/${locale}/admin/staff`,
            })),
          ].slice(0, 8),
        );
      } catch {
        if (!controller.signal.aborted) setSearchFailed(true);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchValue, canSearch, role, supabase, locale, t]);

  return (
    <header className="relative z-40 shrink-0 border-b border-[#EADDCF] bg-[#FFFCF6]/95">
      <div className="flex min-h-16 items-center gap-3 px-3 sm:px-5">
        <AdminMobileNav role={role} />
        <Link
          href={`/${locale}/admin${canSearch ? "" : "/kitchen"}`}
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-[#C7192E]"
          aria-label="Nordic Eatery"
        >
          <Image
            src="/logo9.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <span className="hidden text-sm font-black tracking-tight sm:block">
            Nordic Eatery
          </span>
        </Link>
        <span className="hidden h-5 w-px shrink-0 bg-[#EADDCF] sm:block" />
        <nav
          aria-label={t("workspace.breadcrumbs")}
          className="flex min-w-0 items-center gap-2 text-sm"
        >
          <span className="hidden text-[#A39388] xl:inline">
            {current ? t(`workspace.${current.group}`) : t("common.admin")}
          </span>
          <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-[#A39388] xl:block" />
          <span className="truncate font-bold">
            {current ? t(current.label) : t("common.admin")}
          </span>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href={`/${locale}`}
            title={t("workspace.viewSite")}
            className="hidden h-9 items-center gap-1.5 rounded-xl border border-[#EADDCF] bg-white/80 px-3 text-xs font-bold text-[#6F5E55] hover:bg-white md:flex"
          >
            {t("workspace.viewSite")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <LanguageSwitcher />
          <Link
            href={`/${locale}/admin/account`}
            aria-label={`${t("workspace.account")}: ${displayName}`}
            title={displayName}
            className="flex h-10 max-w-40 items-center gap-2 rounded-xl border border-[#EADDCF] bg-white/75 px-3 text-sm font-bold hover:bg-white"
          >
            <UserRound className="h-4 w-4 shrink-0 text-[#C7192E]" />
            <span className="hidden truncate 2xl:inline">{displayName}</span>
          </Link>
        </div>
      </div>
      {canSearch && (
        <div
          ref={searchBox}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setSearchOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSearchOpen(false);
          }}
          className="relative mx-3 mb-3 sm:mx-5 xl:absolute xl:left-[55%] xl:top-3 xl:mx-0 xl:mb-0 xl:w-64 xl:-translate-x-1/2 2xl:w-80"
        >
          <label className="flex h-10 items-center gap-2 rounded-xl border border-[#EADDCF] bg-[#FFF7EA]/70 px-3 focus-within:border-[#C7192E]/50 focus-within:ring-2 focus-within:ring-[#E51B23]/10">
            <Search className="h-4 w-4 shrink-0 text-[#A39388]" />
            <span className="sr-only">{t("common.searchPlaceholder")}</span>
            <input
              type="search"
              value={query}
              maxLength={100}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              placeholder={t("common.searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#A39388]"
              aria-controls={
                searchOpen && searchValue.length >= 2
                  ? "admin-search-results"
                  : undefined
              }
            />
          </label>
          {searchOpen && searchValue.length >= 2 && (
            <div
              id="admin-search-results"
              className="absolute left-0 right-0 top-[calc(100%+8px)] max-h-[60dvh] overflow-auto rounded-2xl border border-[#EADDCF] bg-[#FFFCF6] p-2 shadow-2xl shadow-[#4C2314]/15"
            >
              <p role="status" className="px-3 text-xs text-[#7B6A61]">
                {isSearching
                  ? t("topbar.searching")
                  : searchFailed
                    ? t("workspace.searchError")
                    : !results.length
                      ? t("topbar.noResults")
                      : ""}
              </p>
              {!isSearching && (
                <ul>
                  {results.map((result) => {
                    const Icon = resultIcons[result.type];
                    return (
                      <li key={`${result.type}-${result.id}`}>
                        <Link
                          href={result.href}
                          onClick={() => {
                            setQuery("");
                            setSearchOpen(false);
                          }}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[#E51B23]/5 focus-visible:outline-[#C7192E]"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-[#C7192E]" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">
                              {result.title}
                            </span>
                            <span className="block truncate text-xs text-[#7B6A61]">
                              {result.subtitle}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

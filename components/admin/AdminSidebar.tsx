"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Home,
  LineChart,
  MenuSquare,
  Monitor,
  PackageSearch,
  Settings,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { StaffRole } from "@/lib/auth/roles";
import {
  currentAdminSection,
  visibleAdminSections,
} from "@/lib/admin/navigation";

const icons: Record<string, LucideIcon> = {
  overview: Home,
  orders: ClipboardList,
  kitchen: ChefHat,
  "kitchen-display": Monitor,
  reservations: CalendarDays,
  menu: MenuSquare,
  products: ChefHat,
  inventory: PackageSearch,
  analytics: LineChart,
  reports: BarChart3,
  staff: Users,
  settings: Settings,
  documentation: BookOpen,
  account: UserRound,
};

export function AdminSidebar({
  role,
  collapsed = false,
  onNavigate,
}: {
  role: StaffRole;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("admin");
  const locale = String(useParams().locale || "en");
  const current = currentAdminSection(usePathname(), locale);
  const sections = visibleAdminSections(role);

  return (
    <nav aria-label={t("workspace.navigation")} className="space-y-3 p-2.5">
      {(["operations", "catalog", "business", "workspace"] as const).map(
        (group) => {
          const items = sections.filter((section) => section.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <p
                className={
                  collapsed
                    ? "sr-only"
                    : "mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#A39388]"
                }
              >
                {t(`workspace.${group}`)}
              </p>
              <ul className="space-y-1">
                {items.map((section) => {
                  const Icon = icons[section.id];
                  const active = section.id === current?.id;
                  return (
                    <li key={section.id}>
                      <Link
                        href={`/${locale}${section.href}`}
                        onClick={onNavigate}
                        title={collapsed ? t(section.label) : undefined}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-9 items-center gap-2.5 rounded-xl border px-3 py-1.5 text-[13px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7192E] ${collapsed ? "justify-center" : ""} ${active ? "border-[#E51B23]/20 bg-[#E51B23]/10 text-[#C7192E]" : "border-transparent text-[#6F5E55] hover:bg-white/80 hover:text-[#25120F]"}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span
                          className={
                            collapsed ? "sr-only" : "min-w-0 break-words"
                          }
                        >
                          {t(section.label)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        },
      )}
    </nav>
  );
}

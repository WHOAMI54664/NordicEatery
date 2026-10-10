"use client";

import { type ReactNode, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import styles from "./AdminWorkspace.module.css";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import type { StaffRole } from "@/lib/auth/roles";
import {
  currentAdminSection,
  visibleAdminSections,
} from "@/lib/admin/navigation";

export function AdminShell({
  children,
  displayName,
  role,
}: {
  children: ReactNode;
  displayName: string;
  role: StaffRole;
}) {
  const t = useTranslations("admin");
  const locale = String(useParams().locale || "en");
  const pathname = usePathname();
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    content.current?.scrollTo(0, 0);
  }, [pathname]);
  const [collapsed, setCollapsed] = useState(false);
  const current = currentAdminSection(pathname, locale);
  const related = visibleAdminSections(role).filter(
    (section) => section.group === current?.group,
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#FFF7EA] text-[#25120F]">
      <a
        href="#admin-content"
        className="sr-only z-[100] rounded-xl bg-[#E51B23] p-3 font-bold text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        {t("workspace.skipContent")}
      </a>
      <AdminTopbar displayName={displayName} role={role} />
      <div className="flex min-h-0 flex-1">
        <aside
          id="admin-sidebar"
          className={`hidden shrink-0 flex-col border-r border-[#EADDCF] bg-[#FFF4E3]/95 lg:flex ${collapsed ? "w-[72px]" : "w-[232px]"}`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4">
            <AdminSidebar role={role} collapsed={collapsed} />
          </div>
          <div className="border-t border-[#EADDCF] p-3">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              aria-controls="admin-sidebar"
              aria-label={t(
                collapsed ? "workspace.expandMenu" : "workspace.collapseMenu",
              )}
              title={t(
                collapsed ? "workspace.expandMenu" : "workspace.collapseMenu",
              )}
              className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-bold text-[#7B6A61] hover:bg-white focus-visible:outline-[#C7192E]"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 shrink-0" />
                  <span>{t("workspace.collapseMenu")}</span>
                </>
              )}
            </button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {related.length > 1 && (
            <nav
              aria-label={t("workspace.relatedSections")}
              className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#EADDCF] bg-[#FFFCF6]/90 px-3 sm:px-6"
            >
              {related.map((section) => (
                <Link
                  key={section.id}
                  href={`/${locale}${section.href}`}
                  aria-current={section.id === current?.id ? "page" : undefined}
                  className={`shrink-0 border-b-2 px-3 py-3.5 text-xs font-bold transition focus-visible:outline-[#C7192E] ${section.id === current?.id ? "border-[#E51B23] text-[#C7192E]" : "border-transparent text-[#7B6A61] hover:border-[#EADDCF] hover:text-[#25120F]"}`}
                >
                  {t(section.label)}
                </Link>
              ))}
            </nav>
          )}
          <main
            id="admin-content"
            ref={content}
            tabIndex={-1}
            className={`${styles.content} min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-[radial-gradient(ellipse_at_top_right,rgba(255,159,64,0.10),transparent_60%)] p-3 outline-none sm:p-4 lg:p-5`}
          >
            <div className="mx-auto w-full max-w-[1800px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

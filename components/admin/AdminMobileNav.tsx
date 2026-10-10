"use client";

import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { StaffRole } from "@/lib/auth/roles";
import { AdminSidebar } from "./AdminSidebar";

export function AdminMobileNav({ role }: { role: StaffRole }) {
  const t = useTranslations("admin.workspace");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialog.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={t("openMenu")}
        aria-haspopup="dialog"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EADDCF] bg-white/75 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <dialog
        ref={dialog}
        aria-label={t("navigation")}
        onClose={() => trigger.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-[min(88vw,300px)] max-w-none border-r border-[#EADDCF] bg-[#FFF4E3] p-0 text-[#25120F] shadow-2xl backdrop:bg-[#25120F]/45 backdrop:backdrop-blur-sm"
      >
        <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#EADDCF] bg-[#FFF4E3] px-4">
          <span className="font-black">Nordic Eatery</span>
          <button
            type="button"
            autoFocus
            onClick={() => dialog.current?.close()}
            aria-label={t("closeMenu")}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <AdminSidebar role={role} onNavigate={() => dialog.current?.close()} />
      </dialog>
    </>
  );
}

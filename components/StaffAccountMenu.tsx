"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Shield,
  UserCog,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/browser";
import { canAccessKitchen, type StaffRole } from "@/lib/auth/roles";

type StaffProfile = {
  role: StaffRole;
  email: string;
};

export function StaffAccountMenu() {
  const t = useTranslations("staffAccountMenu");

  const router = useRouter();
  const params = useParams();
  const locale = String(params.locale || "en");

  const menuRef = useRef<HTMLDivElement | null>(null);

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  function localePath(path: string) {
    return `/${locale}${path}`;
  }

  function roleLabel(role: StaffRole) {
    if (role === "owner") return t("roles.owner");
    if (role === "admin") return t("roles.admin");
    if (role === "cook") return t("roles.cook");

    return role;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setProfile(null);
        return;
      }

      const { data } = await supabase
          .from("profiles")
          .select("role, email")
          .eq("id", user.id)
          .single();

      if (!isMounted) return;

      if (data?.role) {
        setProfile({
          role: data.role as StaffRole,
          email: data.email || user.email || t("fallbackStaff"),
        });
      }
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, t]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();

    setIsOpen(false);
    router.push(`/${locale}/login`);
    router.refresh();
  }

  if (!profile || !canAccessKitchen(profile.role)) return null;

  return (
      <div ref={menuRef} className="relative">
        <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-[#EADDCF] bg-white/80 px-4 py-2.5 text-sm font-black text-[#25120F] shadow-sm shadow-[#4C2314]/5 transition hover:-translate-y-0.5 hover:bg-white"
            aria-label={t("aria.openMenu")}
            aria-expanded={isOpen}
            aria-controls="staff-account-menu"
        >
        <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2A1712] text-white"
            aria-hidden="true"
        >
          <Shield size={15} aria-hidden="true" />
        </span>

          <span className="hidden sm:inline">{t("button")}</span>

          <ChevronDown
              size={16}
              aria-hidden="true"
              className={`transition ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen ? (
            <div
                id="staff-account-menu"
                className="absolute right-0 top-full z-50 mt-3 w-[320px] overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/95 p-4 shadow-2xl shadow-[#4C2314]/15 backdrop-blur-2xl"
            >
              <div className="border-b border-[#EADDCF] pb-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C7192E]">
                  {roleLabel(profile.role)}
                </p>

                <p className="mt-1 truncate text-sm font-black text-[#25120F]">
                  {profile.email}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <Link
                    href={localePath("/admin")}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-[#25120F] transition hover:bg-[#E51B23]/8 hover:text-[#C7192E]"
                    aria-label={t("aria.dashboard")}
                >
              <span
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8"
                  aria-hidden="true"
              >
                <LayoutDashboard className="h-4 w-4 text-[#C7192E]" />
              </span>

                  {t("dashboard")}
                </Link>

                <Link
                    href={localePath("/admin/account")}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-[#25120F] transition hover:bg-[#E51B23]/8 hover:text-[#C7192E]"
                    aria-label={t("aria.account")}
                >
              <span
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#EADDCF] bg-white"
                  aria-hidden="true"
              >
                <UserCog className="h-4 w-4 text-[#7B6A61]" />
              </span>

                  {t("account")}
                </Link>

                <button
                    type="button"
                    onClick={signOut}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black text-[#7B6A61] transition hover:bg-[#E51B23]/8 hover:text-[#C7192E]"
                    aria-label={t("aria.signOut")}
                >
              <span
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#EADDCF] bg-white"
                  aria-hidden="true"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </span>

                  {t("signOut")}
                </button>
              </div>
            </div>
        ) : null}
      </div>
  );
}

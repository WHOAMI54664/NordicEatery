"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Shield,
  UserCog
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  canAccessKitchen,
  type StaffRole
} from "@/lib/auth/roles";

type StaffProfile = {
  role: StaffRole;
  email: string;
};

export function StaffAccountMenu() {
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
          .select("role, email")
          .eq("id", user.id)
          .single();

      if (!isMounted) return;

      if (data?.role) {
        setProfile({
          role: data.role as StaffRole,
          email: data.email || user.email || "Staff"
        });
      }
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setIsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
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
        >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2A1712] text-white">
          <Shield size={15} />
        </span>

          <span className="hidden sm:inline">Staff Area</span>

          <ChevronDown
              size={16}
              className={`transition ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen ? (
            <div className="absolute right-0 top-full z-50 mt-3 w-[320px] overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/95 p-4 shadow-2xl shadow-[#4C2314]/15 backdrop-blur-2xl">
              <div className="border-b border-[#EADDCF] pb-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C7192E]">
                  {profile.role}
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
                >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                <LayoutDashboard className="h-4 w-4 text-[#C7192E]" />
              </span>
                  Dashboard
                </Link>

                <Link
                    href={localePath("/admin/account")}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-[#25120F] transition hover:bg-[#E51B23]/8 hover:text-[#C7192E]"
                >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#EADDCF] bg-white">
                <UserCog className="h-4 w-4 text-[#7B6A61]" />
              </span>
                  Account settings
                </Link>

                <button
                    type="button"
                    onClick={signOut}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black text-[#7B6A61] transition hover:bg-[#E51B23]/8 hover:text-[#C7192E]"
                >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#EADDCF] bg-white">
                <LogOut className="h-4 w-4" />
              </span>
                  Sign out
                </button>
              </div>
            </div>
        ) : null}
      </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChefHat,
  LogOut,
  Package,
  Shield,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  canAccessKitchen,
  canManageProducts,
  canManageInventory,
  canViewAnalytics,
  canManageStaff,
  type StaffRole,
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
          email: data.email || user.email || "Staff",
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
    router.push(`/${locale}`);
    router.refresh();
  }

  if (!profile || !canAccessKitchen(profile.role)) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-dark/10 bg-white/75 px-4 py-2.5 text-sm font-black text-dark shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-dark text-white">
          <Shield size={15} />
        </span>
        <span className="hidden sm:inline">Staff Area</span>
        <ChevronDown
          size={16}
          className={`transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/90 p-2 shadow-soft backdrop-blur-2xl">
          <div className="border-b border-dark/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-paprika">
              {profile.role}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-dark/60">
              {profile.email}
            </p>
          </div>

          <div className="py-2">
            <Link
              href={localePath("/admin/kitchen")}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-dark transition hover:bg-cream"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-paprika/10 text-paprika">
                <ChefHat size={18} />
              </span>
              Kitchen board
            </Link>

            {canManageProducts(profile.role) && (
              <Link
                href={localePath("/admin/products")}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-dark transition hover:bg-cream"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-paprika/10 text-paprika">
                  <Package size={18} />
                </span>
                Products
              </Link>
            )}

            {canManageInventory(profile.role) && (
              <Link
                href={localePath("/admin/inventory")}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-dark transition hover:bg-cream"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-paprika/10 text-paprika">
                  <Boxes size={18} />
                </span>
                Inventory
              </Link>
            )}

            {canViewAnalytics(profile.role) && (
              <Link
                href={localePath("/admin/analytics")}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-dark transition hover:bg-cream"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-paprika/10 text-paprika">
                  <BarChart3 size={18} />
                </span>
                Analytics
              </Link>
            )}

            {canManageStaff(profile.role) && (
              <Link
                href={localePath("/admin/staff")}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-dark transition hover:bg-cream"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-honey/20 text-dark">
                  <Users size={18} />
                </span>
                Staff management
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-dark/60 transition hover:bg-paprika/10 hover:text-paprika"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-dark/5">
              <LogOut size={18} />
            </span>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
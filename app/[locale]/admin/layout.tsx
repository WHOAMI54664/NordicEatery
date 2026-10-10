import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { isStaffRole } from "@/lib/auth/roles";

type AdminLayoutProps = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const { locale } = await params;

  const t = await getTranslations("admin");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/admin`);
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  /**
   * Central staff-role gate for the whole /admin section.
   * Individual pages still enforce fine-grained permissions (canManageOrders
   * etc.), but no logged-in customer should ever reach the admin shell.
   */
  const role = currentProfile?.role?.toLowerCase();
  if (!isStaffRole(role)) {
    redirect(`/${locale}`);
  }

  const profileName =
    currentProfile?.full_name?.trim() ||
    currentProfile?.email?.split("@")[0] ||
    user.email?.split("@")[0] ||
    t("sidebar.adminUser");

  return (
    <AdminShell displayName={profileName} role={role}>
      {children}
    </AdminShell>
  );
}

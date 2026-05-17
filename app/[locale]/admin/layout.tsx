import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { createClient } from "@/lib/supabase/server";

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
      .select("full_name, email")
      .eq("id", user.id)
      .single();

  const profileName =
      currentProfile?.full_name?.trim() ||
      currentProfile?.email?.split("@")[0] ||
      user.email?.split("@")[0] ||
      t("sidebar.adminUser");

  return (
      <AdminShell>
        <AdminTopbar displayName={profileName} />

        <div className="mt-6">{children}</div>
      </AdminShell>
  );
}

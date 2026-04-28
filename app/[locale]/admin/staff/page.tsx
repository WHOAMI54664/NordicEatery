import { redirect } from "next/navigation";
import { StaffRolesPanel } from "@/components/StaffRolesPanel";
import { canManageStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function StaffPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/staff");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canManageStaff(profile?.role)) {
    redirect("/unauthorized");
  }

  return (
    <main className="container-page py-12">
      <div className="mb-10 max-w-3xl">
        <p className="font-black uppercase tracking-[0.25em] text-paprika">
          Admin
        </p>
        <h1 className="section-title mt-3">Staff roles</h1>
        <p className="mt-4 text-lg leading-8 text-dark/60">
          Manage owner, admin and cook roles.
        </p>
      </div>

      <StaffRolesPanel />
    </main>
  );
}
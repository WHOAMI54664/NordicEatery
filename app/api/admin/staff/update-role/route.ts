import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (ownerProfile?.role !== "owner") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  const { profileId, role } = await request.json();

  if (!profileId || !role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!STAFF_ROLES.includes(role as StaffRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", profileId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.auth.admin.updateUserById(profileId, {
    user_metadata: {
      role,
    },
  });

  return NextResponse.json({ success: true });
}
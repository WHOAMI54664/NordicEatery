import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StaffRole } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: ownerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || ownerProfile?.role !== "owner") {
      return NextResponse.json({ error: "Owner only" }, { status: 403 });
    }

    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "cook") as StaffRole;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nordiceatery.se/set-password";

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/set-password`,
      data: {
        role,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const invitedUserId = data.user?.id;

    if (invitedUserId) {
      const { error: upsertError } = await admin.from("profiles").upsert({
        id: invitedUserId,
        email,
        full_name: null,
        role,
      });

      if (upsertError) {
        return NextResponse.json(
          { error: upsertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite staff error:", error);

    return NextResponse.json(
      { error: "Could not invite staff member" },
      { status: 500 }
    );
  }
}
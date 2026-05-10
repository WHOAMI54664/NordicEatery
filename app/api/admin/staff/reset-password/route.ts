import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supportedLocales = ["en", "sv", "pl", "ru"] as const;

type Locale = (typeof supportedLocales)[number];

function getSafeLocale(locale: unknown): Locale {
  if (typeof locale === "string" && supportedLocales.includes(locale as Locale)) {
    return locale as Locale;
  }

  return "en";
}

function getSiteUrl() {
  return (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
  ).replace(/\/$/, "");
}

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

  const body = await request.json();

  const email = String(body.email || "").trim().toLowerCase();
  const locale = getSafeLocale(body.locale);

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const siteUrl = getSiteUrl();

  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/${locale}/auth/callback?next=/set-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
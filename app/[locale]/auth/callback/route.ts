import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSafeNext(next: string | null) {
  if (!next) return "/set-password";
  if (!next.startsWith("/") || next.startsWith("//")) return "/set-password";
  return next;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNext(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("exchangeCodeForSession error:", error.message);

      return NextResponse.redirect(
          new URL(`/${locale}/login?error=auth`, requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(
      new URL(`/${locale}${next}`, requestUrl.origin)
  );
}
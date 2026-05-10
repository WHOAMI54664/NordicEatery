import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSafeNext(next: string | null) {
  if (!next) return "/set-password";

  if (!next.startsWith("/")) {
    return "/set-password";
  }

  return next;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;

  const requestUrl = new URL(request.url);

  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  const next = getSafeNext(
      requestUrl.searchParams.get("next")
  );

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (error) {
      console.error("verifyOtp error:", error);

      return NextResponse.redirect(
          new URL(`/${locale}/login?error=auth`, requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(
      new URL(`/${locale}${next}`, requestUrl.origin)
  );
}
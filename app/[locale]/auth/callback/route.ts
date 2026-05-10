import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSafeNext(next: string | null) {
  if (!next) return "/set-password";
  if (!next.startsWith("/") || next.startsWith("//")) return "/set-password";
  return next;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;

  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNext(requestUrl.searchParams.get("next"));

  const cookiesToSet: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];

  const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(items) {
            cookiesToSet.push(...items);
          },
        },
      }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("exchangeCodeForSession error:", error.message);

      return NextResponse.redirect(
          new URL(`/${locale}/login?error=auth`, requestUrl.origin)
      );
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      console.error("verifyOtp error:", error.message);

      return NextResponse.redirect(
          new URL(`/${locale}/login?error=auth`, requestUrl.origin)
      );
    }
  }

  const response = NextResponse.redirect(
      new URL(`/${locale}${next}`, requestUrl.origin)
  );

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
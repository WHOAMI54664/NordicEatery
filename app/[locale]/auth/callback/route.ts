import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthCallbackProps = {
  params: Promise<{
    locale: string;
  }>;
};

const supportedLocales = ["sv", "en", "pl", "ru"];

function normalizeLocale(locale: string) {
  return supportedLocales.includes(locale) ? locale : "sv";
}

function getSafeNextPath(value: string | null, locale: string) {
  const safeLocale = normalizeLocale(locale);

  if (!value) {
    return `/${safeLocale}/profile`;
  }

  let decodedValue = value;

  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    decodedValue = value;
  }

  if (!decodedValue.startsWith("/")) {
    return `/${safeLocale}/profile`;
  }

  if (decodedValue.startsWith("//")) {
    return `/${safeLocale}/profile`;
  }

  /**
   * Staff invite/reset flow.
   * Existing admin code sends:
   * /auth/callback?next=/set-password
   */
  if (
      decodedValue === "/set-password" ||
      decodedValue.endsWith("/set-password")
  ) {
    return `/${safeLocale}/set-password`;
  }

  /**
   * If next already has locale:
   * /sv/profile
   */
  const parts = decodedValue.split("/").filter(Boolean);

  if (parts.length > 0 && supportedLocales.includes(parts[0])) {
    /**
     * Fix duplicated locale:
     * /sv/sv/profile -> /sv/profile
     */
    if (parts.length >= 2 && supportedLocales.includes(parts[1])) {
      return `/${parts[0]}/${parts.slice(2).join("/")}`;
    }

    return decodedValue;
  }

  /**
   * If next is /profile, /cart, etc.
   */
  return `/${safeLocale}${decodedValue}`;
}

export async function GET(request: Request, { params }: AuthCallbackProps) {
  const { locale } = await params;
  const safeLocale = normalizeLocale(locale);

  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const redirectPath = getSafeNextPath(next, safeLocale);

      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
    }

    console.error("Localized auth callback error:", error);
  }

  return NextResponse.redirect(
      new URL(`/${safeLocale}/profile/login?auth_error=oauth_failed`, requestUrl.origin)
  );
}
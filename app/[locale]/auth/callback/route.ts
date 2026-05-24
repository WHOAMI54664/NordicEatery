import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthCallbackProps = {
  params: Promise<{
    locale: string;
  }>;
};

const supportedLocales = ["sv", "en", "pl", "ru"];

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

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

  const parts = decodedValue.split("/").filter(Boolean);

  /**
   * If next already has locale:
   * /sv/profile
   */
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

  if (!code) {
    return NextResponse.redirect(
        new URL(
            `/${safeLocale}/profile/login?auth_error=missing_code`,
            requestUrl.origin
        )
    );
  }

  const redirectPath = getSafeNextPath(next, safeLocale);
  const response = NextResponse.redirect(new URL(redirectPath, requestUrl.origin));

  const cookieStore = await cookies();

  const supabase = createServerClient(
      getEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Localized auth callback error:", error);

    return NextResponse.redirect(
        new URL(
            `/${safeLocale}/profile/login?auth_error=${encodeURIComponent(
                error.message
            )}`,
            requestUrl.origin
        )
    );
  }

  console.log("Localized auth callback session saved:", {
    redirectPath,
    hasSession: Boolean(data.session),
    hasUser: Boolean(data.user),
    email: data.user?.email,
  });

  return response;
}
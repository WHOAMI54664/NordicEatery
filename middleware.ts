import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Keeps the Supabase session fresh on every page request.
 *
 * Server Components cannot write cookies, so an expired access token can never
 * be refreshed there — which is why an idle session (typical on mobile) fails
 * the admin role check and bounces the user. Refreshing here writes the new
 * tokens onto the response so Server Components see a valid session.
 *
 * Wrapped in try/catch: if anything goes wrong we return the original response
 * untouched so routing (and the public site) never breaks.
 */
async function refreshSupabaseSession(
    request: NextRequest,
    response: NextResponse
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    await supabase.auth.getUser();
  } catch (error) {
    console.error("Middleware Supabase session refresh error:", error);
  }

  return response;
}

const supportedLocales = ["en", "sv", "pl", "ru"] as const;

function getLocaleFromCountry(country: string | null) {
  if (country === "SE") return "sv";
  if (country === "PL") return "pl";
  if (country === "RU" || country === "UA" || country === "BY") return "ru";

  return null;
}

function getLocaleFromBrowser(request: NextRequest) {
  const acceptLanguage = request.headers.get("accept-language") || "";

  if (acceptLanguage.toLowerCase().includes("sv")) return "sv";
  if (acceptLanguage.toLowerCase().includes("pl")) return "pl";
  if (acceptLanguage.toLowerCase().includes("ru")) return "ru";

  return "en";
}

function getPreferredLocale(request: NextRequest) {
  const savedLocale = request.cookies.get("NEXT_LOCALE")?.value;

  if (
      savedLocale &&
      supportedLocales.includes(savedLocale as (typeof supportedLocales)[number])
  ) {
    return savedLocale;
  }

  const country =
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") ||
      null;

  const localeFromCountry = getLocaleFromCountry(country);

  return localeFromCountry || getLocaleFromBrowser(request);
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Очень важно: API вообще не трогаем.
  if (
      pathname.startsWith("/api/") ||
      pathname === "/api" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/_vercel") ||
      pathname.includes(".") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  const hasLocale = /^\/(en|sv|pl|ru)(\/|$)/.test(pathname);

  if (pathname === "/admin") {
    const locale = getPreferredLocale(request);

    return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
  }

  if (!hasLocale && pathname === "/") {
    return NextResponse.redirect(new URL("/sv", request.url));
  }

  const response = intlMiddleware(request);

  return refreshSupabaseSession(request, response);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

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

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = /^\/(en|sv|pl|ru)(\/|$)/.test(pathname);

  if (pathname === "/admin") {
    const locale = getPreferredLocale(request);

    return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
  }

  if (!hasLocale && pathname === "/") {
    const locale = getPreferredLocale(request);

    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/admin", "/(en|sv|pl|ru)/:path*"],
};
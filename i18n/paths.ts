export const publicLocales = ["en", "sv", "pl", "ru"] as const;
type PublicLocale = (typeof publicLocales)[number];

// Internal route and CMS names stay stable; only visitor-facing URLs change.
export const publicPathnames: Record<string, Record<PublicLocale, string>> = {
  "/menu": { en: "/menu", sv: "/meny", pl: "/menu", ru: "/menu" },
  "/about": { en: "/about", sv: "/om-oss", pl: "/about", ru: "/about" },
  "/booking": {
    en: "/booking",
    sv: "/bokning",
    pl: "/booking",
    ru: "/booking",
  },
  "/mikes": {
    en: "/foodtruck",
    sv: "/foodtruck",
    pl: "/foodtruck",
    ru: "/foodtruck",
  },
  "/contact": {
    en: "/contact",
    sv: "/kontakt",
    pl: "/contact",
    ru: "/contact",
  },
  "/support": { en: "/faq", sv: "/faq", pl: "/faq", ru: "/faq" },
  "/cart": { en: "/cart", sv: "/vagn", pl: "/cart", ru: "/cart" },
};

/** Resolves either an internal route or an existing public URL to a locale. */
export function getPublicPath(locale: string, path = "/"): string {
  const language = publicLocales.includes(locale as PublicLocale)
    ? (locale as PublicLocale)
    : "en";
  const suffixStart = path.search(/[?#]/);
  const suffix = suffixStart < 0 ? "" : path.slice(suffixStart);
  const pathname = (suffixStart < 0 ? path : path.slice(0, suffixStart))
    .replace(/^\/(en|sv|pl|ru)(?=\/|$)/, "")
    .replace(/\/$/, "");
  const route = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const match = Object.entries(publicPathnames).find(
    ([internal, translated]) =>
      internal === route || Object.values(translated).includes(route),
  );
  const translated = match ? match[1][language] : route;
  return `/${language}${translated === "/" ? "" : translated}${suffix}`;
}

import { getPublicPath } from "@/i18n/paths";
import type { Metadata } from "next";

export const baseUrl = "https://www.nordiceatery.se";

export const locales = ["sv", "en", "pl", "ru"] as const;

export type Locale = (typeof locales)[number];

export function isSupportedLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getSafeLocale(locale: string): Locale {
  return isSupportedLocale(locale) ? locale : "sv";
}

export function getLocalizedUrl(locale: Locale, path = "") {
  return `${baseUrl}${getPublicPath(locale, path)}`;
}

export function getLanguageAlternates(path = "") {
  return {
    sv: getLocalizedUrl("sv", path),
    en: getLocalizedUrl("en", path),
    pl: getLocalizedUrl("pl", path),
    ru: getLocalizedUrl("ru", path),
    "x-default": getLocalizedUrl("sv", path),
  };
}

type CreatePageMetadataInput = {
  locale: string;
  path?: string;
  title: string;
  description: string;
  image?: string;
  ogLocale?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function createPageMetadata({
  locale,
  path = "",
  title,
  description,
  image = "/og-image.jpg",
  ogLocale,
  keywords,
  noIndex = false,
}: CreatePageMetadataInput): Metadata {
  const safeLocale = getSafeLocale(locale);
  const canonicalUrl = getLocalizedUrl(safeLocale, path);
  const imageUrl = image.startsWith("http") ? image : `${baseUrl}${image}`;

  return {
    title,
    description,
    keywords,

    alternates: {
      canonical: canonicalUrl,
      languages: getLanguageAlternates(path),
    },

    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Nordic Eatery",
      locale: ogLocale,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },

    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

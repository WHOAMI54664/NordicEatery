import { getPublicPath } from "@/i18n/paths";
import type { MetadataRoute } from "next";

const baseUrl = "https://www.nordiceatery.se";

const locales = ["sv", "en", "pl", "ru"] as const;

type Locale = (typeof locales)[number];

const pages = [
  {
    path: "",
    changeFrequency: "daily",
    priority: 1,
  },
  {
    path: "menu",
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    path: "bestall-takeaway",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "streetfood-i-norrbotten",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "catering",
    changeFrequency: "weekly",
    priority: 0.85,
  },
  {
    path: "booking",
    changeFrequency: "weekly",
    priority: 0.75,
  },
  {
    path: "mikes",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "contact",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "about",
    changeFrequency: "monthly",
    priority: 0.55,
  },
  {
    path: "support",
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    path: "terms",
    changeFrequency: "yearly",
    priority: 0.35,
  },
  {
    path: "privacy",
    changeFrequency: "yearly",
    priority: 0.35,
  },
] satisfies Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}>;

function buildLocalizedUrl(locale: Locale, path: string) {
  return `${baseUrl}${getPublicPath(locale, `/${path}`)}`;
}

function buildLanguageAlternates(path: string) {
  return {
    sv: buildLocalizedUrl("sv", path),
    en: buildLocalizedUrl("en", path),
    pl: buildLocalizedUrl("pl", path),
    ru: buildLocalizedUrl("ru", path),
    "x-default": buildLocalizedUrl("sv", path),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return locales.flatMap((locale) =>
    pages.map((page) => ({
      url: buildLocalizedUrl(locale, page.path),
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: buildLanguageAlternates(page.path),
      },
    })),
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { loadSiteContent } from "./site-content/server";
import { getLanguageAlternates, getLocalizedUrl, getSafeLocale } from "./seo";

type PublicPage =
  "about" | "booking" | "mikes" | "contact" | "support" | "cart";

export async function publicPageMetadata(
  locale: string,
  page: PublicPage,
): Promise<Metadata> {
  const language = getSafeLocale(locale);
  const [t, content] = await Promise.all([
    getTranslations({ locale: language, namespace: "nav" }),
    loadSiteContent(language),
  ]);
  const label =
    content.find((row) => row.key === `header.${page}`)?.value || t(page);
  const title = `${label} | Nordic Eatery`;
  const path = `/${page}`;

  return {
    title: { absolute: title },
    alternates: {
      canonical: getLocalizedUrl(language, path),
      languages: getLanguageAlternates(path),
    },
    openGraph: {
      title,
      url: getLocalizedUrl(language, path),
      siteName: "Nordic Eatery",
      type: "website",
      images: ["/og-image.jpg"],
    },
    twitter: { title },
    ...(page === "cart" ? { robots: { index: false, follow: true } } : {}),
  };
}

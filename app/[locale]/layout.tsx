import type { Metadata } from "next";
import { SiteContentProvider } from "@/components/site-content/SiteContentProvider";
import { canEditSiteContent, loadSiteContent } from "@/lib/site-content/server";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConditionalPublicChrome } from "@/components/layout/ConditionalPublicChrome";

type Locale = "sv" | "en" | "pl" | "ru";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const localeSeo = {
  sv: {
    title: "Nordic Eatery | Local Soul, Global Taste.",
    description:
      "Nordic Eatery – Local Soul, Global Taste. Street food, takeaway och catering.",
    ogLocale: "sv_SE",
  },
  en: {
    title: "Nordic Eatery | Local Soul, Global Taste.",
    description:
      "Nordic Eatery – Local Soul, Global Taste. Street food, takeaway and catering.",
    ogLocale: "en_US",
  },
  pl: {
    title: "Nordic Eatery | Local Soul, Global Taste.",
    description:
      "Nordic Eatery – Local Soul, Global Taste. Street food, jedzenie na wynos i catering.",
    ogLocale: "pl_PL",
  },
  ru: {
    title: "Nordic Eatery | Local Soul, Global Taste.",
    description:
      "Nordic Eatery – Local Soul, Global Taste. Стритфуд, еда навынос и кейтеринг.",
    ogLocale: "ru_RU",
  },
} as const;

function isSupportedLocale(locale: string): locale is Locale {
  return routing.locales.includes(locale as Locale);
}

function getLocaleSeo(locale: string) {
  if (isSupportedLocale(locale)) {
    return localeSeo[locale];
  }

  return localeSeo.sv;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = getLocaleSeo(locale);

  return {
    title: {
      default: seo.title,
      template: "%s | Nordic Eatery",
    },
    description: seo.description,

    openGraph: {
      title: seo.title,
      description: seo.description,
      siteName: "Nordic Eatery",
      type: "website",
      locale: seo.ogLocale,
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "Nordic Eatery",
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/og-image.jpg"],
    },

    robots: {
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

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const [messages, canEdit, content] = await Promise.all([
    getMessages({ locale }),
    canEditSiteContent(),
    loadSiteContent(locale),
  ]);

  return (
    <SiteContentProvider
      locale={locale}
      messages={messages}
      canEdit={canEdit}
      content={Object.fromEntries(content.map((row) => [row.key, row.value]))}
    >
      <ConditionalPublicChrome
        locale={locale}
        header={<Header />}
        footer={<Footer />}
      >
        {children}
      </ConditionalPublicChrome>

      <SpeedInsights />
    </SiteContentProvider>
  );
}

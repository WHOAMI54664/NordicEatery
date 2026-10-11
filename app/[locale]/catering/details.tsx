import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EditableText } from "@/components/EditableText";
import { createClient } from "@/lib/supabase/server";

type Locale = "sv" | "en" | "pl" | "ru";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const baseUrl = "https://www.nordiceatery.se";

const locales = ["sv", "en", "pl", "ru"] as const;

const ogLocales: Record<Locale, string> = {
  sv: "sv_SE",
  en: "en_SE",
  pl: "pl_PL",
  ru: "ru_RU",
};

function isSupportedLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

function getSafeLocale(locale: string): Locale {
  return isSupportedLocale(locale) ? locale : "sv";
}

function buildCateringUrl(locale: Locale) {
  return `${baseUrl}/${locale}/catering`;
}

function buildLanguageAlternates() {
  return {
    sv: buildCateringUrl("sv"),
    en: buildCateringUrl("en"),
    pl: buildCateringUrl("pl"),
    ru: buildCateringUrl("ru"),
    "x-default": buildCateringUrl("sv"),
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = getSafeLocale(locale);

  const t = await getTranslations({
    locale: currentLocale,
    namespace: "seo.cateringBoden",
  });

  const canonical = buildCateringUrl(currentLocale);

  return {
    title: { absolute: t("title") },
    description: t("description"),

    alternates: {
      canonical,
      languages: buildLanguageAlternates(),
    },

    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: canonical,
      siteName: "Nordic Eatery",
      locale: ogLocales[currentLocale],
      type: "website",
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t("ogTitle"),
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: [`${baseUrl}/og-image.jpg`],
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

export default async function CateringDetails({ params }: PageProps) {
  const { locale } = await params;
  const currentLocale = getSafeLocale(locale);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    isOwner = profile?.role === "owner" || profile?.role === "admin";
  }

  const t = await getTranslations({
    locale: currentLocale,
    namespace: "pages.cateringBoden",
  });

  const { data: siteContent } = await supabase
    .from("site_content")
    .select("key,value")
    .eq("locale", currentLocale)
    .eq("page", "catering-boden");

  const content = new Map(
    (siteContent || []).map((item) => [item.key, item.value]),
  );

  function text(key: string, fallbackKey: string) {
    return content.get(key) || t(fallbackKey);
  }

  const benefits = [0, 1, 2, 3, 4, 5].map((index) => ({
    key: `cateringBoden.benefits.items.${index}`,
    fallbackKey: `benefits.items.${index}`,
  }));

  const faqItems = [0, 1, 2, 3].map((index) => ({
    qKey: `cateringBoden.faq.items.${index}.question`,
    aKey: `cateringBoden.faq.items.${index}.answer`,
    qFallback: `faq.items.${index}.question`,
    aFallback: `faq.items.${index}.answer`,
  }));

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: text(item.qKey, item.qFallback),
      acceptedAnswer: {
        "@type": "Answer",
        text: text(item.aKey, item.aFallback),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="section-title">
            <EditableText
              value={text("cateringBoden.content.title", "content.title")}
              textKey="cateringBoden.content.title"
              locale={currentLocale}
              page="catering-boden"
              canEdit={isOwner}
              as="span"
            />
          </h2>

          <div className="mt-6 space-y-5 text-base leading-8 text-dark/65">
            <p>
              <EditableText
                value={text(
                  "cateringBoden.content.paragraph1",
                  "content.paragraph1",
                )}
                textKey="cateringBoden.content.paragraph1"
                locale={currentLocale}
                page="catering-boden"
                canEdit={isOwner}
                as="span"
              />
            </p>

            <p>
              <EditableText
                value={text(
                  "cateringBoden.content.paragraph2",
                  "content.paragraph2",
                )}
                textKey="cateringBoden.content.paragraph2"
                locale={currentLocale}
                page="catering-boden"
                canEdit={isOwner}
                as="span"
              />
            </p>

            <p>
              <EditableText
                value={text(
                  "cateringBoden.content.paragraph3",
                  "content.paragraph3",
                )}
                textKey="cateringBoden.content.paragraph3"
                locale={currentLocale}
                page="catering-boden"
                canEdit={isOwner}
                as="span"
              />
            </p>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-6 shadow-xl shadow-[#4C2314]/8">
          <h2 className="text-2xl font-black tracking-[-0.04em] text-dark">
            <EditableText
              value={text("cateringBoden.benefits.title", "benefits.title")}
              textKey="cateringBoden.benefits.title"
              locale={currentLocale}
              page="catering-boden"
              canEdit={isOwner}
              as="span"
            />
          </h2>

          <ul className="mt-6 space-y-4">
            {benefits.map((item) => (
              <li
                key={item.key}
                className="flex gap-3 text-sm font-bold leading-6 text-dark/65"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-paprika" />

                <EditableText
                  value={text(item.key, item.fallbackKey)}
                  textKey={item.key}
                  locale={currentLocale}
                  page="catering-boden"
                  canEdit={isOwner}
                  as="span"
                />
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="mt-16">
        <h2 className="section-title">
          <EditableText
            value={text("cateringBoden.faq.title", "faq.title")}
            textKey="cateringBoden.faq.title"
            locale={currentLocale}
            page="catering-boden"
            canEdit={isOwner}
            as="span"
          />
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqItems.map((item) => (
            <div key={item.qKey} className="glass-card p-5">
              <h3 className="text-lg font-black text-dark">
                <EditableText
                  value={text(item.qKey, item.qFallback)}
                  textKey={item.qKey}
                  locale={currentLocale}
                  page="catering-boden"
                  canEdit={isOwner}
                  as="span"
                />
              </h3>

              <p className="mt-3 text-sm leading-6 text-dark/60">
                <EditableText
                  value={text(item.aKey, item.aFallback)}
                  textKey={item.aKey}
                  locale={currentLocale}
                  page="catering-boden"
                  canEdit={isOwner}
                  as="span"
                />
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

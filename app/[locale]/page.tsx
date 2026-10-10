import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { EditableText } from "@/components/EditableText";
import { HomeHeroPoster } from "@/components/HomeHeroPoster";
import { KitchenClosedModal } from "@/components/KitchenClosedModal";
import { KitchenStatusProvider } from "@/components/KitchenStatusProvider";
import { createClient } from "@/lib/supabase/server";
import { getPublicShiftStatus } from "@/lib/restaurant/public-shift";
import { getTranslations } from "next-intl/server";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type Locale = "sv" | "en" | "pl" | "ru";

const baseUrl = "https://www.nordiceatery.se";

const locales = ["sv", "en", "pl", "ru"] as const;

const homeSeo = {
  sv: {
    title: "Polsk streetfood, catering & event | Nordic Eatery",
    description:
        "Beställ färsk polsk comfort food, street food, fries och takeaway i Boden. Nordic Eatery erbjuder varm mat för upphämtning.",
    ogLocale: "sv_SE",
    keywords: [
      "takeaway Boden",
      "polsk mat Boden",
      "street food Boden",
      "mat i Boden",
      "Maczanka Boden",
      "Knysza Boden",
      "catering Boden",
    ],
  },
  en: {
    title: "Polish street food, catering & events | Nordic Eatery",
    description:
        "Order fresh Polish comfort food, street food, fries and takeaway in Boden. Nordic Eatery offers hot food for pickup.",
    ogLocale: "en_SE",
    keywords: [
      "takeaway Boden",
      "Polish food Boden",
      "Polish street food Boden",
      "food in Boden",
      "Maczanka Boden",
      "Knysza Boden",
      "catering Boden",
    ],
  },
  pl: {
    title: "Polskie jedzenie w Boden | Nordic Eatery",
    description:
        "Zamów świeże polskie comfort food, street food, frytki i jedzenie na wynos w Boden. Nordic Eatery oferuje odbiór.",
    ogLocale: "pl_PL",
    keywords: [
      "jedzenie na wynos Boden",
      "polskie jedzenie Boden",
      "street food Boden",
      "Maczanka Boden",
      "Knysza Boden",
      "catering Boden",
    ],
  },
  ru: {
    title: "Польский стритфуд, кейтеринг & ивенты | Nordic Eatery",
    description:
        "Заказывайте свежую польскую comfort food, street food, картофель фри и еду навынос в Будене. Nordic Eatery предлагает самовывоз.",
    ogLocale: "ru_RU",
    keywords: [
      "еда навынос Буден",
      "польская еда Буден",
      "street food Буден",
      "Maczanka Буден",
      "Knysza Буден",
      "кейтеринг Буден",
    ],
  },
} as const;

function isSupportedLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

function getHomeSeo(locale: string) {
  if (isSupportedLocale(locale)) {
    return homeSeo[locale];
  }

  return homeSeo.sv;
}

function getLocalizedUrl(locale: Locale, path = "") {
  return `${baseUrl}/${locale}${path}`;
}

function getLanguageAlternates(path = "") {
  return {
    sv: getLocalizedUrl("sv", path),
    en: getLocalizedUrl("en", path),
    pl: getLocalizedUrl("pl", path),
    ru: getLocalizedUrl("ru", path),
    "x-default": getLocalizedUrl("sv", path),
  };
}

export async function generateMetadata({
                                         params,
                                       }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;

  const currentLocale = isSupportedLocale(locale) ? locale : "sv";
  const seo = getHomeSeo(currentLocale);
  const canonicalUrl = getLocalizedUrl(currentLocale);

  return {
    title: seo.title,
    description: seo.description,
    keywords: [...seo.keywords],

    alternates: {
      canonical: canonicalUrl,
      languages: getLanguageAlternates(),
    },

    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonicalUrl,
      siteName: "Nordic Eatery",
      locale: seo.ogLocale,
      type: "website",
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: "Nordic Eatery food delivery in Boden",
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
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

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

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

  const t = await getTranslations("pages.home");

  const { data: siteContent } = await supabase
      .from("site_content")
      .select("key,value")
      .eq("locale", locale)
      .eq("page", "home");

  const content = new Map(
      (siteContent || []).map((item) => [item.key, item.value])
  );

  function text(key: string, fallbackKey: string) {
    return content.get(key) || t(fallbackKey);
  }

  const homePosters = [
    {
      key: "home.hero.poster.1",
      src: content.get("home.hero.poster.1") || "",
    },
    {
      key: "home.hero.poster.2",
      src: content.get("home.hero.poster.2") || "",
    },
    {
      key: "home.hero.poster.3",
      src: content.get("home.hero.poster.3") || "",
    },
    {
      key: "home.hero.poster.4",
      src: content.get("home.hero.poster.4") || "",
    },
  ].filter((poster) => poster.src);

  // Posters may only be configured in the site's default language.
  if (!homePosters.length && locale !== "sv") {
    const { data: defaultContent } = await supabase
        .from("site_content")
        .select("key,value")
        .eq("locale", "sv")
        .eq("page", "home");

    homePosters.push(
        ...(defaultContent || [])
            .filter((item) => /^home\.hero\.poster\.[1-4]$/.test(item.key) && item.value)
            .sort((a, b) => a.key.localeCompare(b.key))
            .map((item) => ({ key: item.key, src: item.value }))
    );
  }

  const { data: featuredItems } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .eq("is_popular", true)
      .or("track_stock.eq.false,stock_quantity.gt.0")
      .order("sort_order", { ascending: true })
      .limit(6);

  const shift = await getPublicShiftStatus();

  const categories = [
    {
      key: "home.categories.maczanka",
      fallbackKey: "categories.maczanka",
      name: text("home.categories.maczanka", "categories.maczanka"),
      emoji: "🥪",
    },
    {
      key: "home.categories.knysza",
      fallbackKey: "categories.knysza",
      name: text("home.categories.knysza", "categories.knysza"),
      emoji: "🌯",
    },
    {
      key: "home.categories.fries",
      fallbackKey: "categories.fries",
      name: text("home.categories.fries", "categories.fries"),
      emoji: "🍟",
    },
    {
      key: "home.categories.drinks",
      fallbackKey: "categories.drinks",
      name: text("home.categories.drinks", "categories.drinks"),
      emoji: "🥤",
    },
  ];

  return (
      <main>
        <KitchenClosedModal locale={locale} isOpenInitially={!shift.isOpen} />
        <section className="container-page pb-12 pt-14 sm:pb-20 sm:pt-20">
          <div className="grid items-center gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-5">
            <div className="text-center sm:text-left">
              <h1 className="mx-auto mt-6 max-w-2xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-dark sm:mx-0 sm:text-6xl lg:text-7xl">
                <EditableText
                    value={text("home.hero.titleLine1", "titleLine1")}
                    textKey="home.hero.titleLine1"
                    locale={locale}
                    page="home"
                    canEdit={isOwner}
                    as="span"
                />
                <br />
                <EditableText
                    value={text("home.hero.titleLine2", "titleLine2")}
                    textKey="home.hero.titleLine2"
                    locale={locale}
                    page="home"
                    canEdit={isOwner}
                    as="span"
                />
              </h1>

              <EditableText
                  value={text("home.hero.subtitle", "subtitle")}
                  textKey="home.hero.subtitle"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="p"
                  className="mx-auto mt-5 max-w-xl text-lg leading-8 text-dark/60 sm:mx-0 sm:text-xl sm:leading-9"
              />

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:justify-start">
                <Link
                    href={`/${locale}/menu`}
                    className="btn-primary w-full gap-2 sm:w-auto"
                >
                  <EditableText
                      value={text("home.hero.orderNow", "orderNow")}
                      textKey="home.hero.orderNow"
                      locale={locale}
                      page="home"
                      canEdit={isOwner}
                      as="span"
                  />
                  <ArrowRight size={18} />
                </Link>

                <Link
                    href={`/${locale}/cart`}
                    className="btn-secondary w-full sm:w-auto"
                >
                  <EditableText
                      value={text("home.hero.viewCart", "viewCart")}
                      textKey="home.hero.viewCart"
                      locale={locale}
                      page="home"
                      canEdit={isOwner}
                      as="span"
                  />
                </Link>
              </div>
            </div>

            <div className="home-hero-frame hero-card-in relative min-w-0">
              <div className="relative aspect-[4/5] sm:aspect-square lg:aspect-[9/8]">
                <HomeHeroPoster
                    posters={homePosters}
                    fallbackImage="/logo9.png"
                    locale={locale}
                    page="home"
                    canEdit={isOwner}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="container-page pb-12 sm:pb-14">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {categories.map((category) => (
                <Link
                    key={category.key}
                    href={`/${locale}/menu`}
                    className="glass-card group p-4 transition hover:-translate-y-1 hover:bg-white sm:p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-paprika/10 text-xl sm:mb-6 sm:h-14 sm:w-14 sm:text-2xl">
                    {category.emoji}
                  </div>

                  <div className="relative">
                    <EditableText
                        value={category.name}
                        textKey={category.key}
                        locale={locale}
                        page="home"
                        canEdit={isOwner}
                        as="p"
                        className="text-lg font-black text-dark sm:text-xl"
                    />
                  </div>

                  <p className="mt-1 text-xs text-dark/50 sm:mt-2 sm:text-sm">
                    {text("home.categories.exploreMenu", "exploreMenu")}
                  </p>
                </Link>
            ))}
          </div>
        </section>

        <section className="container-page pb-20 sm:pb-24">
          <div className="mb-8 flex flex-col justify-between gap-4 text-center sm:mb-10 sm:flex-row sm:items-end sm:text-left">
            <div className="flex flex-col items-center gap-1 sm:items-start">
              <EditableText
                  value={text("home.popular", "popular")}
                  textKey="home.popular"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="p"
                  className="font-black uppercase tracking-[0.25em] text-paprika"
              />

              <EditableText
                  value={text("home.bestSellers", "bestSellers")}
                  textKey="home.bestSellers"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="h2"
                  className="section-title"
              />
            </div>

            <Link href={`/${locale}/menu`} className="btn-secondary w-full sm:w-auto">
              <EditableText
                  value={text("home.fullMenu", "fullMenu")}
                  textKey="home.fullMenu"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="span"
              />
            </Link>
          </div>

          <KitchenStatusProvider locale={locale} isShiftOpen={shift.isOpen}>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
              {(featuredItems || []).map((product) => (
                  <ProductCard key={product.id} product={product} compact />
              ))}
            </div>
          </KitchenStatusProvider>
        </section>

        <section className="container-page pb-14 sm:pb-16">
          <div className="rounded-[1.5rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 sm:p-6">
            <div className="max-w-2xl">
              <EditableText
                  value={text("home.seoLinks.eyebrow", "seoLinks.eyebrow")}
                  textKey="home.seoLinks.eyebrow"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="p"
                  className="text-xs font-black uppercase tracking-[0.22em] text-paprika"
              />

              <EditableText
                  value={text("home.seoLinks.title", "seoLinks.title")}
                  textKey="home.seoLinks.title"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="h2"
                  className="mt-2 text-3xl font-black leading-[1] tracking-[-0.05em] text-dark sm:text-4xl"
              />

              <EditableText
                  value={text("home.seoLinks.description", "seoLinks.description")}
                  textKey="home.seoLinks.description"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="p"
                  className="mt-3 text-sm leading-7 text-dark/60 sm:text-base"
              />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Link
                  href={`/${locale}/delivery-boden`}
                  title={text("home.seoLinks.delivery", "seoLinks.delivery")}
                  aria-label={text("home.seoLinks.delivery", "seoLinks.delivery")}
                  className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
              >
                <EditableText
                    value={text(
                        "home.seoLinks.deliveryShort",
                        "seoLinks.deliveryShort"
                    )}
                    textKey="home.seoLinks.deliveryShort"
                    locale={locale}
                    page="home"
                    canEdit={isOwner}
                    as="span"
                />
              </Link>

              <Link
                  href={`/${locale}/takeaway-boden`}
                  title={text("home.seoLinks.takeaway", "seoLinks.takeaway")}
                  aria-label={text("home.seoLinks.takeaway", "seoLinks.takeaway")}
                  className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
              >
                <EditableText
                    value={text(
                        "home.seoLinks.takeawayShort",
                        "seoLinks.takeawayShort"
                    )}
                    textKey="home.seoLinks.takeawayShort"
                    locale={locale}
                    page="home"
                    canEdit={isOwner}
                    as="span"
                />
              </Link>

              <Link
                  href={`/${locale}/polish-food-boden`}
                  title={text("home.seoLinks.burgers", "seoLinks.burgers")}
                  aria-label={text("home.seoLinks.burgers", "seoLinks.burgers")}
                  className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
              >
                <EditableText
                    value={text(
                        "home.seoLinks.burgersShort",
                        "seoLinks.burgersShort"
                    )}
                    textKey="home.seoLinks.burgersShort"
                    locale={locale}
                    page="home"
                    canEdit={isOwner}
                    as="span"
                />
              </Link>

              <Link
                  href={`/${locale}/catering-boden`}
                  title={text("home.seoLinks.catering", "seoLinks.catering")}
                  aria-label={text("home.seoLinks.catering", "seoLinks.catering")}
                  className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
              >
                <EditableText
                    value={text(
                        "home.seoLinks.cateringShort",
                        "seoLinks.cateringShort"
                    )}
                    textKey="home.seoLinks.cateringShort"
                    locale={locale}
                    page="home"
                    canEdit={isOwner}
                    as="span"
                />
              </Link>

              <Link
                  href={`/${locale}/menu`}
                  title={text("home.seoLinks.menu", "seoLinks.menu")}
                  aria-label={text("home.seoLinks.menu", "seoLinks.menu")}
                  className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
              >
                <EditableText
                    value={text("home.seoLinks.menuShort", "seoLinks.menuShort")}
                    textKey="home.seoLinks.menuShort"
                    locale={locale}
                    page="home"
                    canEdit={isOwner}
                    as="span"
                />
              </Link>
            </div>
          </div>
        </section>
      </main>
  );
}

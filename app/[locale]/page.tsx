import { getPublicPath } from "@/i18n/paths";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isSauceCategory } from "@/lib/menu-offers";
import { ProductCard } from "@/components/ProductCard";
import { EditableText } from "@/components/EditableText";
import { EditableCategoryTiles } from "@/components/menu/EditableCategoryTiles";
import { HomeHeroPoster } from "@/components/HomeHeroPoster";
import { KitchenClosedModal } from "@/components/KitchenClosedModal";
import { OrderEntryModal } from "@/components/OrderEntryModal";
import { KitchenStatusProvider } from "@/components/KitchenStatusProvider";
import { createClient } from "@/lib/supabase/server";
import { getPublicShiftStatus } from "@/lib/restaurant/public-shift";
import { HomeFoodTruckLocation } from "@/components/HomeFoodTruckLocation";
import { getTranslations } from "next-intl/server";
import {
  getMenuCategories,
  MENU_CATEGORY_ORDER_KEY,
  MENU_CATEGORY_ORDER_LOCALE,
  parseMenuCategoryOrder,
} from "@/lib/menu-display";

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
    title: "Local Soul, Global Taste | Nordic Eatery",
    description:
      "Upptäck Nordic Street Fusion, skräddarsydd catering och vällagade matlådor. Smakupplevelser från Norrbotten med inspiration från hela världen.",
    ogLocale: "sv_SE",
    keywords: [
      "takeaway",
      "polsk mat",
      "street food",
      "mat",
      "Maczanka",
      "Knysza",
      "catering",
    ],
  },
  en: {
    title: "Local Soul, Global Taste | Nordic Eatery",
    description:
      "Discover Nordic Street Fusion, bespoke catering and delicious ready-made meals. A taste of Norrbotten, inspired by flavours from around the world.",
    ogLocale: "en_SE",
    keywords: [
      "takeaway",
      "Polish food",
      "Polish street food",
      "food",
      "Maczanka",
      "Knysza",
      "catering",
    ],
  },
  pl: {
    title: "Local Soul, Global Taste | Nordic Eatery",
    description:
      "Zamów świeże polskie comfort food, street food, frytki i jedzenie na wynos. Nordic Eatery oferuje odbiór.",
    ogLocale: "pl_PL",
    keywords: [
      "jedzenie na wynos",
      "polskie jedzenie",
      "street food",
      "Maczanka",
      "Knysza",
      "catering",
    ],
  },
  ru: {
    title: "Local Soul, Global Taste | Nordic Eatery",
    description:
      "Откройте для себя Nordic Street Fusion, кейтеринг с индивидуальным подходом и вкусные готовые обеды. Гастрономические впечатления из Норрботтена, вдохновлённые кухнями всего мира.",
    ogLocale: "ru_RU",
    keywords: [
      "еда навынос",
      "польская еда",
      "street food",
      "Maczanka",
      "Knysza",
      "кейтеринг",
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
    title: { absolute: seo.title },
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
          alt: "Nordic Eatery street food",
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
  const menuText = await getTranslations("pages.menu");
  const catalogText = await getTranslations("catalog");

  const { data: siteContent } = await supabase
    .from("site_content")
    .select("page,key,value")
    .eq("locale", locale)
    .in("page", ["home", "menu"]);

  const content = new Map(
    (siteContent || [])
      .filter((item) => item.page === "home")
      .map((item) => [item.key, item.value]),
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
        .filter(
          (item) => /^home\.hero\.poster\.[1-4]$/.test(item.key) && item.value,
        )
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((item) => ({ key: item.key, src: item.value })),
    );
  }

  const { data: menuItems } = await supabase
    .from("products")
    .select("*")
    .eq("is_available", true)
    .or("track_stock.eq.false,stock_quantity.gt.0")
    .order("sort_order", { ascending: true })
    .limit(1000);

  const featuredItems = (menuItems || [])
    .filter((product) => product.is_popular)
    .slice(0, 6);

  const shift = await getPublicShiftStatus();

  let savedCategoryOrder =
    (siteContent || []).find(
      (item) => item.page === "menu" && item.key === MENU_CATEGORY_ORDER_KEY,
    )?.value || "";

  if (locale !== MENU_CATEGORY_ORDER_LOCALE) {
    const { data: defaultOrder } = await supabase
      .from("site_content")
      .select("value")
      .eq("page", "menu")
      .eq("key", MENU_CATEGORY_ORDER_KEY)
      .eq("locale", MENU_CATEGORY_ORDER_LOCALE)
      .maybeSingle();
    savedCategoryOrder = defaultOrder?.value || "";
  }

  const categoryOrder = parseMenuCategoryOrder(savedCategoryOrder);
  const menuCategories = getMenuCategories(
    menuItems || [],
    Object.fromEntries(
      (siteContent || [])
        .filter((item) => item.page === "menu")
        .map((item) => [item.key, item.value]),
    ),
    (id) => menuText(`categories.${id}`),
    categoryOrder,
  );

  return (
    <main>
      <KitchenClosedModal locale={locale} isOpenInitially={!shift.isOpen} />
      <OrderEntryModal
        locale={locale}
        isShiftOpen={shift.isOpen}
        openedAt={shift.openedAt}
        groupsEnabled={process.env.GROUP_ORDERS_ENABLED === "true"}
      />
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
                href={getPublicPath(locale, "/menu")}
                className="btn-primary min-h-16 w-full gap-3 px-10 py-5 text-xl sm:w-auto sm:min-w-72"
              >
                <EditableText
                  value={text("home.hero.orderNow", "orderNow")}
                  textKey="home.hero.orderNow"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="span"
                />
                <ArrowRight size={24} />
              </Link>
            </div>
          </div>

          <div className="home-hero-frame hero-card-in relative min-w-0">
            <div className="relative aspect-[4/5]">
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

      <HomeFoodTruckLocation
        initialLocation={{
          isOpen: shift.isOpen,
          address: shift.locationAddress,
          coordinates: shift.coordinates,
          approximate: false,
        }}
      />

      <section className="container-page pb-12 sm:pb-14">
        <EditableCategoryTiles
          categories={menuCategories}
          locale={locale}
          canEdit={isOwner}
          ariaLabel={catalogText("categories")}
        />
      </section>

      <section className="container-page pb-20 sm:pb-24">
        <div className="mb-8 flex flex-col justify-between gap-4 text-center sm:mb-10 sm:flex-row sm:items-end sm:text-left">
          <div className="flex flex-col items-center gap-1 sm:items-start">
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

          <Link
            href={getPublicPath(locale, "/menu")}
            className="btn-secondary w-full sm:w-auto"
          >
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
              <ProductCard
                key={product.id}
                product={product}
                drinks={(menuItems || []).filter(
                  (item) => item.category === "drinks",
                )}
                sauces={(menuItems || []).filter((item) =>
                  isSauceCategory(item.category),
                )}
                compact
              />
            ))}
          </div>
        </KitchenStatusProvider>
      </section>

      <section className="container-page pb-14 sm:pb-16">
        <div className="rounded-[1.5rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 sm:p-6">
          <div className="max-w-2xl">
            <EditableText
              value={text("home.seoLinks.title", "seoLinks.title")}
              textKey="home.seoLinks.title"
              locale={locale}
              page="home"
              canEdit={isOwner}
              as="h2"
              className="text-3xl font-black leading-[1] tracking-[-0.05em] text-dark sm:text-4xl"
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
              href={getPublicPath(locale, "/booking")}
              title={text(
                "home.seoLinks.deliveryShort",
                "seoLinks.deliveryShort",
              )}
              className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
            >
              <EditableText
                value={text(
                  "home.seoLinks.deliveryShort",
                  "seoLinks.deliveryShort",
                )}
                textKey="home.seoLinks.deliveryShort"
                locale={locale}
                page="home"
                canEdit={isOwner}
                as="span"
              />
            </Link>
            <Link
              href={`/${locale}/bestall-takeaway`}
              title={text(
                "home.seoLinks.takeawayShort",
                "seoLinks.takeawayShort",
              )}
              className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
            >
              <EditableText
                value={text(
                  "home.seoLinks.takeawayShort",
                  "seoLinks.takeawayShort",
                )}
                textKey="home.seoLinks.takeawayShort"
                locale={locale}
                page="home"
                canEdit={isOwner}
                as="span"
              />
            </Link>

            <Link
              href={`/${locale}/streetfood-i-norrbotten`}
              title={text(
                "home.seoLinks.burgersShort",
                "seoLinks.burgersShort",
              )}
              className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
            >
              <EditableText
                value={text(
                  "home.seoLinks.burgersShort",
                  "seoLinks.burgersShort",
                )}
                textKey="home.seoLinks.burgersShort"
                locale={locale}
                page="home"
                canEdit={isOwner}
                as="span"
              />
            </Link>

            <Link
              href={`/${locale}/catering`}
              title={text(
                "home.seoLinks.cateringShort",
                "seoLinks.cateringShort",
              )}
              className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
            >
              <EditableText
                value={text(
                  "home.seoLinks.cateringShort",
                  "seoLinks.cateringShort",
                )}
                textKey="home.seoLinks.cateringShort"
                locale={locale}
                page="home"
                canEdit={isOwner}
                as="span"
              />
            </Link>

            <Link
              href={getPublicPath(locale, "/menu")}
              title={text("home.seoLinks.menuShort", "seoLinks.menuShort")}
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

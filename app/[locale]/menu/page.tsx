import { getPublicPath } from "@/i18n/paths";
import type { Metadata } from "next";
import Link from "next/link";
import { GroupOrderEntry } from "@/components/group-orders/GroupOrderEntry";
import { MenuCatalog } from "@/components/menu/MenuCatalog";
import { MenuJsonLd } from "@/components/seo/MenuJsonLd";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { EditableText } from "@/components/EditableText";
import { KitchenStatusProvider } from "@/components/KitchenStatusProvider";
import { KitchenClosedModal } from "@/components/KitchenClosedModal";
import { getPublicShiftStatus } from "@/lib/restaurant/public-shift";
import { FoodTruckLocation } from "@/components/FoodTruckLocation";
import {
  MENU_CATEGORY_ORDER_KEY,
  MENU_CATEGORY_ORDER_LOCALE,
  parseMenuCategoryOrder,
} from "@/lib/menu-display";

type Locale = "sv" | "en" | "pl" | "ru";

type MenuType = "all" | "standard" | "vegan" | "gluten_free";

type MenuPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    type?: string;
    category?: string;
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

function getValidMenuType(type?: string): MenuType {
  if (type === "standard") return "standard";
  if (type === "vegan") return "vegan";
  if (type === "gluten_free") return "gluten_free";

  return "all";
}

function buildMenuUrl(locale: Locale) {
  return `${baseUrl}${getPublicPath(locale, "/menu")}`;
}

function buildLanguageAlternates() {
  return {
    sv: buildMenuUrl("sv"),
    en: buildMenuUrl("en"),
    pl: buildMenuUrl("pl"),
    ru: buildMenuUrl("ru"),
    "x-default": buildMenuUrl("sv"),
  };
}

export async function generateMetadata({
  params,
}: MenuPageProps): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = getSafeLocale(locale);

  const t = await getTranslations({
    locale: currentLocale,
    namespace: "seo.menu",
  });

  const canonical = buildMenuUrl(currentLocale);

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

export default async function MenuPage({
  params,
  searchParams,
}: MenuPageProps) {
  const { locale } = await params;
  const currentLocale = getSafeLocale(locale);
  const resolvedSearchParams = await searchParams;

  const selectedMenuType = getValidMenuType(resolvedSearchParams?.type);
  const selectedCategory =
    typeof resolvedSearchParams?.category === "string"
      ? resolvedSearchParams.category
      : "";

  const shiftStatus = await getPublicShiftStatus();

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
    namespace: "pages.menu",
  });

  const { data: siteContent } = await supabase
    .from("site_content")
    .select("key,value")
    .eq("locale", currentLocale)
    .eq("page", "menu");

  const content = new Map(
    (siteContent || []).map((item) => [item.key, item.value]),
  );

  let savedCategoryOrder = content.get(MENU_CATEGORY_ORDER_KEY) || "";
  if (currentLocale !== MENU_CATEGORY_ORDER_LOCALE) {
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

  function text(key: string, fallbackKey: string) {
    return content.get(key) || t(fallbackKey);
  }

  const query = supabase
    .from("products")
    .select("*")
    .eq("is_available", true)
    .or("track_stock.eq.false,stock_quantity.gt.0")
    .order("sort_order", { ascending: true })
    .limit(1000);

  const { data: menuItems, error: catalogError } = await query;
  const groupText = await getTranslations({
    locale: currentLocale,
    namespace: "groupOrder",
  });

  return (
    <>
      <MenuJsonLd products={menuItems || []} locale={currentLocale} />

      <main className="container-page py-8 sm:py-12">
        <KitchenClosedModal
          locale={currentLocale}
          isOpenInitially={!shiftStatus.isOpen}
        />

        <div className="max-w-3xl text-center sm:text-left">
          <h1 className="section-title">
            <EditableText
              value={text("menu.title", "title")}
              textKey="menu.title"
              locale={currentLocale}
              page="menu"
              canEdit={isOwner}
              as="span"
            />
          </h1>

          <p className="mt-4 text-base leading-6 text-dark/60">
            <EditableText
              value={text("menu.subtitle", "subtitle")}
              textKey="menu.subtitle"
              locale={currentLocale}
              page="menu"
              canEdit={isOwner}
              as="span"
            />
          </p>
        </div>

        {shiftStatus.isOpen && (
          <FoodTruckLocation
            address={shiftStatus.locationAddress}
            coordinates={shiftStatus.coordinates}
            className="mt-6"
          />
        )}
        {!shiftStatus.isOpen ? (
          <div className="mt-8 rounded-[2rem] border border-paprika/15 bg-paprika/10 p-5 text-sm font-bold leading-6 text-paprika">
            Kitchen is currently closed. You can browse the menu, but online
            ordering is paused until the shift is opened.
          </div>
        ) : null}

        {process.env.GROUP_ORDERS_ENABLED === "true" && (
          <GroupOrderEntry locale={currentLocale} />
        )}

        <div id="menu-catalog" className="mt-7 scroll-mt-28">
          {catalogError ? (
            <p role="alert" className="rounded-2xl bg-white p-6">
              {groupText("errors.unavailable")}
            </p>
          ) : (
            <KitchenStatusProvider
              locale={currentLocale}
              isShiftOpen={shiftStatus.isOpen}
            >
              <MenuCatalog
                key={`${selectedMenuType}:${selectedCategory}`}
                products={menuItems || []}
                content={Object.fromEntries(content)}
                categoryOrder={categoryOrder}
                initialType={selectedMenuType}
                initialCategory={selectedCategory}
              />
            </KitchenStatusProvider>
          )}
        </div>
      </main>
    </>
  );
}

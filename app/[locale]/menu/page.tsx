import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { MenuJsonLd } from "@/components/seo/MenuJsonLd";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { EditableText } from "@/components/EditableText";
import { KitchenClosedModal } from "@/components/KitchenClosedModal";
import { getPublicShiftStatus } from "@/lib/restaurant/public-shift";

type Locale = "sv" | "en" | "pl" | "ru";

type MenuType = "all" | "standard" | "vegan" | "gluten_free";

type MenuPageProps = {
    params: Promise<{
        locale: string;
    }>;
    searchParams?: Promise<{
        type?: string;
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

const menuTypes = [
    { id: "all", label: "All" },
    { id: "standard", label: "Standard" },
    { id: "vegan", label: "Vegan" },
    { id: "gluten_free", label: "Gluten Free" },
] as const;

const categories = [
    { id: "maczanka", titleKey: "maczanka" },
    { id: "knysza", titleKey: "knysza" },
    { id: "fries", titleKey: "fries" },
    { id: "sauces", titleKey: "sauces" },
    { id: "drinks", titleKey: "drinks" },
] as const;

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
    return `${baseUrl}/${locale}/menu`;
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
        title: t("title"),
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
        (siteContent || []).map((item) => [item.key, item.value])
    );

    function text(key: string, fallbackKey: string) {
        return content.get(key) || t(fallbackKey);
    }

    let query = supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .or("track_stock.eq.false,stock_quantity.gt.0")
        .order("sort_order", { ascending: true });

    if (selectedMenuType !== "all") {
        query = query.eq("menu_type", selectedMenuType);
    }

    const { data: menuItems } = await query;

    return (
        <>
            <MenuJsonLd products={menuItems || []} locale={currentLocale} />

            <main className="container-page py-16">
                <KitchenClosedModal
                    locale={currentLocale}
                    isOpenInitially={!shiftStatus.isOpen}
                />

                <div className="max-w-3xl text-center sm:text-left">
                    <p className="font-black uppercase tracking-[0.25em] text-paprika">
                        <EditableText
                            value={text("menu.eyebrow", "eyebrow")}
                            textKey="menu.eyebrow"
                            locale={currentLocale}
                            page="menu"
                            canEdit={isOwner}
                            as="span"
                        />
                    </p>

                    <h1 className="section-title mt-3">
                        <EditableText
                            value={text("menu.title", "title")}
                            textKey="menu.title"
                            locale={currentLocale}
                            page="menu"
                            canEdit={isOwner}
                            as="span"
                        />
                    </h1>

                    <p className="mt-5 text-lg leading-8 text-dark/60">
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

                {!shiftStatus.isOpen ? (
                    <div className="mt-8 rounded-[2rem] border border-paprika/15 bg-paprika/10 p-5 text-sm font-bold leading-6 text-paprika">
                        Kitchen is currently closed. You can browse the menu, but online
                        ordering is paused until the shift is opened.
                    </div>
                ) : null}

                <div className="mt-10 flex flex-wrap gap-3">
                    {menuTypes.map((type) => {
                        const isActive = selectedMenuType === type.id;

                        return (
                            <Link
                                key={type.id}
                                href={
                                    type.id === "all"
                                        ? `/${currentLocale}/menu`
                                        : `/${currentLocale}/menu?type=${type.id}`
                                }
                                className={[
                                    "rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.18em] transition",
                                    isActive
                                        ? "bg-paprika text-white shadow-lg shadow-paprika/20"
                                        : "border border-dark/10 bg-white text-dark hover:border-paprika hover:text-paprika",
                                ].join(" ")}
                            >
                                {type.label}
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-10 space-y-14">
                    {categories.map((category) => {
                        const products =
                            menuItems?.filter((item) => item.category === category.id) || [];

                        if (products.length === 0) return null;

                        const categoryTextKey = `menu.categories.${category.titleKey}`;
                        const fallbackKey = `categories.${category.titleKey}`;

                        return (
                            <section key={category.id} id={category.id}>
                                <h2 className="mb-6 text-3xl font-black text-dark">
                                    <EditableText
                                        value={text(categoryTextKey, fallbackKey)}
                                        textKey={categoryTextKey}
                                        locale={currentLocale}
                                        page="menu"
                                        canEdit={isOwner}
                                        as="span"
                                    />
                                </h2>

                                <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                                    {products.map((product) => (
                                        <ProductCard key={product.id} product={product} compact />
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>
        </>
    );
}
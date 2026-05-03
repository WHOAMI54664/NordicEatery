import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { MenuJsonLd } from "@/components/seo/MenuJsonLd";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

type MenuPageProps = {
    params: Promise<{
        locale: string;
    }>;
};

const baseUrl = "https://www.nordiceatery.se";

const categories = [
    { id: "maczanka", titleKey: "maczanka" },
    { id: "knysza", titleKey: "knysza" },
    { id: "fries", titleKey: "fries" },
    { id: "drinks", titleKey: "drinks" },
] as const;

export async function generateMetadata({
                                           params,
                                       }: MenuPageProps): Promise<Metadata> {
    const { locale } = await params;

    const t = await getTranslations({
        locale,
        namespace: "seo.menu",
    });

    const canonical = `${baseUrl}/${locale}/menu`;

    return {
        title: t("title"),
        description: t("description"),

        alternates: {
            canonical,
            languages: {
                en: `${baseUrl}/en/menu`,
                sv: `${baseUrl}/sv/menu`,
                pl: `${baseUrl}/pl/menu`,
                ru: `${baseUrl}/ru/menu`,
                "x-default": `${baseUrl}/en/menu`,
            },
        },

        openGraph: {
            title: t("ogTitle"),
            description: t("ogDescription"),
            url: canonical,
            siteName: "Nordic Eatery",
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
    };
}

export default async function MenuPage({ params }: MenuPageProps) {
    const { locale } = await params;

    const supabase = await createClient();
    const t = await getTranslations("pages.menu");

    const { data: menuItems } = await supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .or("track_stock.eq.false,stock_quantity.gt.0")
        .order("sort_order", { ascending: true });

    return (
        <>
            <MenuJsonLd products={menuItems || []} locale={locale} />

            <main className="container-page py-16">
                <div className="max-w-3xl text-center sm:text-left">
                    <p className="font-black uppercase tracking-[0.25em] text-paprika">
                        {t("eyebrow")}
                    </p>

                    <h1 className="section-title mt-3">{t("title")}</h1>

                    <p className="mt-5 text-lg leading-8 text-dark/60">
                        {t("subtitle")}
                    </p>
                </div>

                <div className="mt-10 space-y-14">
                    {categories.map((category) => {
                        const products =
                            menuItems?.filter((item) => item.category === category.id) || [];

                        if (products.length === 0) return null;

                        return (
                            <section key={category.id} id={category.id}>
                                <h2 className="mb-6 text-3xl font-black text-dark">
                                    {t(`categories.${category.titleKey}`)}
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
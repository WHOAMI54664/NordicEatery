import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowRight,
    CheckCircle2,
    Flame,
    Sandwich,
    Utensils,
} from "lucide-react";
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

function buildPolishFoodUrl(locale: Locale) {
    return `${baseUrl}/${locale}/polish-food-boden`;
}

function buildLanguageAlternates() {
    return {
        sv: buildPolishFoodUrl("sv"),
        en: buildPolishFoodUrl("en"),
        pl: buildPolishFoodUrl("pl"),
        ru: buildPolishFoodUrl("ru"),
        "x-default": buildPolishFoodUrl("sv"),
    };
}

export async function generateMetadata({
                                           params,
                                       }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const currentLocale = getSafeLocale(locale);

    const t = await getTranslations({
        locale: currentLocale,
        namespace: "seo.polishFoodBoden",
    });

    const canonical = buildPolishFoodUrl(currentLocale);

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

export default async function PolishFoodBodenPage({ params }: PageProps) {
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
        namespace: "pages.polishFoodBoden",
    });

    const { data: siteContent } = await supabase
        .from("site_content")
        .select("key,value")
        .eq("locale", currentLocale)
        .eq("page", "polish-food-boden");

    const content = new Map(
        (siteContent || []).map((item) => [item.key, item.value])
    );

    function text(key: string, fallbackKey: string) {
        return content.get(key) || t(fallbackKey);
    }

    const menuUrl = `/${currentLocale}/menu`;
    const deliveryUrl = `/${currentLocale}/delivery-boden`;
    const takeawayUrl = `/${currentLocale}/takeaway-boden`;

    const cards = [
        {
            icon: Sandwich,
            titleKey: "polishFoodBoden.cards.maczanka.title",
            textKey: "polishFoodBoden.cards.maczanka.description",
            fallbackTitle: "cards.maczanka.title",
            fallbackText: "cards.maczanka.description",
        },
        {
            icon: Flame,
            titleKey: "polishFoodBoden.cards.streetFood.title",
            textKey: "polishFoodBoden.cards.streetFood.description",
            fallbackTitle: "cards.streetFood.title",
            fallbackText: "cards.streetFood.description",
        },
        {
            icon: CheckCircle2,
            titleKey: "polishFoodBoden.cards.takeaway.title",
            textKey: "polishFoodBoden.cards.takeaway.description",
            fallbackTitle: "cards.takeaway.title",
            fallbackText: "cards.takeaway.description",
        },
    ];

    const benefitItems = [0, 1, 2, 3, 4, 5].map((index) => ({
        key: `polishFoodBoden.benefits.items.${index}`,
        fallbackKey: `benefits.items.${index}`,
    }));

    return (
        <main className="container-page py-16">
            <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-6 shadow-2xl shadow-[#4C2314]/10 sm:p-10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.10),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.18),transparent_34%)]" />

                <div className="relative max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#C7192E]">
                        <Utensils className="h-4 w-4" />

                        <EditableText
                            value={text("polishFoodBoden.hero.eyebrow", "hero.eyebrow")}
                            textKey="polishFoodBoden.hero.eyebrow"
                            locale={currentLocale}
                            page="polish-food-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </div>

                    <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#25120F] sm:text-6xl">
                        <EditableText
                            value={text("polishFoodBoden.hero.title", "hero.title")}
                            textKey="polishFoodBoden.hero.title"
                            locale={currentLocale}
                            page="polish-food-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[#7B6A61]">
                        <EditableText
                            value={text(
                                "polishFoodBoden.hero.description",
                                "hero.description"
                            )}
                            textKey="polishFoodBoden.hero.description"
                            locale={currentLocale}
                            page="polish-food-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link href={menuUrl} className="btn-primary gap-2">
                            <EditableText
                                value={text(
                                    "polishFoodBoden.hero.primaryCta",
                                    "hero.primaryCta"
                                )}
                                textKey="polishFoodBoden.hero.primaryCta"
                                locale={currentLocale}
                                page="polish-food-boden"
                                canEdit={isOwner}
                                as="span"
                            />

                            <ArrowRight className="h-4 w-4" />
                        </Link>

                        <Link href={deliveryUrl} className="btn-secondary">
                            <EditableText
                                value={text(
                                    "polishFoodBoden.hero.secondaryCta",
                                    "hero.secondaryCta"
                                )}
                                textKey="polishFoodBoden.hero.secondaryCta"
                                locale={currentLocale}
                                page="polish-food-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mt-10 grid gap-4 md:grid-cols-3">
                {cards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div key={card.titleKey} className="glass-card p-5">
                            <Icon className="h-6 w-6 text-paprika" />

                            <h2 className="mt-4 text-lg font-black text-dark">
                                <EditableText
                                    value={text(card.titleKey, card.fallbackTitle)}
                                    textKey={card.titleKey}
                                    locale={currentLocale}
                                    page="polish-food-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-dark/60">
                                <EditableText
                                    value={text(card.textKey, card.fallbackText)}
                                    textKey={card.textKey}
                                    locale={currentLocale}
                                    page="polish-food-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </p>
                        </div>
                    );
                })}
            </section>

            <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                    <p className="font-black uppercase tracking-[0.25em] text-paprika">
                        <EditableText
                            value={text("polishFoodBoden.content.eyebrow", "content.eyebrow")}
                            textKey="polishFoodBoden.content.eyebrow"
                            locale={currentLocale}
                            page="polish-food-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </p>

                    <h2 className="section-title mt-3">
                        <EditableText
                            value={text("polishFoodBoden.content.title", "content.title")}
                            textKey="polishFoodBoden.content.title"
                            locale={currentLocale}
                            page="polish-food-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </h2>

                    <div className="mt-6 space-y-5 text-base leading-8 text-dark/65">
                        <p>
                            <EditableText
                                value={text(
                                    "polishFoodBoden.content.paragraph1",
                                    "content.paragraph1"
                                )}
                                textKey="polishFoodBoden.content.paragraph1"
                                locale={currentLocale}
                                page="polish-food-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </p>

                        <p>
                            <EditableText
                                value={text(
                                    "polishFoodBoden.content.paragraph2",
                                    "content.paragraph2"
                                )}
                                textKey="polishFoodBoden.content.paragraph2"
                                locale={currentLocale}
                                page="polish-food-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </p>

                        <p>
                            <EditableText
                                value={text(
                                    "polishFoodBoden.content.paragraph3",
                                    "content.paragraph3"
                                )}
                                textKey="polishFoodBoden.content.paragraph3"
                                locale={currentLocale}
                                page="polish-food-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href={menuUrl} className="btn-primary">
                            <EditableText
                                value={text("polishFoodBoden.content.menuCta", "content.menuCta")}
                                textKey="polishFoodBoden.content.menuCta"
                                locale={currentLocale}
                                page="polish-food-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </Link>

                        <Link href={takeawayUrl} className="btn-secondary">
                            <EditableText
                                value={text(
                                    "polishFoodBoden.content.takeawayCta",
                                    "content.takeawayCta"
                                )}
                                textKey="polishFoodBoden.content.takeawayCta"
                                locale={currentLocale}
                                page="polish-food-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </Link>

                        <Link href={deliveryUrl} className="btn-secondary">
                            <EditableText
                                value={text(
                                    "polishFoodBoden.content.deliveryCta",
                                    "content.deliveryCta"
                                )}
                                textKey="polishFoodBoden.content.deliveryCta"
                                locale={currentLocale}
                                page="polish-food-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </Link>
                    </div>
                </div>

                <aside className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-6 shadow-xl shadow-[#4C2314]/8">
                    <h2 className="text-2xl font-black tracking-[-0.04em] text-dark">
                        <EditableText
                            value={text("polishFoodBoden.benefits.title", "benefits.title")}
                            textKey="polishFoodBoden.benefits.title"
                            locale={currentLocale}
                            page="polish-food-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </h2>

                    <ul className="mt-6 space-y-4">
                        {benefitItems.map((item) => (
                            <li
                                key={item.key}
                                className="flex gap-3 text-sm font-bold leading-6 text-dark/65"
                            >
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-paprika" />

                                <EditableText
                                    value={text(item.key, item.fallbackKey)}
                                    textKey={item.key}
                                    locale={currentLocale}
                                    page="polish-food-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </li>
                        ))}
                    </ul>
                </aside>
            </section>
        </main>
    );
}
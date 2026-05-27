import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    PackageCheck,
    ShoppingBag,
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

function buildTakeawayUrl(locale: Locale) {
    return `${baseUrl}/${locale}/takeaway-boden`;
}

function buildLanguageAlternates() {
    return {
        sv: buildTakeawayUrl("sv"),
        en: buildTakeawayUrl("en"),
        pl: buildTakeawayUrl("pl"),
        ru: buildTakeawayUrl("ru"),
        "x-default": buildTakeawayUrl("sv"),
    };
}

export async function generateMetadata({
                                           params,
                                       }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const currentLocale = getSafeLocale(locale);

    const t = await getTranslations({
        locale: currentLocale,
        namespace: "seo.takeawayBoden",
    });

    const canonical = buildTakeawayUrl(currentLocale);

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

export default async function TakeawayBodenPage({ params }: PageProps) {
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
        namespace: "pages.takeawayBoden",
    });

    const { data: siteContent } = await supabase
        .from("site_content")
        .select("key,value")
        .eq("locale", currentLocale)
        .eq("page", "takeaway-boden");

    const content = new Map(
        (siteContent || []).map((item) => [item.key, item.value])
    );

    function text(key: string, fallbackKey: string) {
        return content.get(key) || t(fallbackKey);
    }

    const menuUrl = `/${currentLocale}/menu`;
    const deliveryUrl = `/${currentLocale}/delivery-boden`;
    const polishFoodUrl = `/${currentLocale}/polish-food-boden`;
    const cateringUrl = `/${currentLocale}/catering-boden`;

    const cards = [
        {
            icon: ShoppingBag,
            titleKey: "takeawayBoden.cards.order.title",
            textKey: "takeawayBoden.cards.order.description",
            fallbackTitle: "cards.order.title",
            fallbackText: "cards.order.description",
        },
        {
            icon: Utensils,
            titleKey: "takeawayBoden.cards.fresh.title",
            textKey: "takeawayBoden.cards.fresh.description",
            fallbackTitle: "cards.fresh.title",
            fallbackText: "cards.fresh.description",
        },
        {
            icon: Clock,
            titleKey: "takeawayBoden.cards.pickup.title",
            textKey: "takeawayBoden.cards.pickup.description",
            fallbackTitle: "cards.pickup.title",
            fallbackText: "cards.pickup.description",
        },
        {
            icon: PackageCheck,
            titleKey: "takeawayBoden.cards.simple.title",
            textKey: "takeawayBoden.cards.simple.description",
            fallbackTitle: "cards.simple.title",
            fallbackText: "cards.simple.description",
        },
    ];

    const benefits = [0, 1, 2, 3, 4, 5].map((index) => ({
        key: `takeawayBoden.benefits.items.${index}`,
        fallbackKey: `benefits.items.${index}`,
    }));

    const faqItems = [0, 1, 2, 3].map((index) => ({
        qKey: `takeawayBoden.faq.items.${index}.question`,
        aKey: `takeawayBoden.faq.items.${index}.answer`,
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

            <main className="container-page py-16">
                <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-6 shadow-2xl shadow-[#4C2314]/10 sm:p-10">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.10),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.18),transparent_34%)]" />

                    <div className="relative max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#C7192E]">
                            <ShoppingBag className="h-4 w-4" />

                            <EditableText
                                value={text("takeawayBoden.hero.eyebrow", "hero.eyebrow")}
                                textKey="takeawayBoden.hero.eyebrow"
                                locale={currentLocale}
                                page="takeaway-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </div>

                        <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#25120F] sm:text-6xl">
                            <EditableText
                                value={text("takeawayBoden.hero.title", "hero.title")}
                                textKey="takeawayBoden.hero.title"
                                locale={currentLocale}
                                page="takeaway-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[#7B6A61]">
                            <EditableText
                                value={text(
                                    "takeawayBoden.hero.description",
                                    "hero.description"
                                )}
                                textKey="takeawayBoden.hero.description"
                                locale={currentLocale}
                                page="takeaway-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link href={menuUrl} className="btn-primary gap-2">
                                <EditableText
                                    value={text(
                                        "takeawayBoden.hero.primaryCta",
                                        "hero.primaryCta"
                                    )}
                                    textKey="takeawayBoden.hero.primaryCta"
                                    locale={currentLocale}
                                    page="takeaway-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />

                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <Link href={deliveryUrl} className="btn-secondary">
                                <EditableText
                                    value={text(
                                        "takeawayBoden.hero.secondaryCta",
                                        "hero.secondaryCta"
                                    )}
                                    textKey="takeawayBoden.hero.secondaryCta"
                                    locale={currentLocale}
                                    page="takeaway-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="mt-10 grid gap-4 md:grid-cols-4">
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
                                        page="takeaway-boden"
                                        canEdit={isOwner}
                                        as="span"
                                    />
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-dark/60">
                                    <EditableText
                                        value={text(card.textKey, card.fallbackText)}
                                        textKey={card.textKey}
                                        locale={currentLocale}
                                        page="takeaway-boden"
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
                                value={text(
                                    "takeawayBoden.content.eyebrow",
                                    "content.eyebrow"
                                )}
                                textKey="takeawayBoden.content.eyebrow"
                                locale={currentLocale}
                                page="takeaway-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </p>

                        <h2 className="section-title mt-3">
                            <EditableText
                                value={text("takeawayBoden.content.title", "content.title")}
                                textKey="takeawayBoden.content.title"
                                locale={currentLocale}
                                page="takeaway-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </h2>

                        <div className="mt-6 space-y-5 text-base leading-8 text-dark/65">
                            <p>
                                <EditableText
                                    value={text(
                                        "takeawayBoden.content.paragraph1",
                                        "content.paragraph1"
                                    )}
                                    textKey="takeawayBoden.content.paragraph1"
                                    locale={currentLocale}
                                    page="takeaway-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </p>

                            <p>
                                <EditableText
                                    value={text(
                                        "takeawayBoden.content.paragraph2",
                                        "content.paragraph2"
                                    )}
                                    textKey="takeawayBoden.content.paragraph2"
                                    locale={currentLocale}
                                    page="takeaway-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </p>

                            <p>
                                <EditableText
                                    value={text(
                                        "takeawayBoden.content.paragraph3",
                                        "content.paragraph3"
                                    )}
                                    textKey="takeawayBoden.content.paragraph3"
                                    locale={currentLocale}
                                    page="takeaway-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </p>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href={menuUrl} className="btn-primary">
                                <EditableText
                                    value={text(
                                        "takeawayBoden.content.menuCta",
                                        "content.menuCta"
                                    )}
                                    textKey="takeawayBoden.content.menuCta"
                                    locale={currentLocale}
                                    page="takeaway-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </Link>

                            <Link href={polishFoodUrl} className="btn-secondary">
                                <EditableText
                                    value={text(
                                        "takeawayBoden.content.burgersCta",
                                        "content.burgersCta"
                                    )}
                                    textKey="takeawayBoden.content.burgersCta"
                                    locale={currentLocale}
                                    page="takeaway-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </Link>

                            <Link href={cateringUrl} className="btn-secondary">
                                <EditableText
                                    value={text(
                                        "takeawayBoden.content.cateringCta",
                                        "content.cateringCta"
                                    )}
                                    textKey="takeawayBoden.content.cateringCta"
                                    locale={currentLocale}
                                    page="takeaway-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </Link>
                        </div>
                    </div>

                    <aside className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-6 shadow-xl shadow-[#4C2314]/8">
                        <h2 className="text-2xl font-black tracking-[-0.04em] text-dark">
                            <EditableText
                                value={text("takeawayBoden.benefits.title", "benefits.title")}
                                textKey="takeawayBoden.benefits.title"
                                locale={currentLocale}
                                page="takeaway-boden"
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
                                        page="takeaway-boden"
                                        canEdit={isOwner}
                                        as="span"
                                    />
                                </li>
                            ))}
                        </ul>
                    </aside>
                </section>

                <section className="mt-16">
                    <p className="font-black uppercase tracking-[0.25em] text-paprika">
                        <EditableText
                            value={text("takeawayBoden.faq.eyebrow", "faq.eyebrow")}
                            textKey="takeawayBoden.faq.eyebrow"
                            locale={currentLocale}
                            page="takeaway-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </p>

                    <h2 className="section-title mt-3">
                        <EditableText
                            value={text("takeawayBoden.faq.title", "faq.title")}
                            textKey="takeawayBoden.faq.title"
                            locale={currentLocale}
                            page="takeaway-boden"
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
                                        page="takeaway-boden"
                                        canEdit={isOwner}
                                        as="span"
                                    />
                                </h3>

                                <p className="mt-3 text-sm leading-6 text-dark/60">
                                    <EditableText
                                        value={text(item.aKey, item.aFallback)}
                                        textKey={item.aKey}
                                        locale={currentLocale}
                                        page="takeaway-boden"
                                        canEdit={isOwner}
                                        as="span"
                                    />
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </>
    );
}
import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowRight,
    Briefcase,
    CheckCircle2,
    ChefHat,
    MessageCircle,
    PartyPopper,
    Truck,
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

function buildCateringUrl(locale: Locale) {
    return `${baseUrl}/${locale}/catering-boden`;
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

export default async function CateringBodenPage({ params }: PageProps) {
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
        (siteContent || []).map((item) => [item.key, item.value])
    );

    function text(key: string, fallbackKey: string) {
        return content.get(key) || t(fallbackKey);
    }

    const bookingUrl = `/${currentLocale}/booking`;
    const contactUrl = `/${currentLocale}/contact`;
    const menuUrl = `/${currentLocale}/menu`;
    const deliveryUrl = `/${currentLocale}/delivery-boden`;

    const cards = [
        {
            icon: PartyPopper,
            titleKey: "cateringBoden.cards.private.title",
            textKey: "cateringBoden.cards.private.description",
            fallbackTitle: "cards.private.title",
            fallbackText: "cards.private.description",
        },
        {
            icon: Briefcase,
            titleKey: "cateringBoden.cards.company.title",
            textKey: "cateringBoden.cards.company.description",
            fallbackTitle: "cards.company.title",
            fallbackText: "cards.company.description",
        },
        {
            icon: Truck,
            titleKey: "cateringBoden.cards.delivery.title",
            textKey: "cateringBoden.cards.delivery.description",
            fallbackTitle: "cards.delivery.title",
            fallbackText: "cards.delivery.description",
        },
        {
            icon: MessageCircle,
            titleKey: "cateringBoden.cards.planning.title",
            textKey: "cateringBoden.cards.planning.description",
            fallbackTitle: "cards.planning.title",
            fallbackText: "cards.planning.description",
        },
    ];

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

            <main className="container-page py-16">
                <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-6 shadow-2xl shadow-[#4C2314]/10 sm:p-10">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.10),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.18),transparent_34%)]" />

                    <div className="relative max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#C7192E]">
                            <ChefHat className="h-4 w-4" />

                            <EditableText
                                value={text("cateringBoden.hero.eyebrow", "hero.eyebrow")}
                                textKey="cateringBoden.hero.eyebrow"
                                locale={currentLocale}
                                page="catering-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </div>

                        <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#25120F] sm:text-6xl">
                            <EditableText
                                value={text("cateringBoden.hero.title", "hero.title")}
                                textKey="cateringBoden.hero.title"
                                locale={currentLocale}
                                page="catering-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[#7B6A61]">
                            <EditableText
                                value={text(
                                    "cateringBoden.hero.description",
                                    "hero.description"
                                )}
                                textKey="cateringBoden.hero.description"
                                locale={currentLocale}
                                page="catering-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link href={bookingUrl} className="btn-primary gap-2">
                                <EditableText
                                    value={text(
                                        "cateringBoden.hero.primaryCta",
                                        "hero.primaryCta"
                                    )}
                                    textKey="cateringBoden.hero.primaryCta"
                                    locale={currentLocale}
                                    page="catering-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />

                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <Link href={contactUrl} className="btn-secondary">
                                <EditableText
                                    value={text(
                                        "cateringBoden.hero.secondaryCta",
                                        "hero.secondaryCta"
                                    )}
                                    textKey="cateringBoden.hero.secondaryCta"
                                    locale={currentLocale}
                                    page="catering-boden"
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
                                        page="catering-boden"
                                        canEdit={isOwner}
                                        as="span"
                                    />
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-dark/60">
                                    <EditableText
                                        value={text(card.textKey, card.fallbackText)}
                                        textKey={card.textKey}
                                        locale={currentLocale}
                                        page="catering-boden"
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
                                    "cateringBoden.content.eyebrow",
                                    "content.eyebrow"
                                )}
                                textKey="cateringBoden.content.eyebrow"
                                locale={currentLocale}
                                page="catering-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </p>

                        <h2 className="section-title mt-3">
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
                                        "content.paragraph1"
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
                                        "content.paragraph2"
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
                                        "content.paragraph3"
                                    )}
                                    textKey="cateringBoden.content.paragraph3"
                                    locale={currentLocale}
                                    page="catering-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </p>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href={bookingUrl} className="btn-primary">
                                <EditableText
                                    value={text(
                                        "cateringBoden.content.bookingCta",
                                        "content.bookingCta"
                                    )}
                                    textKey="cateringBoden.content.bookingCta"
                                    locale={currentLocale}
                                    page="catering-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </Link>

                            <Link href={menuUrl} className="btn-secondary">
                                <EditableText
                                    value={text(
                                        "cateringBoden.content.menuCta",
                                        "content.menuCta"
                                    )}
                                    textKey="cateringBoden.content.menuCta"
                                    locale={currentLocale}
                                    page="catering-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </Link>

                            <Link href={deliveryUrl} className="btn-secondary">
                                <EditableText
                                    value={text(
                                        "cateringBoden.content.deliveryCta",
                                        "content.deliveryCta"
                                    )}
                                    textKey="cateringBoden.content.deliveryCta"
                                    locale={currentLocale}
                                    page="catering-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </Link>
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

                <section className="mt-16 rounded-[2rem] bg-gradient-to-r from-paprika to-orange-400 p-8 text-center text-white shadow-xl sm:p-10">
                    <Utensils className="mx-auto h-8 w-8" />

                    <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                        <EditableText
                            value={text("cateringBoden.cta.title", "cta.title")}
                            textKey="cateringBoden.cta.title"
                            locale={currentLocale}
                            page="catering-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl text-white/90">
                        <EditableText
                            value={text("cateringBoden.cta.description", "cta.description")}
                            textKey="cateringBoden.cta.description"
                            locale={currentLocale}
                            page="catering-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </p>

                    <Link href={bookingUrl} className="btn-secondary mt-8 inline-flex">
                        <EditableText
                            value={text("cateringBoden.cta.button", "cta.button")}
                            textKey="cateringBoden.cta.button"
                            locale={currentLocale}
                            page="catering-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </Link>
                </section>

                <section className="mt-16">
                    <p className="font-black uppercase tracking-[0.25em] text-paprika">
                        <EditableText
                            value={text("cateringBoden.faq.eyebrow", "faq.eyebrow")}
                            textKey="cateringBoden.faq.eyebrow"
                            locale={currentLocale}
                            page="catering-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </p>

                    <h2 className="section-title mt-3">
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
            </main>
        </>
    );
}
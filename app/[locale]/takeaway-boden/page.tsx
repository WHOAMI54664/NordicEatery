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

type PageProps = {
    params: Promise<{
        locale: string;
    }>;
};

const baseUrl = "https://www.nordiceatery.se";

export async function generateMetadata({
                                           params,
                                       }: PageProps): Promise<Metadata> {
    const { locale } = await params;

    const t = await getTranslations({
        locale,
        namespace: "seo.takeawayBoden",
    });

    const canonical = `${baseUrl}/${locale}/takeaway-boden`;

    return {
        title: t("title"),
        description: t("description"),
        alternates: {
            canonical,
            languages: {
                en: `${baseUrl}/en/takeaway-boden`,
                sv: `${baseUrl}/sv/takeaway-boden`,
                pl: `${baseUrl}/pl/takeaway-boden`,
                ru: `${baseUrl}/ru/takeaway-boden`,
                "x-default": `${baseUrl}/en/takeaway-boden`,
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

export default async function TakeawayBodenPage({ params }: PageProps) {
    const { locale } = await params;

    const t = await getTranslations({
        locale,
        namespace: "pages.takeawayBoden",
    });

    const menuUrl = `/${locale}/menu`;
    const deliveryUrl = `/${locale}/delivery-boden`;
    const burgersUrl = `/${locale}/burgers-boden`;
    const cateringUrl = `/${locale}/catering-boden`;

    const faqItems = [
        {
            question: t("faq.items.0.question"),
            answer: t("faq.items.0.answer"),
        },
        {
            question: t("faq.items.1.question"),
            answer: t("faq.items.1.answer"),
        },
        {
            question: t("faq.items.2.question"),
            answer: t("faq.items.2.answer"),
        },
        {
            question: t("faq.items.3.question"),
            answer: t("faq.items.3.answer"),
        },
    ];

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
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
                            {t("hero.eyebrow")}
                        </div>

                        <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#25120F] sm:text-6xl">
                            {t("hero.title")}
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[#7B6A61]">
                            {t("hero.description")}
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link href={menuUrl} className="btn-primary gap-2">
                                {t("hero.primaryCta")}
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <Link href={deliveryUrl} className="btn-secondary">
                                {t("hero.secondaryCta")}
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="mt-10 grid gap-4 md:grid-cols-4">
                    <div className="glass-card p-5">
                        <ShoppingBag className="h-6 w-6 text-paprika" />
                        <h2 className="mt-4 text-lg font-black text-dark">
                            {t("cards.order.title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-dark/60">
                            {t("cards.order.description")}
                        </p>
                    </div>

                    <div className="glass-card p-5">
                        <Utensils className="h-6 w-6 text-paprika" />
                        <h2 className="mt-4 text-lg font-black text-dark">
                            {t("cards.fresh.title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-dark/60">
                            {t("cards.fresh.description")}
                        </p>
                    </div>

                    <div className="glass-card p-5">
                        <Clock className="h-6 w-6 text-paprika" />
                        <h2 className="mt-4 text-lg font-black text-dark">
                            {t("cards.pickup.title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-dark/60">
                            {t("cards.pickup.description")}
                        </p>
                    </div>

                    <div className="glass-card p-5">
                        <PackageCheck className="h-6 w-6 text-paprika" />
                        <h2 className="mt-4 text-lg font-black text-dark">
                            {t("cards.simple.title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-dark/60">
                            {t("cards.simple.description")}
                        </p>
                    </div>
                </section>

                <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <p className="font-black uppercase tracking-[0.25em] text-paprika">
                            {t("content.eyebrow")}
                        </p>

                        <h2 className="section-title mt-3">{t("content.title")}</h2>

                        <div className="mt-6 space-y-5 text-base leading-8 text-dark/65">
                            <p>{t("content.paragraph1")}</p>
                            <p>{t("content.paragraph2")}</p>
                            <p>{t("content.paragraph3")}</p>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href={menuUrl} className="btn-primary">
                                {t("content.menuCta")}
                            </Link>

                            <Link href={burgersUrl} className="btn-secondary">
                                {t("content.burgersCta")}
                            </Link>

                            <Link href={cateringUrl} className="btn-secondary">
                                {t("content.cateringCta")}
                            </Link>
                        </div>
                    </div>

                    <aside className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-6 shadow-xl shadow-[#4C2314]/8">
                        <h2 className="text-2xl font-black tracking-[-0.04em] text-dark">
                            {t("benefits.title")}
                        </h2>

                        <ul className="mt-6 space-y-4">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                                <li
                                    key={index}
                                    className="flex gap-3 text-sm font-bold leading-6 text-dark/65"
                                >
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-paprika" />
                                    {t(`benefits.items.${index}`)}
                                </li>
                            ))}
                        </ul>
                    </aside>
                </section>

                <section className="mt-16">
                    <p className="font-black uppercase tracking-[0.25em] text-paprika">
                        {t("faq.eyebrow")}
                    </p>

                    <h2 className="section-title mt-3">{t("faq.title")}</h2>

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                        {faqItems.map((item) => (
                            <div key={item.question} className="glass-card p-5">
                                <h3 className="text-lg font-black text-dark">
                                    {item.question}
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-dark/60">
                                    {item.answer}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </>
    );
}
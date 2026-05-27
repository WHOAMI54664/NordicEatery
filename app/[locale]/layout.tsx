import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConditionalPublicChrome } from "@/components/layout/ConditionalPublicChrome";

type Locale = "sv" | "en" | "pl" | "ru";

type LocaleLayoutProps = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

const localeSeo = {
    sv: {
        title: "Nordic Eatery | Polsk mat, takeaway & catering i Boden",
        description:
            "Nordic Eatery erbjuder polskinspirerad comfort food, street food, takeaway, matleverans och catering i Boden.",
        ogLocale: "sv_SE",
    },
    en: {
        title: "Nordic Eatery | Polish food, takeaway & catering in Boden",
        description:
            "Nordic Eatery offers Polish-inspired comfort food, street food, takeaway, food delivery and catering in Boden.",
        ogLocale: "en_US",
    },
    pl: {
        title: "Nordic Eatery | Polskie jedzenie, odbiór i catering w Boden",
        description:
            "Nordic Eatery oferuje polskie comfort food, street food, jedzenie na wynos, dostawę i catering w Boden.",
        ogLocale: "pl_PL",
    },
    ru: {
        title: "Nordic Eatery | Польская еда, самовывоз и кейтеринг в Будене",
        description:
            "Nordic Eatery предлагает польскую comfort food, street food, еду навынос, доставку и кейтеринг в Будене.",
        ogLocale: "ru_RU",
    },
} as const;

function isSupportedLocale(locale: string): locale is Locale {
    return routing.locales.includes(locale as Locale);
}

function getLocaleSeo(locale: string) {
    if (isSupportedLocale(locale)) {
        return localeSeo[locale];
    }

    return localeSeo.sv;
}

export async function generateMetadata({
                                           params,
                                       }: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const seo = getLocaleSeo(locale);

    return {
        title: {
            default: seo.title,
            template: "%s | Nordic Eatery",
        },
        description: seo.description,

        openGraph: {
            title: seo.title,
            description: seo.description,
            siteName: "Nordic Eatery",
            type: "website",
            locale: seo.ogLocale,
            images: [
                {
                    url: "/og-image.jpg",
                    width: 1200,
                    height: 630,
                    alt: "Nordic Eatery in Boden",
                },
            ],
        },

        twitter: {
            card: "summary_large_image",
            title: seo.title,
            description: seo.description,
            images: ["/og-image.jpg"],
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

export default async function LocaleLayout({
                                               children,
                                               params,
                                           }: LocaleLayoutProps) {
    const { locale } = await params;

    if (!isSupportedLocale(locale)) {
        notFound();
    }

    const messages = (await import(`@/messages/${locale}.json`)).default;

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <ConditionalPublicChrome
                locale={locale}
                header={<Header />}
                footer={<Footer />}
            >
                {children}
            </ConditionalPublicChrome>

            <SpeedInsights />
        </NextIntlClientProvider>
    );
}
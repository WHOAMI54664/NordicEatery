import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    MapPin,
    ShoppingBag,
    Star,
} from "lucide-react";

type PageProps = {
    params: Promise<{
        locale: string;
    }>;
};

const baseUrl = "https://www.nordiceatery.se";

const content = {
    en: {
        metadataTitle: "Food Delivery in Boden | Order Online | Nordic Eatery",
        metadataDescription:
            "Order fresh Polish comfort food, burgers, crispy fries and street food in Boden. Fast food delivery and takeaway from Nordic Eatery in 30–40 minutes.",
        ogTitle: "Food Delivery in Boden | Nordic Eatery",
        ogDescription:
            "Fresh Polish comfort food, burgers, fries and street food with fast delivery and takeaway in Boden.",

        eyebrow: "Food delivery in Boden",
        h1: "Fast food delivery in Boden",
        intro:
            "Looking for fresh food delivery in Boden? Nordic Eatery serves Polish comfort food, burgers, crispy fries and street food made fresh to order. Order online for delivery or takeaway and enjoy warm food in around 30–40 minutes.",
        orderOnline: "Order online",
        takeaway: "Takeaway in Boden",

        card1Title: "30–40 min",
        card1Text: "Fast delivery time for online food orders in Boden.",
        card2Title: "Order online",
        card2Text: "Choose your favourite dishes from our online menu.",
        card3Title: "Fresh food",
        card3Text: "Burgers, fries, Polish comfort food and street food.",
        card4Title: "Takeaway too",
        card4Text: "Prefer pickup? Order takeaway and collect your food.",

        sectionEyebrow: "Order food online",
        sectionTitle: "Fresh delivery food in Boden",
        paragraph1:
            "Nordic Eatery is a local food concept in Boden focused on real food, quick service and easy online ordering. Our menu is built around comforting dishes that work perfectly for delivery and takeaway — warm, filling and prepared fresh.",
        paragraph2:
            "Whether you are searching for food delivery in Boden, takeaway near you, burgers, crispy fries or Polish street food, Nordic Eatery gives you a simple way to order online without waiting on the phone.",
        paragraph3:
            "We prepare orders as quickly as possible while keeping the food fresh and consistent. Delivery usually takes around 30–40 minutes, depending on the time of day, order size and delivery location.",

        viewMenu: "View menu",
        burgers: "Burgers in Boden",
        catering: "Catering",

        whyTitle: "Why order from Nordic Eatery?",
        benefits: [
            "Fast food delivery in Boden",
            "Freshly prepared dishes",
            "Polish comfort food and street food",
            "Burgers, fries and drinks",
            "Online ordering for delivery or takeaway",
            "Good option for lunch, dinner or casual meals",
        ],

        faqEyebrow: "FAQ",
        faqTitle: "Food delivery questions",
        faq: [
            {
                q: "Do you deliver food in Boden?",
                a: "Yes. Nordic Eatery offers online food delivery in Boden with fresh dishes prepared for delivery and takeaway.",
            },
            {
                q: "How long does delivery take?",
                a: "Delivery usually takes around 30–40 minutes depending on demand, order size and delivery location.",
            },
            {
                q: "Can I order takeaway?",
                a: "Yes. You can order online and choose takeaway if you prefer to pick up your food.",
            },
            {
                q: "What food can I order?",
                a: "You can order burgers, crispy fries, Polish comfort food, street food, drinks and selected menu specials.",
            },
        ],
    },

    sv: {
        metadataTitle: "Matleverans i Boden | Beställ online | Nordic Eatery",
        metadataDescription:
            "Beställ polsk comfort food, hamburgare, krispiga pommes och street food i Boden. Snabb matleverans och takeaway från Nordic Eatery på 30–40 minuter.",
        ogTitle: "Matleverans i Boden | Nordic Eatery",
        ogDescription:
            "Polsk comfort food, hamburgare, pommes och street food med snabb leverans och takeaway i Boden.",

        eyebrow: "Matleverans i Boden",
        h1: "Snabb matleverans i Boden",
        intro:
            "Letar du efter färsk matleverans i Boden? Nordic Eatery serverar polsk comfort food, hamburgare, krispiga pommes och street food som tillagas färskt vid beställning. Beställ online för leverans eller takeaway och få varm mat på cirka 30–40 minuter.",
        orderOnline: "Beställ online",
        takeaway: "Takeaway i Boden",

        card1Title: "30–40 min",
        card1Text: "Snabb leveranstid för matbeställningar online i Boden.",
        card2Title: "Beställ online",
        card2Text: "Välj dina favoriträtter från vår online-meny.",
        card3Title: "Färsk mat",
        card3Text: "Hamburgare, pommes, polsk comfort food och street food.",
        card4Title: "Även takeaway",
        card4Text: "Vill du hämta själv? Beställ takeaway och hämta din mat.",

        sectionEyebrow: "Beställ mat online",
        sectionTitle: "Färsk matleverans i Boden",
        paragraph1:
            "Nordic Eatery är ett lokalt matkoncept i Boden med fokus på riktig mat, snabb service och enkel onlinebeställning. Vår meny är skapad för rätter som passar perfekt för leverans och takeaway — varma, mättande och färskt tillagade.",
        paragraph2:
            "Oavsett om du söker matleverans i Boden, takeaway nära dig, hamburgare, krispiga pommes eller polsk street food ger Nordic Eatery dig ett enkelt sätt att beställa online utan att behöva ringa.",
        paragraph3:
            "Vi förbereder beställningar så snabbt som möjligt samtidigt som maten håller hög kvalitet. Leverans tar vanligtvis cirka 30–40 minuter beroende på tidpunkt, orderstorlek och leveransadress.",

        viewMenu: "Se meny",
        burgers: "Hamburgare i Boden",
        catering: "Catering",

        whyTitle: "Varför beställa från Nordic Eatery?",
        benefits: [
            "Snabb matleverans i Boden",
            "Färskt tillagade rätter",
            "Polsk comfort food och street food",
            "Hamburgare, pommes och drycker",
            "Onlinebeställning för leverans eller takeaway",
            "Bra val för lunch, middag eller enkel vardagsmat",
        ],

        faqEyebrow: "FAQ",
        faqTitle: "Vanliga frågor om matleverans",
        faq: [
            {
                q: "Levererar ni mat i Boden?",
                a: "Ja. Nordic Eatery erbjuder matleverans online i Boden med färska rätter för både leverans och takeaway.",
            },
            {
                q: "Hur lång tid tar leveransen?",
                a: "Leverans tar vanligtvis cirka 30–40 minuter beroende på efterfrågan, orderstorlek och leveransadress.",
            },
            {
                q: "Kan jag beställa takeaway?",
                a: "Ja. Du kan beställa online och välja takeaway om du vill hämta maten själv.",
            },
            {
                q: "Vilken mat kan jag beställa?",
                a: "Du kan beställa hamburgare, krispiga pommes, polsk comfort food, street food, drycker och utvalda menyfavoriter.",
            },
        ],
    },
};

function getPageContent(locale: string) {
    if (locale === "sv") return content.sv;
    return content.en;
}

export async function generateMetadata({
                                           params,
                                       }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const page = getPageContent(locale);

    const canonical =
        locale === "sv"
            ? `${baseUrl}/sv/delivery-boden`
            : `${baseUrl}/en/delivery-boden`;

    return {
        title: page.metadataTitle,
        description: page.metadataDescription,
        alternates: {
            canonical,
            languages: {
                en: `${baseUrl}/en/delivery-boden`,
                sv: `${baseUrl}/sv/delivery-boden`,
                "x-default": `${baseUrl}/en/delivery-boden`,
            },
        },
        openGraph: {
            title: page.ogTitle,
            description: page.ogDescription,
            url: canonical,
            siteName: "Nordic Eatery",
            type: "website",
            images: [
                {
                    url: `${baseUrl}/og-image.jpg`,
                    width: 1200,
                    height: 630,
                    alt: page.ogTitle,
                },
            ],
        },
    };
}

export default async function DeliveryBodenPage({ params }: PageProps) {
    const { locale } = await params;
    const page = getPageContent(locale);

    const menuUrl = `/${locale}/menu`;
    const takeawayUrl = `/${locale}/takeaway-boden`;
    const burgersUrl = `/${locale}/burgers-boden`;
    const cateringUrl = `/${locale}/catering-boden`;

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
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
                            <MapPin className="h-4 w-4" />
                            {page.eyebrow}
                        </div>

                        <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#25120F] sm:text-6xl">
                            {page.h1}
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[#7B6A61]">
                            {page.intro}
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link href={menuUrl} className="btn-primary gap-2">
                                {page.orderOnline}
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <Link href={takeawayUrl} className="btn-secondary">
                                {page.takeaway}
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="mt-10 grid gap-4 md:grid-cols-4">
                    <div className="glass-card p-5">
                        <Clock className="h-6 w-6 text-paprika" />
                        <h2 className="mt-4 text-lg font-black text-dark">
                            {page.card1Title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-dark/60">
                            {page.card1Text}
                        </p>
                    </div>

                    <div className="glass-card p-5">
                        <ShoppingBag className="h-6 w-6 text-paprika" />
                        <h2 className="mt-4 text-lg font-black text-dark">
                            {page.card2Title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-dark/60">
                            {page.card2Text}
                        </p>
                    </div>

                    <div className="glass-card p-5">
                        <Star className="h-6 w-6 text-paprika" />
                        <h2 className="mt-4 text-lg font-black text-dark">
                            {page.card3Title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-dark/60">
                            {page.card3Text}
                        </p>
                    </div>

                    <div className="glass-card p-5">
                        <CheckCircle2 className="h-6 w-6 text-paprika" />
                        <h2 className="mt-4 text-lg font-black text-dark">
                            {page.card4Title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-dark/60">
                            {page.card4Text}
                        </p>
                    </div>
                </section>

                <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <p className="font-black uppercase tracking-[0.25em] text-paprika">
                            {page.sectionEyebrow}
                        </p>

                        <h2 className="section-title mt-3">{page.sectionTitle}</h2>

                        <div className="mt-6 space-y-5 text-base leading-8 text-dark/65">
                            <p>{page.paragraph1}</p>
                            <p>{page.paragraph2}</p>
                            <p>{page.paragraph3}</p>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href={menuUrl} className="btn-primary">
                                {page.viewMenu}
                            </Link>

                            <Link href={burgersUrl} className="btn-secondary">
                                {page.burgers}
                            </Link>

                            <Link href={cateringUrl} className="btn-secondary">
                                {page.catering}
                            </Link>
                        </div>
                    </div>

                    <aside className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-6 shadow-xl shadow-[#4C2314]/8">
                        <h2 className="text-2xl font-black tracking-[-0.04em] text-dark">
                            {page.whyTitle}
                        </h2>

                        <ul className="mt-6 space-y-4">
                            {page.benefits.map((item) => (
                                <li
                                    key={item}
                                    className="flex gap-3 text-sm font-bold leading-6 text-dark/65"
                                >
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-paprika" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </aside>
                </section>

                <section className="mt-16">
                    <p className="font-black uppercase tracking-[0.25em] text-paprika">
                        {page.faqEyebrow}
                    </p>

                    <h2 className="section-title mt-3">{page.faqTitle}</h2>

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                        {page.faq.map((item) => (
                            <div key={item.q} className="glass-card p-5">
                                <h3 className="text-lg font-black text-dark">{item.q}</h3>
                                <p className="mt-3 text-sm leading-6 text-dark/60">
                                    {item.a}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </>
    );
}
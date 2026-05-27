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

const content = {
    sv: {
        metadataTitle: "Matleverans i Boden | Beställ online | Nordic Eatery",
        metadataDescription:
            "Beställ polsk comfort food, maczanka, knysza, krispiga pommes och street food i Boden. Snabb matleverans och takeaway från Nordic Eatery.",
        ogTitle: "Matleverans i Boden | Nordic Eatery",
        ogDescription:
            "Polsk comfort food, maczanka, knysza, pommes och street food med leverans och takeaway i Boden.",

        eyebrow: "Matleverans i Boden",
        h1: "Snabb matleverans i Boden",
        intro:
            "Letar du efter färsk matleverans i Boden? Nordic Eatery serverar polsk comfort food, maczanka, knysza, krispiga pommes och street food som tillagas färskt vid beställning. Beställ online för leverans eller takeaway och få varm mat så snabbt som möjligt.",
        orderOnline: "Beställ online",
        takeaway: "Takeaway i Boden",

        card1Title: "Snabb leverans",
        card1Text: "Smidig matleverans för onlinebeställningar i Boden.",
        card2Title: "Beställ online",
        card2Text: "Välj dina favoriträtter från vår online-meny.",
        card3Title: "Färsk mat",
        card3Text: "Maczanka, knysza, pommes, polsk comfort food och street food.",
        card4Title: "Även takeaway",
        card4Text: "Vill du hämta själv? Beställ takeaway och hämta din mat.",

        sectionEyebrow: "Beställ mat online",
        sectionTitle: "Färsk matleverans i Boden",
        paragraph1:
            "Nordic Eatery är ett lokalt matkoncept i Boden med fokus på riktig mat, snabb service och enkel onlinebeställning. Vår meny är skapad för rätter som passar perfekt för leverans och takeaway — varma, mättande och färskt tillagade.",
        paragraph2:
            "Oavsett om du söker matleverans i Boden, takeaway nära dig, krispiga pommes eller polsk street food ger Nordic Eatery dig ett enkelt sätt att beställa online utan att behöva ringa.",
        paragraph3:
            "Vi förbereder beställningar så snabbt som möjligt samtidigt som maten håller hög kvalitet. Leveranstiden kan variera beroende på tidpunkt, orderstorlek och leveransadress.",

        viewMenu: "Se meny",
        polishFood: "Polsk mat i Boden",
        catering: "Catering",

        whyTitle: "Varför beställa från Nordic Eatery?",
        benefits: [
            "Matleverans i Boden",
            "Färskt tillagade rätter",
            "Polsk comfort food och street food",
            "Maczanka, knysza, pommes och drycker",
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
                a: "Leveranstiden kan variera beroende på efterfrågan, orderstorlek och leveransadress.",
            },
            {
                q: "Kan jag beställa takeaway?",
                a: "Ja. Du kan beställa online och välja takeaway om du vill hämta maten själv.",
            },
            {
                q: "Vilken mat kan jag beställa?",
                a: "Du kan beställa maczanka, knysza, krispiga pommes, polsk comfort food, street food, drycker och utvalda menyfavoriter.",
            },
        ],
    },

    en: {
        metadataTitle: "Food Delivery in Boden | Order Online | Nordic Eatery",
        metadataDescription:
            "Order fresh Polish comfort food, maczanka, knysza, crispy fries and street food in Boden. Food delivery and takeaway from Nordic Eatery.",
        ogTitle: "Food Delivery in Boden | Nordic Eatery",
        ogDescription:
            "Fresh Polish comfort food, maczanka, knysza, fries and street food with delivery and takeaway in Boden.",

        eyebrow: "Food delivery in Boden",
        h1: "Fast food delivery in Boden",
        intro:
            "Looking for fresh food delivery in Boden? Nordic Eatery serves Polish comfort food, maczanka, knysza, crispy fries and street food made fresh to order. Order online for delivery or takeaway and enjoy warm food as quickly as possible.",
        orderOnline: "Order online",
        takeaway: "Takeaway in Boden",

        card1Title: "Fast delivery",
        card1Text: "Smooth food delivery for online orders in Boden.",
        card2Title: "Order online",
        card2Text: "Choose your favourite dishes from our online menu.",
        card3Title: "Fresh food",
        card3Text: "Maczanka, knysza, fries, Polish comfort food and street food.",
        card4Title: "Takeaway too",
        card4Text: "Prefer pickup? Order takeaway and collect your food.",

        sectionEyebrow: "Order food online",
        sectionTitle: "Fresh delivery food in Boden",
        paragraph1:
            "Nordic Eatery is a local food concept in Boden focused on real food, quick service and easy online ordering. Our menu is built around comforting dishes that work perfectly for delivery and takeaway — warm, filling and prepared fresh.",
        paragraph2:
            "Whether you are searching for food delivery in Boden, takeaway near you, crispy fries or Polish street food, Nordic Eatery gives you a simple way to order online without waiting on the phone.",
        paragraph3:
            "We prepare orders as quickly as possible while keeping the food fresh and consistent. Delivery time can vary depending on the time of day, order size and delivery location.",

        viewMenu: "View menu",
        polishFood: "Polish food in Boden",
        catering: "Catering",

        whyTitle: "Why order from Nordic Eatery?",
        benefits: [
            "Food delivery in Boden",
            "Freshly prepared dishes",
            "Polish comfort food and street food",
            "Maczanka, knysza, fries and drinks",
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
                a: "Delivery time can vary depending on demand, order size and delivery location.",
            },
            {
                q: "Can I order takeaway?",
                a: "Yes. You can order online and choose takeaway if you prefer to pick up your food.",
            },
            {
                q: "What food can I order?",
                a: "You can order maczanka, knysza, crispy fries, Polish comfort food, street food, drinks and selected menu specials.",
            },
        ],
    },

    pl: {
        metadataTitle: "Dostawa jedzenia w Boden | Zamów online | Nordic Eatery",
        metadataDescription:
            "Zamów świeże polskie comfort food, maczankę, knyszę, chrupiące frytki i street food w Boden. Dostawa i odbiór z Nordic Eatery.",
        ogTitle: "Dostawa jedzenia w Boden | Nordic Eatery",
        ogDescription:
            "Polskie comfort food, maczanka, knysza, frytki i street food z dostawą oraz odbiorem w Boden.",

        eyebrow: "Dostawa jedzenia w Boden",
        h1: "Szybka dostawa jedzenia w Boden",
        intro:
            "Szukasz świeżego jedzenia z dostawą w Boden? Nordic Eatery serwuje polskie comfort food, maczankę, knyszę, chrupiące frytki i street food przygotowywany na świeżo. Zamów online z dostawą lub odbiorem osobistym.",
        orderOnline: "Zamów online",
        takeaway: "Odbiór w Boden",

        card1Title: "Szybka dostawa",
        card1Text: "Wygodna dostawa jedzenia dla zamówień online w Boden.",
        card2Title: "Zamów online",
        card2Text: "Wybierz ulubione dania z naszego menu online.",
        card3Title: "Świeże jedzenie",
        card3Text: "Maczanka, knysza, frytki, polskie comfort food i street food.",
        card4Title: "Także odbiór",
        card4Text: "Wolisz odebrać sam? Zamów takeaway i odbierz jedzenie.",

        sectionEyebrow: "Zamów jedzenie online",
        sectionTitle: "Świeże jedzenie z dostawą w Boden",
        paragraph1:
            "Nordic Eatery to lokalny koncept gastronomiczny w Boden skupiony na prawdziwym jedzeniu, szybkiej obsłudze i prostym zamawianiu online. Nasze menu dobrze sprawdza się zarówno w dostawie, jak i przy odbiorze osobistym.",
        paragraph2:
            "Jeśli szukasz dostawy jedzenia w Boden, takeaway w pobliżu, chrupiących frytek albo polskiego street foodu, Nordic Eatery daje prosty sposób zamawiania bez konieczności dzwonienia.",
        paragraph3:
            "Przygotowujemy zamówienia możliwie szybko, dbając o świeżość i jakość jedzenia. Czas dostawy może się różnić w zależności od pory dnia, wielkości zamówienia i adresu dostawy.",

        viewMenu: "Zobacz menu",
        polishFood: "Polskie jedzenie w Boden",
        catering: "Catering",

        whyTitle: "Dlaczego warto zamówić z Nordic Eatery?",
        benefits: [
            "Dostawa jedzenia w Boden",
            "Świeżo przygotowywane dania",
            "Polskie comfort food i street food",
            "Maczanka, knysza, frytki i napoje",
            "Zamówienia online z dostawą lub odbiorem",
            "Dobry wybór na lunch, kolację lub szybki posiłek",
        ],

        faqEyebrow: "FAQ",
        faqTitle: "Pytania o dostawę jedzenia",
        faq: [
            {
                q: "Czy dostarczacie jedzenie w Boden?",
                a: "Tak. Nordic Eatery oferuje zamówienia online z dostawą w Boden oraz opcją odbioru osobistego.",
            },
            {
                q: "Ile trwa dostawa?",
                a: "Czas dostawy może się różnić w zależności od liczby zamówień, wielkości zamówienia i adresu dostawy.",
            },
            {
                q: "Czy mogę zamówić takeaway?",
                a: "Tak. Możesz zamówić online i wybrać odbiór osobisty.",
            },
            {
                q: "Jakie jedzenie mogę zamówić?",
                a: "Możesz zamówić maczankę, knyszę, chrupiące frytki, polskie comfort food, street food, napoje i wybrane pozycje z menu.",
            },
        ],
    },

    ru: {
        metadataTitle: "Доставка еды в Будене | Заказать онлайн | Nordic Eatery",
        metadataDescription:
            "Закажите польскую comfort food, мацанку, кнышу, хрустящий картофель фри и street food в Будене. Доставка и самовывоз от Nordic Eatery.",
        ogTitle: "Доставка еды в Будене | Nordic Eatery",
        ogDescription:
            "Польская comfort food, мацанка, кныша, фри и street food с доставкой и самовывозом в Будене.",

        eyebrow: "Доставка еды в Будене",
        h1: "Быстрая доставка еды в Будене",
        intro:
            "Ищете свежую еду с доставкой в Будене? Nordic Eatery готовит польскую comfort food, мацанку, кнышу, хрустящий картофель фри и street food на заказ. Закажите онлайн с доставкой или самовывозом.",
        orderOnline: "Заказать онлайн",
        takeaway: "Самовывоз в Будене",

        card1Title: "Быстрая доставка",
        card1Text: "Удобная доставка еды для онлайн-заказов в Будене.",
        card2Title: "Заказ онлайн",
        card2Text: "Выберите любимые блюда из нашего онлайн-меню.",
        card3Title: "Свежая еда",
        card3Text: "Мацанка, кныша, фри, польская comfort food и street food.",
        card4Title: "Есть самовывоз",
        card4Text: "Хотите забрать сами? Оформите заказ на самовывоз.",

        sectionEyebrow: "Закажите еду онлайн",
        sectionTitle: "Свежая еда с доставкой в Будене",
        paragraph1:
            "Nordic Eatery — локальный фуд-концепт в Будене с фокусом на настоящую еду, быстрый сервис и простой онлайн-заказ. Наше меню хорошо подходит и для доставки, и для самовывоза.",
        paragraph2:
            "Если вы ищете доставку еды в Будене, takeaway рядом, хрустящий картофель фри или польский street food, Nordic Eatery даёт простой способ заказать онлайн без звонков.",
        paragraph3:
            "Мы готовим заказы максимально быстро, сохраняя свежесть и качество еды. Время доставки может отличаться в зависимости от времени дня, размера заказа и адреса доставки.",

        viewMenu: "Посмотреть меню",
        polishFood: "Польская еда в Будене",
        catering: "Кейтеринг",

        whyTitle: "Почему стоит заказать в Nordic Eatery?",
        benefits: [
            "Доставка еды в Будене",
            "Свежеприготовленные блюда",
            "Польская comfort food и street food",
            "Мацанка, кныша, фри и напитки",
            "Онлайн-заказ с доставкой или самовывозом",
            "Хороший вариант для обеда, ужина или быстрого перекуса",
        ],

        faqEyebrow: "FAQ",
        faqTitle: "Вопросы о доставке еды",
        faq: [
            {
                q: "Вы доставляете еду в Будене?",
                a: "Да. Nordic Eatery предлагает онлайн-заказы с доставкой в Будене и возможностью самовывоза.",
            },
            {
                q: "Сколько занимает доставка?",
                a: "Время доставки может отличаться в зависимости от загруженности, размера заказа и адреса доставки.",
            },
            {
                q: "Можно заказать самовывоз?",
                a: "Да. Вы можете заказать онлайн и выбрать самовывоз.",
            },
            {
                q: "Какую еду можно заказать?",
                a: "Вы можете заказать мацанку, кнышу, хрустящий картофель фри, польскую comfort food, street food, напитки и избранные позиции меню.",
            },
        ],
    },
} as const;

function isSupportedLocale(locale: string): locale is Locale {
    return locales.includes(locale as Locale);
}

function getSafeLocale(locale: string): Locale {
    return isSupportedLocale(locale) ? locale : "sv";
}

function getPageContent(locale: string) {
    return content[getSafeLocale(locale)];
}

function buildDeliveryUrl(locale: Locale) {
    return `${baseUrl}/${locale}/delivery-boden`;
}

function buildLanguageAlternates() {
    return {
        sv: buildDeliveryUrl("sv"),
        en: buildDeliveryUrl("en"),
        pl: buildDeliveryUrl("pl"),
        ru: buildDeliveryUrl("ru"),
        "x-default": buildDeliveryUrl("sv"),
    };
}

export async function generateMetadata({
                                           params,
                                       }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const currentLocale = getSafeLocale(locale);
    const page = getPageContent(currentLocale);
    const canonical = buildDeliveryUrl(currentLocale);

    return {
        title: page.metadataTitle,
        description: page.metadataDescription,

        alternates: {
            canonical,
            languages: buildLanguageAlternates(),
        },

        openGraph: {
            title: page.ogTitle,
            description: page.ogDescription,
            url: canonical,
            siteName: "Nordic Eatery",
            locale: ogLocales[currentLocale],
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

        twitter: {
            card: "summary_large_image",
            title: page.ogTitle,
            description: page.ogDescription,
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

export default async function DeliveryBodenPage({ params }: PageProps) {
    const { locale } = await params;
    const currentLocale = getSafeLocale(locale);
    const page = getPageContent(currentLocale);

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

    const { data: siteContent } = await supabase
        .from("site_content")
        .select("key,value")
        .eq("locale", currentLocale)
        .eq("page", "delivery-boden");

    const editableContent = new Map(
        (siteContent || []).map((item) => [item.key, item.value])
    );

    function text(key: string, fallback: string) {
        return editableContent.get(key) || fallback;
    }

    const menuUrl = `/${currentLocale}/menu`;
    const takeawayUrl = `/${currentLocale}/takeaway-boden`;
    const polishFoodUrl = `/${currentLocale}/polish-food-boden`;
    const cateringUrl = `/${currentLocale}/catering-boden`;

    const benefits = page.benefits.map((item, index) => ({
        key: `deliveryBoden.benefits.${index}`,
        value: text(`deliveryBoden.benefits.${index}`, item),
    }));

    const faqItems = page.faq.map((item, index) => ({
        qKey: `deliveryBoden.faq.${index}.q`,
        aKey: `deliveryBoden.faq.${index}.a`,
        q: text(`deliveryBoden.faq.${index}.q`, item.q),
        a: text(`deliveryBoden.faq.${index}.a`, item.a),
    }));

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
            },
        })),
    };

    const cards = [
        {
            icon: Clock,
            titleKey: "deliveryBoden.card1Title",
            textKey: "deliveryBoden.card1Text",
            title: text("deliveryBoden.card1Title", page.card1Title),
            description: text("deliveryBoden.card1Text", page.card1Text),
        },
        {
            icon: ShoppingBag,
            titleKey: "deliveryBoden.card2Title",
            textKey: "deliveryBoden.card2Text",
            title: text("deliveryBoden.card2Title", page.card2Title),
            description: text("deliveryBoden.card2Text", page.card2Text),
        },
        {
            icon: Star,
            titleKey: "deliveryBoden.card3Title",
            textKey: "deliveryBoden.card3Text",
            title: text("deliveryBoden.card3Title", page.card3Title),
            description: text("deliveryBoden.card3Text", page.card3Text),
        },
        {
            icon: CheckCircle2,
            titleKey: "deliveryBoden.card4Title",
            textKey: "deliveryBoden.card4Text",
            title: text("deliveryBoden.card4Title", page.card4Title),
            description: text("deliveryBoden.card4Text", page.card4Text),
        },
    ];

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

                            <EditableText
                                value={text("deliveryBoden.eyebrow", page.eyebrow)}
                                textKey="deliveryBoden.eyebrow"
                                locale={currentLocale}
                                page="delivery-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </div>

                        <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#25120F] sm:text-6xl">
                            <EditableText
                                value={text("deliveryBoden.h1", page.h1)}
                                textKey="deliveryBoden.h1"
                                locale={currentLocale}
                                page="delivery-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[#7B6A61]">
                            <EditableText
                                value={text("deliveryBoden.intro", page.intro)}
                                textKey="deliveryBoden.intro"
                                locale={currentLocale}
                                page="delivery-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link href={menuUrl} className="btn-primary gap-2">
                                <EditableText
                                    value={text("deliveryBoden.orderOnline", page.orderOnline)}
                                    textKey="deliveryBoden.orderOnline"
                                    locale={currentLocale}
                                    page="delivery-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />

                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <Link href={takeawayUrl} className="btn-secondary">
                                <EditableText
                                    value={text("deliveryBoden.takeaway", page.takeaway)}
                                    textKey="deliveryBoden.takeaway"
                                    locale={currentLocale}
                                    page="delivery-boden"
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
                                        value={card.title}
                                        textKey={card.titleKey}
                                        locale={currentLocale}
                                        page="delivery-boden"
                                        canEdit={isOwner}
                                        as="span"
                                    />
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-dark/60">
                                    <EditableText
                                        value={card.description}
                                        textKey={card.textKey}
                                        locale={currentLocale}
                                        page="delivery-boden"
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
                                value={text("deliveryBoden.sectionEyebrow", page.sectionEyebrow)}
                                textKey="deliveryBoden.sectionEyebrow"
                                locale={currentLocale}
                                page="delivery-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </p>

                        <h2 className="section-title mt-3">
                            <EditableText
                                value={text("deliveryBoden.sectionTitle", page.sectionTitle)}
                                textKey="deliveryBoden.sectionTitle"
                                locale={currentLocale}
                                page="delivery-boden"
                                canEdit={isOwner}
                                as="span"
                            />
                        </h2>

                        <div className="mt-6 space-y-5 text-base leading-8 text-dark/65">
                            <p>
                                <EditableText
                                    value={text("deliveryBoden.paragraph1", page.paragraph1)}
                                    textKey="deliveryBoden.paragraph1"
                                    locale={currentLocale}
                                    page="delivery-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </p>

                            <p>
                                <EditableText
                                    value={text("deliveryBoden.paragraph2", page.paragraph2)}
                                    textKey="deliveryBoden.paragraph2"
                                    locale={currentLocale}
                                    page="delivery-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </p>

                            <p>
                                <EditableText
                                    value={text("deliveryBoden.paragraph3", page.paragraph3)}
                                    textKey="deliveryBoden.paragraph3"
                                    locale={currentLocale}
                                    page="delivery-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </p>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href={menuUrl} className="btn-primary">
                                <EditableText
                                    value={text("deliveryBoden.viewMenu", page.viewMenu)}
                                    textKey="deliveryBoden.viewMenu"
                                    locale={currentLocale}
                                    page="delivery-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </Link>

                            <Link href={polishFoodUrl} className="btn-secondary">
                                <EditableText
                                    value={text("deliveryBoden.burgers", page.polishFood)}
                                    textKey="deliveryBoden.burgers"
                                    locale={currentLocale}
                                    page="delivery-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </Link>

                            <Link href={cateringUrl} className="btn-secondary">
                                <EditableText
                                    value={text("deliveryBoden.catering", page.catering)}
                                    textKey="deliveryBoden.catering"
                                    locale={currentLocale}
                                    page="delivery-boden"
                                    canEdit={isOwner}
                                    as="span"
                                />
                            </Link>
                        </div>
                    </div>

                    <aside className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-6 shadow-xl shadow-[#4C2314]/8">
                        <h2 className="text-2xl font-black tracking-[-0.04em] text-dark">
                            <EditableText
                                value={text("deliveryBoden.whyTitle", page.whyTitle)}
                                textKey="deliveryBoden.whyTitle"
                                locale={currentLocale}
                                page="delivery-boden"
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
                                        value={item.value}
                                        textKey={item.key}
                                        locale={currentLocale}
                                        page="delivery-boden"
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
                            value={text("deliveryBoden.faqEyebrow", page.faqEyebrow)}
                            textKey="deliveryBoden.faqEyebrow"
                            locale={currentLocale}
                            page="delivery-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </p>

                    <h2 className="section-title mt-3">
                        <EditableText
                            value={text("deliveryBoden.faqTitle", page.faqTitle)}
                            textKey="deliveryBoden.faqTitle"
                            locale={currentLocale}
                            page="delivery-boden"
                            canEdit={isOwner}
                            as="span"
                        />
                    </h2>

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                        {faqItems.map((item) => (
                            <div key={item.qKey} className="glass-card p-5">
                                <h3 className="text-lg font-black text-dark">
                                    <EditableText
                                        value={item.q}
                                        textKey={item.qKey}
                                        locale={currentLocale}
                                        page="delivery-boden"
                                        canEdit={isOwner}
                                        as="span"
                                    />
                                </h3>

                                <p className="mt-3 text-sm leading-6 text-dark/60">
                                    <EditableText
                                        value={item.a}
                                        textKey={item.aKey}
                                        locale={currentLocale}
                                        page="delivery-boden"
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
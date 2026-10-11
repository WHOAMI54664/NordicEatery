import { getPublicPath } from "@/i18n/paths";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  BriefcaseBusiness,
  Utensils,
  CalendarDays,
} from "lucide-react";
import { EditableText } from "@/components/EditableText";
import { createClient } from "@/lib/supabase/server";
import { TakeawayPhotoSlider } from "@/components/TakeawayPhotoSlider";

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
    metadataTitle: "Beställ takeaway | Nordic Eatery",
    metadataDescription:
      "Beställ street food online och hämta din mat från Nordic Eaterys foodtruck. Aktuell plats, meny och öppettider visas vid beställning.",
    ogTitle: "Beställ takeaway | Nordic Eatery",
    ogDescription:
      "Beställ street food online och hämta din mat från Nordic Eaterys foodtruck. Aktuell plats, meny och öppettider visas vid beställning.",
    h1: "Beställ takeaway under särskilda öppettider",
    intro:
      "Nordic Street Fusion – Mer än bara snabbmat.\n\nUpptäck street food där nordiska smaker möter inspiration från hela världen. Beställ enkelt online och hämta nylagad mat direkt från vår foodtruck.\n\nVi rör oss runt i Norrbotten – aktuell plats, meny och öppettider hittar du alltid vid beställning.",
    orderOnline: "Beställ matlådor",
    contact: "Kontakta oss",
    card1Title: "Varierade menyer",
    card1Text: "Från traditionell husmanskost till internationella favoriter.",
    card2Title: "För privatpersoner & företag",
    card2Text: "Matlådor för både enskilda beställningar och större grupper.",
    card3Title: "Vällagad mat",
    card3Text: "Goda och mättande måltider tillagade med omsorg.",
    card4Title: "Flexibla beställningar",
    card4Text:
      "Vi hjälper dig att planera måltider efter dina behov och önskemål.",
    sectionTitle: "Din smakupplevelse börjar här",
    paragraph1:
      "Sugen på något riktigt gott? Hos Nordic Eatery hittar du street food med spännande smakkombinationer, inspirerade av både nordiska och internationella kök.",
    paragraph2:
      "Beställ enkelt online, välj dina favoriter från vår meny och hämta din nylagade mat direkt från vår foodtruck.",
    paragraph3:
      "Vi tillagar varje beställning med omsorg och fokus på smak och kvalitet. Tillagningstiden kan variera beroende på beställningens storlek och hur många som står i kö. Local Soul. Global Taste.",
    viewMenu: "Se meny",
    polishFood: "Streetfood i Norrbotten",
    catering: "Catering",
    whyTitle: "Varför beställa från Nordic Eatery?",
    benefits: [
      "Upphämtning från vår foodtruck",
      "Färskt tillagade rätter",
      "Polsk comfort food och street food",
      "Maczanka, knysza, pommes och drycker",
      "Beställ enkelt online",
      "Bra val för lunch, middag eller enkel vardagsmat",
    ],
    faqTitle: "Vanliga frågor om take away",
    faq: [
      {
        q: "Var hämtar jag min beställning?",
        a: "Hämta maten från vår foodtruck. Aktuell plats och öppettider visas vid beställning.",
      },
      {
        q: "Hur lång tid tar det att laga maten?",
        a: "Vi tillagar varje beställning med omsorg. Tillagningstiden varierar beroende på efterfrågan och beställningens storlek.",
      },
      {
        q: "När kan jag beställa?",
        a: "Du kan beställa när köket är öppet. Aktuella öppettider visas på webbplatsen.",
      },
      {
        q: "Vilken mat kan jag beställa?",
        a: "Du kan beställa maczanka, knysza, krispiga pommes, polsk comfort food, street food, drycker och utvalda menyfavoriter.",
      },
    ],
  },
  en: {
    metadataTitle: "Order takeaway | Nordic Eatery",
    metadataDescription:
      "Order street food online for collection from Nordic Eatery’s food truck. Check the current location, menu and opening hours when ordering.",
    ogTitle: "Order takeaway | Nordic Eatery",
    ogDescription:
      "Order street food online for collection from Nordic Eatery’s food truck. Check the current location, menu and opening hours when ordering.",
    h1: "Order takeaway during our opening hours",
    intro:
      "Order street food online and collect freshly prepared food from our food truck. Check the current location and opening hours when ordering.",
    orderOnline: "Order lunch boxes",
    contact: "Contact us",
    card1Title: "Varied menus",
    card1Text: "From traditional home cooking to international favourites.",
    card2Title: "For individuals & businesses",
    card2Text: "Lunch boxes for individual orders and larger groups.",
    card3Title: "Carefully prepared food",
    card3Text: "Delicious, satisfying meals prepared with care.",
    card4Title: "Flexible orders",
    card4Text: "We help you plan meals around your needs and preferences.",
    sectionTitle: "Your food experience starts here",
    paragraph1:
      "Nordic Eatery combines Nordic flavours with inspiration from around the world. Explore our street food and choose your favourites.",
    paragraph2:
      "Order easily online and collect freshly prepared food directly from our food truck.",
    paragraph3:
      "We prepare every order with care. Preparation time varies depending on demand and order size.",
    viewMenu: "View menu",
    polishFood: "Street food in Norrbotten",
    catering: "Catering",
    whyTitle: "Why order from Nordic Eatery?",
    benefits: [
      "Pickup from our food truck",
      "Freshly prepared dishes",
      "Polish comfort food and street food",
      "Maczanka, knysza, fries and drinks",
      "Easy online ordering",
      "Good option for lunch, dinner or casual meals",
    ],
    faqTitle: "Takeaway questions",
    faq: [
      {
        q: "Where do I collect my order?",
        a: "Collect your food from our food truck. Check the current location and opening hours when ordering.",
      },
      {
        q: "How long does preparation take?",
        a: "We prepare every order with care. Preparation time varies depending on demand and order size.",
      },
      {
        q: "When can I order?",
        a: "You can order while the kitchen is open. Check the website for current opening hours.",
      },
      {
        q: "What food can I order?",
        a: "You can order maczanka, knysza, crispy fries, Polish comfort food, street food, drinks and selected menu specials.",
      },
    ],
  },
  pl: {
    metadataTitle: "Zamów na wynos | Nordic Eatery",
    metadataDescription:
      "Zamów street food online i odbierz jedzenie z food trucka Nordic Eatery. Sprawdź aktualną lokalizację, menu i godziny otwarcia przy zamawianiu.",
    ogTitle: "Zamów na wynos | Nordic Eatery",
    ogDescription:
      "Zamów street food online i odbierz jedzenie z food trucka Nordic Eatery. Sprawdź aktualną lokalizację, menu i godziny otwarcia przy zamawianiu.",
    h1: "Zamów na wynos w godzinach otwarcia",
    intro:
      "Zamów street food online i odbierz świeżo przygotowane jedzenie z naszego food trucka. Aktualne miejsce i godziny otwarcia są podane przy zamawianiu.",
    orderOnline: "Zamów lunchboxy",
    contact: "Skontaktuj się",
    card1Title: "Różnorodne menu",
    card1Text: "Od tradycyjnych domowych potraw po międzynarodowe przysmaki.",
    card2Title: "Dla osób prywatnych i firm",
    card2Text: "Lunchboxy na indywidualne zamówienia i dla większych grup.",
    card3Title: "Starannie przygotowane jedzenie",
    card3Text: "Smaczne i sycące posiłki przygotowane z troską.",
    card4Title: "Elastyczne zamówienia",
    card4Text:
      "Pomagamy zaplanować posiłki zgodnie z Twoimi potrzebami i preferencjami.",
    sectionTitle: "Twoja kulinarna przygoda zaczyna się tutaj",
    paragraph1:
      "Nordic Eatery łączy nordyckie smaki z inspiracjami z całego świata. Poznaj nasz street food i wybierz ulubione dania.",
    paragraph2:
      "Zamów wygodnie online i odbierz świeżo przygotowane jedzenie z naszego food trucka.",
    paragraph3:
      "Każde zamówienie przygotowujemy z troską o jakość. Czas przygotowania zależy od liczby i wielkości zamówień.",
    viewMenu: "Zobacz menu",
    polishFood: "Street food w Norrbotten",
    catering: "Catering",
    whyTitle: "Dlaczego warto zamówić z Nordic Eatery?",
    benefits: [
      "Odbiór z naszego food trucka",
      "Świeżo przygotowywane dania",
      "Polskie comfort food i street food",
      "Maczanka, knysza, frytki i napoje",
      "Proste zamawianie online",
      "Dobry wybór na lunch, kolację lub szybki posiłek",
    ],
    faqTitle: "Pytania o jedzenie na wynos",
    faq: [
      {
        q: "Gdzie odebrać zamówienie?",
        a: "Odbierz jedzenie z naszego food trucka. Aktualne miejsce i godziny otwarcia są podane przy zamawianiu.",
      },
      {
        q: "Ile trwa przygotowanie?",
        a: "Każde zamówienie przygotowujemy z troską o jakość. Czas przygotowania zależy od liczby i wielkości zamówień.",
      },
      {
        q: "Kiedy mogę zamówić?",
        a: "Możesz zamawiać, gdy kuchnia jest otwarta. Aktualne godziny znajdziesz na stronie.",
      },
      {
        q: "Jakie jedzenie mogę zamówić?",
        a: "Możesz zamówić maczankę, knyszę, chrupiące frytki, polskie comfort food, street food, napoje i wybrane pozycje z menu.",
      },
    ],
  },
  ru: {
    metadataTitle: "Заказать еду навынос | Nordic Eatery",
    metadataDescription:
      "Закажите стритфуд онлайн и заберите еду из фудтрака Nordic Eatery. Актуальные место, меню и часы работы доступны при оформлении заказа.",
    ogTitle: "Заказать еду навынос | Nordic Eatery",
    ogDescription:
      "Закажите стритфуд онлайн и заберите еду из фудтрака Nordic Eatery. Актуальные место, меню и часы работы доступны при оформлении заказа.",
    h1: "Заказать еду навынос в часы работы",
    intro:
      "Закажите стритфуд онлайн и заберите свежеприготовленную еду из нашего фудтрака. Актуальные место и часы работы указаны при оформлении заказа.",
    orderOnline: "Заказать обеды",
    contact: "Связаться с нами",
    card1Title: "Разнообразное меню",
    card1Text: "От традиционной домашней кухни до любимых блюд разных стран.",
    card2Title: "Для частных клиентов и компаний",
    card2Text: "Ланч-боксы для индивидуальных заказов и больших групп.",
    card3Title: "Еда, приготовленная с заботой",
    card3Text: "Вкусные и сытные блюда, приготовленные с вниманием к деталям.",
    card4Title: "Гибкие заказы",
    card4Text:
      "Поможем спланировать питание с учётом ваших потребностей и пожеланий.",
    sectionTitle: "Откройте для себя новые вкусы",
    paragraph1:
      "Nordic Eatery сочетает северные вкусы с вдохновением со всего мира. Откройте для себя наш стритфуд и выберите любимые блюда.",
    paragraph2:
      "Закажите онлайн и заберите свежеприготовленную еду прямо из нашего фудтрака.",
    paragraph3:
      "Мы готовим каждый заказ с заботой о качестве. Время приготовления зависит от загруженности и размера заказа.",
    viewMenu: "Посмотреть меню",
    polishFood: "Стритфуд в Норрботтене",
    catering: "Кейтеринг",
    whyTitle: "Почему стоит заказать в Nordic Eatery?",
    benefits: [
      "Самовывоз из нашего фудтрака",
      "Свежеприготовленные блюда",
      "Польская comfort food и street food",
      "Мацанка, кныша, фри и напитки",
      "Простой онлайн-заказ",
      "Хороший вариант для обеда, ужина или быстрого перекуса",
    ],
    faqTitle: "Вопросы о самовывозе",
    faq: [
      {
        q: "Где забрать заказ?",
        a: "Заберите еду из нашего фудтрака. Актуальные место и часы работы указаны при оформлении заказа.",
      },
      {
        q: "Сколько занимает приготовление?",
        a: "Мы готовим каждый заказ с заботой о качестве. Время приготовления зависит от загруженности и размера заказа.",
      },
      {
        q: "Когда можно заказать?",
        a: "Оформить заказ можно, когда кухня открыта. Актуальные часы работы указаны на сайте.",
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

function buildTakeawayUrl(locale: Locale) {
  return `${baseUrl}/${locale}/bestall-takeaway`;
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
  const page = getPageContent(currentLocale);
  const canonical = buildTakeawayUrl(currentLocale);

  return {
    title: { absolute: page.metadataTitle },
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

export default async function OrderTakeawayPage({ params }: PageProps) {
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

  // Keep the CMS namespace so existing edits survive the public URL rename.
  const { data: siteContent } = await supabase
    .from("site_content")
    .select("key,value")
    .eq("locale", currentLocale)
    .eq("page", "delivery-boden");

  const editableContent = new Map(
    (siteContent || []).map((item) => [item.key, item.value]),
  );

  function text(key: string, fallback: string) {
    return editableContent.get(key) || fallback;
  }

  const bookingUrl = getPublicPath(currentLocale, "/booking");
  const contactUrl = getPublicPath(currentLocale, "/contact");
  const streetfoodUrl = `/${currentLocale}/streetfood-i-norrbotten`;
  const cateringUrl = `/${currentLocale}/catering`;

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
      icon: ChefHat,
      titleKey: "deliveryBoden.card1Title",
      textKey: "deliveryBoden.card1Text",
      title: text("deliveryBoden.card1Title", page.card1Title),
      description: text("deliveryBoden.card1Text", page.card1Text),
    },
    {
      icon: BriefcaseBusiness,
      titleKey: "deliveryBoden.card2Title",
      textKey: "deliveryBoden.card2Text",
      title: text("deliveryBoden.card2Title", page.card2Title),
      description: text("deliveryBoden.card2Text", page.card2Text),
    },
    {
      icon: Utensils,
      titleKey: "deliveryBoden.card3Title",
      textKey: "deliveryBoden.card3Text",
      title: text("deliveryBoden.card3Title", page.card3Title),
      description: text("deliveryBoden.card3Text", page.card3Text),
    },
    {
      icon: CalendarDays,
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

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <div className="min-w-0">
              <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#25120F] sm:text-6xl">
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
                <Link href={bookingUrl} className="btn-primary gap-2">
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
                <Link href={contactUrl} className="btn-secondary">
                  <EditableText
                    value={text("deliveryBoden.takeaway", page.contact)}
                    textKey="deliveryBoden.takeaway"
                    locale={currentLocale}
                    page="delivery-boden"
                    canEdit={isOwner}
                    as="span"
                  />
                </Link>
              </div>
            </div>
            <TakeawayPhotoSlider />
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
            <h2 className="section-title">
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
              <Link href={bookingUrl} className="btn-primary">
                <EditableText
                  value={text("deliveryBoden.viewMenu", page.orderOnline)}
                  textKey="deliveryBoden.viewMenu"
                  locale={currentLocale}
                  page="delivery-boden"
                  canEdit={isOwner}
                  as="span"
                />
              </Link>

              <Link href={streetfoodUrl} className="btn-secondary">
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
          <h2 className="section-title">
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

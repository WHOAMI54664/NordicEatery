import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EditableText } from "@/components/EditableText";
import { createClient } from "@/lib/supabase/server";

export default async function CateringPage({
                                             params,
                                           }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

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

    isOwner = profile?.role === "owner";
  }

  const t = await getTranslations("pages.catering");

  const { data: siteContent } = await supabase
      .from("site_content")
      .select("key,value")
      .eq("locale", locale)
      .eq("page", "catering");

  const content = new Map(
      (siteContent || []).map((item) => [item.key, item.value])
  );

  function text(key: string, fallbackKey: string) {
    return content.get(key) || t(fallbackKey);
  }

  const cards = [
    {
      titleKey: "catering.smallTitle",
      textKey: "catering.smallText",
      titleFallback: "smallTitle",
      textFallback: "smallText",
    },
    {
      titleKey: "catering.companyTitle",
      textKey: "catering.companyText",
      titleFallback: "companyTitle",
      textFallback: "companyText",
    },
    {
      titleKey: "catering.largeTitle",
      textKey: "catering.largeText",
      titleFallback: "largeTitle",
      textFallback: "largeText",
    },
  ];

  const provideItems = [
    {
      key: "catering.provideCustomMenu",
      fallback: "provideCustomMenu",
    },
    {
      key: "catering.provideGroups",
      fallback: "provideGroups",
    },
    {
      key: "catering.providePickup",
      fallback: "providePickup",
    },
    {
      key: "catering.provideFoodTruck",
      fallback: "provideFoodTruck",
    },
    {
      key: "catering.providePlanning",
      fallback: "providePlanning",
    },
    {
      key: "catering.provideFastCommunication",
      fallback: "provideFastCommunication",
    },
  ];

  return (
      <main className="min-h-screen px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <section className="text-center">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
              <EditableText
                  value={text("catering.title", "title")}
                  textKey="catering.title"
                  locale={locale}
                  page="catering"
                  canEdit={isOwner}
                  as="h1"
                  className="text-5xl font-black text-dark"
              />

              <EditableText
                  value={text("catering.subtitle", "subtitle")}
                  textKey="catering.subtitle"
                  locale={locale}
                  page="catering"
                  canEdit={isOwner}
                  as="p"
                  className="max-w-2xl text-lg leading-8 text-dark/60"
              />
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <Link href={`/${locale}/booking`} className="btn-primary">
                {text("catering.button", "button")}
              </Link>

              <Link href={`/${locale}/contact`} className="btn-secondary">
                {text("catering.contactButton", "contactButton")}
              </Link>
            </div>
          </section>

          <section className="mt-16 grid gap-6 md:grid-cols-3">
            {cards.map((item) => (
                <div
                    key={item.titleKey}
                    className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur"
                >
                  <EditableText
                      value={text(item.titleKey, item.titleFallback)}
                      textKey={item.titleKey}
                      locale={locale}
                      page="catering"
                      canEdit={isOwner}
                      as="h3"
                      className="text-xl font-black text-dark"
                  />

                  <EditableText
                      value={text(item.textKey, item.textFallback)}
                      textKey={item.textKey}
                      locale={locale}
                      page="catering"
                      canEdit={isOwner}
                      as="p"
                      className="mt-3 text-sm leading-6 text-dark/60"
                  />
                </div>
            ))}
          </section>

          <section className="mt-16 rounded-[2rem] bg-white/80 p-8 shadow-xl backdrop-blur">
            <EditableText
                value={text("catering.provideTitle", "provideTitle")}
                textKey="catering.provideTitle"
                locale={locale}
                page="catering"
                canEdit={isOwner}
                as="h2"
                className="text-3xl font-black text-dark"
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {provideItems.map((item) => (
                  <div
                      key={item.key}
                      className="rounded-2xl bg-cream/70 px-5 py-4 text-sm font-bold text-dark/70"
                  >
                    <EditableText
                        value={text(item.key, item.fallback)}
                        textKey={item.key}
                        locale={locale}
                        page="catering"
                        canEdit={isOwner}
                        as="span"
                    />
                  </div>
              ))}
            </div>
          </section>

          <section className="mt-16 rounded-[2rem] bg-gradient-to-r from-paprika to-orange-400 p-10 text-center text-white shadow-xl">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
              <EditableText
                  value={text("catering.ctaTitle", "ctaTitle")}
                  textKey="catering.ctaTitle"
                  locale={locale}
                  page="catering"
                  canEdit={isOwner}
                  as="h2"
                  className="text-3xl font-black"
              />

              <EditableText
                  value={text("catering.ctaText", "ctaText")}
                  textKey="catering.ctaText"
                  locale={locale}
                  page="catering"
                  canEdit={isOwner}
                  as="p"
                  className="max-w-2xl text-white/90"
              />

              <Link
                  href={`/${locale}/booking`}
                  className="btn-secondary mt-4 inline-flex"
              >
                {text("catering.ctaButton", "ctaButton")}
              </Link>
            </div>
          </section>
        </div>
      </main>
  );
}
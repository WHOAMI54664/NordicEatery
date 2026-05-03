import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EditableText } from "@/components/EditableText";
import { createClient } from "@/lib/supabase/server";
import { EditableImage } from "@/components/EditableImage";

export default async function MikesPage({
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

  const t = await getTranslations("pages.mikes");

  const { data: siteContent } = await supabase
      .from("site_content")
      .select("key,value")
      .eq("locale", locale)
      .eq("page", "mikes");

  const content = new Map(
      (siteContent || []).map((item) => [item.key, item.value])
  );

  function text(key: string, fallbackKey: string) {
    return content.get(key) || t(fallbackKey);
  }

  const cards = [
    {
      titleKey: "mikes.privateTitle",
      textKey: "mikes.privateText",
      titleFallback: "privateTitle",
      textFallback: "privateText",
    },
    {
      titleKey: "mikes.businessTitle",
      textKey: "mikes.businessText",
      titleFallback: "businessTitle",
      textFallback: "businessText",
    },
    {
      titleKey: "mikes.festivalsTitle",
      textKey: "mikes.festivalsText",
      titleFallback: "festivalsTitle",
      textFallback: "festivalsText",
    },
  ];

  return (
      <main className="min-h-screen px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <section className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <EditableText
                  value={text("mikes.title", "title")}
                  textKey="mikes.title"
                  locale={locale}
                  page="mikes"
                  canEdit={isOwner}
                  as="h1"
                  className="mt-1 text-5xl font-black text-dark"
              />

              <EditableText
                  value={text("mikes.subtitle", "subtitle")}
                  textKey="mikes.subtitle"
                  locale={locale}
                  page="mikes"
                  canEdit={isOwner}
                  as="p"
                  className="mt-6 text-lg leading-8 text-dark/60"
              />

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/${locale}/booking`} className="btn-primary">
                  {text("mikes.button", "button")}
                </Link>

                <Link href={`/${locale}/contact`} className="btn-secondary">
                  {text("mikes.contact", "contact")}
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] bg-white/70 p-3 shadow-xl backdrop-blur">
              <EditableImage
                  src={text("mikes.hero.image", "heroImage")}
                  alt="Mike's Food Truck"
                  imageKey="mikes.hero.image"
                  locale={locale}
                  page="mikes"
                  canEdit={isOwner}
                  width={900}
                  height={650}
                  priority
                  className="relative"
                  imageClassName="h-[420px] w-full rounded-[1.5rem] object-cover"
              />
            </div>
          </section>

          <section className="mt-20 grid gap-6 md:grid-cols-3">
            {cards.map((item) => (
                <div
                    key={item.titleKey}
                    className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur"
                >
                  <EditableText
                      value={text(item.titleKey, item.titleFallback)}
                      textKey={item.titleKey}
                      locale={locale}
                      page="mikes"
                      canEdit={isOwner}
                      as="h3"
                      className="text-xl font-black text-dark"
                  />

                  <EditableText
                      value={text(item.textKey, item.textFallback)}
                      textKey={item.textKey}
                      locale={locale}
                      page="mikes"
                      canEdit={isOwner}
                      as="p"
                      className="mt-3 text-sm leading-6 text-dark/60"
                  />
                </div>
            ))}
          </section>

          <section className="mt-16 rounded-[2rem] bg-gradient-to-r from-paprika to-orange-400 p-10 text-center text-white shadow-xl">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
              <EditableText
                  value={text("mikes.ctaTitle", "ctaTitle")}
                  textKey="mikes.ctaTitle"
                  locale={locale}
                  page="mikes"
                  canEdit={isOwner}
                  as="h2"
                  className="text-3xl font-black"
              />

              <EditableText
                  value={text("mikes.ctaText", "ctaText")}
                  textKey="mikes.ctaText"
                  locale={locale}
                  page="mikes"
                  canEdit={isOwner}
                  as="p"
                  className="max-w-2xl text-white/90"
              />

              <Link
                  href={`/${locale}/booking`}
                  className="btn-secondary mt-4 inline-flex"
              >
                {text("mikes.ctaButton", "ctaButton")}
              </Link>
            </div>
          </section>
        </div>
      </main>
  );
}

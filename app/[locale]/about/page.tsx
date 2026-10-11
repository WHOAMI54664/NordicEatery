import { publicPageMetadata } from "@/lib/public-page-metadata";
import { getPublicPath } from "@/i18n/paths";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Flame, Clock, Sparkles } from "lucide-react";
import { EditableText } from "@/components/EditableText";
import { EditableImage } from "@/components/EditableImage";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return publicPageMetadata(locale, "about");
}

export default async function AboutPage({
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

    isOwner = profile?.role === "owner" || profile?.role === "admin";
  }

  const t = await getTranslations("pages.about");

  const { data: siteContent } = await supabase
    .from("site_content")
    .select("key,value")
    .eq("locale", locale)
    .eq("page", "about");

  const content = new Map(
    (siteContent || []).map((item) => [item.key, item.value]),
  );

  function text(key: string, fallbackKey: string) {
    return content.get(key) || t(fallbackKey);
  }

  function image(key: string, fallbackSrc: string) {
    return content.get(key) || fallbackSrc;
  }

  const whoParagraphsFallback = t.raw("whoText.paragraphs") as string[];

  const whoParagraphs = whoParagraphsFallback.map((paragraph, index) => ({
    key: `about.whoText.paragraphs.${index}`,
    value: content.get(`about.whoText.paragraphs.${index}`) || paragraph,
  }));

  const featureCards = [
    {
      icon: Flame,
      titleKey: "about.freshTitle",
      textKey: "about.freshText",
      fallbackTitle: "freshTitle",
      fallbackText: "freshText",
    },
    {
      icon: Clock,
      titleKey: "about.fastTitle",
      textKey: "about.fastText",
      fallbackTitle: "fastTitle",
      fallbackText: "fastText",
    },
    {
      icon: Sparkles,
      titleKey: "about.tasteTitle",
      textKey: "about.tasteText",
      fallbackTitle: "tasteTitle",
      fallbackText: "tasteText",
    },
  ];

  const galleryImages = [
    {
      key: "about.gallery.fries1",
      fallback: "/images/about/fries1.jpg",
      alt: "Mike's Food",
    },
    {
      key: "about.gallery.fries2",
      fallback: "/images/about/fries2.jpg",
      alt: "Mike's Food",
    },
    {
      key: "about.gallery.fries3",
      fallback: "/images/about/fries3.jpg",
      alt: "Mike's Food",
    },
  ];

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <section className="grid min-h-[680px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h1 className="mt-2 max-w-xl text-5xl font-black leading-[1.05] tracking-[-0.05em] text-dark sm:text-6xl">
              <EditableText
                value={text("about.title", "title")}
                textKey="about.title"
                locale={locale}
                page="about"
                canEdit={isOwner}
                as="span"
              />
            </h1>

            <div className="mt-8 max-w-xl">
              <EditableText
                value={text("about.whoText.title", "whoText.title")}
                textKey="about.whoText.title"
                locale={locale}
                page="about"
                canEdit={isOwner}
                as="h3"
                className="text-2xl font-black tracking-[-0.03em] text-dark/70 sm:text-3xl"
              />

              <div className="mt-5 space-y-4 text-lg leading-8 text-dark/70">
                {whoParagraphs.map((paragraph) => (
                  <EditableText
                    key={paragraph.key}
                    value={paragraph.value}
                    textKey={paragraph.key}
                    locale={locale}
                    page="about"
                    canEdit={isOwner}
                    as="p"
                  />
                ))}
              </div>
            </div>

            <EditableText
              value={text("about.badge", "badge")}
              textKey="about.badge"
              locale={locale}
              page="about"
              canEdit={isOwner}
              as="p"
              className="mt-7 inline-flex rounded-full bg-paprika/10 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-paprika"
            />
          </div>

          <div className="relative h-[560px] overflow-hidden rounded-[2.75rem] shadow-2xl">
            <EditableImage
              src={image("about.heroImage", "/images/about/hero.jpg")}
              alt="Mike's Food"
              imageKey="about.heroImage"
              locale={locale}
              page="about"
              canEdit={isOwner}
              fill
              priority
              className="h-full w-full"
              imageClassName="object-cover transition duration-700 hover:scale-[1.03]"
              placeholderTitle="Add hero photo"
              placeholderDescription="Recommended: vertical or food truck image, 1200×1600 px."
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        </section>

        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {featureCards.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.titleKey} className="glass-card p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paprika/10 text-paprika">
                  <Icon size={22} />
                </div>

                <h3 className="mt-6 text-xl font-black text-dark">
                  <EditableText
                    value={text(item.titleKey, item.fallbackTitle)}
                    textKey={item.titleKey}
                    locale={locale}
                    page="about"
                    canEdit={isOwner}
                    as="span"
                  />
                </h3>

                <p className="mt-3 text-sm leading-6 text-dark/60">
                  <EditableText
                    value={text(item.textKey, item.fallbackText)}
                    textKey={item.textKey}
                    locale={locale}
                    page="about"
                    canEdit={isOwner}
                    as="span"
                  />
                </p>
              </div>
            );
          })}
        </section>

        <section className="mt-24 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative h-[520px] overflow-hidden rounded-[2.5rem] shadow-xl">
            <EditableImage
              src={image("about.foodImage", "/images/about/knysza.jpg")}
              alt="Knysza"
              imageKey="about.foodImage"
              locale={locale}
              page="about"
              canEdit={isOwner}
              fill
              className="h-full w-full"
              imageClassName="object-cover transition duration-700 hover:scale-[1.03]"
              placeholderTitle="Add food photo"
              placeholderDescription="Recommended: horizontal food photo, 1200×850 px."
            />
          </div>

          <div>
            <EditableText
              value={text("about.foodTitle", "foodTitle")}
              textKey="about.foodTitle"
              locale={locale}
              page="about"
              canEdit={isOwner}
              as="h2"
              className="text-4xl font-black tracking-[-0.04em] text-dark"
            />

            <EditableText
              value={text("about.foodText", "foodText")}
              textKey="about.foodText"
              locale={locale}
              page="about"
              canEdit={isOwner}
              as="p"
              className="mt-6 text-lg leading-8 text-dark/60"
            />
          </div>
        </section>

        <section className="mt-24 grid gap-5 md:grid-cols-3">
          {galleryImages.map((item) => (
            <div
              key={item.key}
              className="relative h-[360px] overflow-hidden rounded-[2rem] bg-white shadow-lg"
            >
              <EditableImage
                src={image(item.key, item.fallback)}
                alt={item.alt}
                imageKey={item.key}
                locale={locale}
                page="about"
                canEdit={isOwner}
                fill
                className="h-full w-full"
                imageClassName="object-cover transition duration-700 hover:scale-[1.04]"
                placeholderTitle="Add gallery photo"
                placeholderDescription="Recommended: food image, 1200×850 px."
              />
            </div>
          ))}
        </section>

        <section className="mt-24 overflow-hidden rounded-[2.75rem] bg-gradient-to-r from-paprika to-orange-400 shadow-xl">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div className="p-10 text-white sm:p-14">
              <EditableText
                value={text("about.ctaTitle", "ctaTitle")}
                textKey="about.ctaTitle"
                locale={locale}
                page="about"
                canEdit={isOwner}
                as="h2"
                className="max-w-2xl text-4xl font-black tracking-[-0.04em]"
              />

              <EditableText
                value={text("about.ctaText", "ctaText")}
                textKey="about.ctaText"
                locale={locale}
                page="about"
                canEdit={isOwner}
                as="p"
                className="mt-5 max-w-xl text-lg leading-8 text-white/90"
              />

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={getPublicPath(locale, "/booking")}
                  className="btn-secondary gap-2"
                >
                  <EditableText
                    value={text("about.ctaBook", "ctaBook")}
                    textKey="about.ctaBook"
                    locale={locale}
                    page="about"
                    canEdit={isOwner}
                    as="span"
                  />
                  <ArrowRight size={18} />
                </Link>

                <Link
                  href={getPublicPath(locale, "/contact")}
                  className="btn-secondary"
                >
                  <EditableText
                    value={text("about.ctaContact", "ctaContact")}
                    textKey="about.ctaContact"
                    locale={locale}
                    page="about"
                    canEdit={isOwner}
                    as="span"
                  />
                </Link>
              </div>
            </div>

            <div className="relative hidden h-[420px] lg:block">
              <EditableImage
                src={image("about.ctaImage", "/images/about/fries2.jpg")}
                alt="Event food"
                imageKey="about.ctaImage"
                locale={locale}
                page="about"
                canEdit={isOwner}
                fill
                className="h-full w-full"
                imageClassName="object-cover"
                placeholderTitle="Add event photo"
                placeholderDescription="Recommended: catering/event food photo, 1200×850 px."
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

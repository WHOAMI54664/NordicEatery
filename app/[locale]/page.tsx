import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { EditableText } from "@/components/EditableText";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function HomePage({
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

  const t = await getTranslations("pages.home");

  const { data: siteContent } = await supabase
      .from("site_content")
      .select("key,value")
      .eq("locale", locale)
      .eq("page", "home");

  const content = new Map(
      (siteContent || []).map((item) => [item.key, item.value])
  );

  function text(key: string, fallbackKey: string) {
    return content.get(key) || t(fallbackKey);
  }

  const { data: featuredItems } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .eq("is_popular", true)
      .or("track_stock.eq.false,stock_quantity.gt.0")
      .order("sort_order", { ascending: true })
      .limit(6);

  const categories = [
    {
      key: "home.categories.maczanka",
      fallbackKey: "categories.maczanka",
      name: text("home.categories.maczanka", "categories.maczanka"),
      emoji: "🥪",
    },
    {
      key: "home.categories.knysza",
      fallbackKey: "categories.knysza",
      name: text("home.categories.knysza", "categories.knysza"),
      emoji: "🌯",
    },
    {
      key: "home.categories.fries",
      fallbackKey: "categories.fries",
      name: text("home.categories.fries", "categories.fries"),
      emoji: "🍟",
    },
    {
      key: "home.categories.drinks",
      fallbackKey: "categories.drinks",
      name: text("home.categories.drinks", "categories.drinks"),
      emoji: "🥤",
    },
  ];

  return (
      <main>
        <section className="container-page pb-12 pt-14 sm:pb-20 sm:pt-20">
          <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="text-center sm:text-left">
              <h1 className="mx-auto mt-6 max-w-2xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-dark sm:mx-0 sm:text-6xl lg:text-7xl">
                <EditableText
                    value={text("home.hero.titleLine1", "titleLine1")}
                    textKey="home.hero.titleLine1"
                    locale={locale}
                    page="home"
                    canEdit={isOwner}
                    as="span"
                />
                <br />
                <EditableText
                    value={text("home.hero.titleLine2", "titleLine2")}
                    textKey="home.hero.titleLine2"
                    locale={locale}
                    page="home"
                    canEdit={isOwner}
                    as="span"
                />
              </h1>

              <EditableText
                  value={text("home.hero.subtitle", "subtitle")}
                  textKey="home.hero.subtitle"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="p"
                  className="mx-auto mt-5 max-w-xl text-lg leading-8 text-dark/60 sm:mx-0 sm:text-xl sm:leading-9"
              />

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:justify-start">
                <Link
                    href={`/${locale}/menu`}
                    className="btn-primary w-full gap-2 sm:w-auto"
                >
                  <EditableText
                      value={text("home.hero.orderNow", "orderNow")}
                      textKey="home.hero.orderNow"
                      locale={locale}
                      page="home"
                      canEdit={isOwner}
                      as="span"
                  />
                  <ArrowRight size={18} />
                </Link>

                <Link
                    href={`/${locale}/cart`}
                    className="btn-secondary w-full sm:w-auto"
                >
                  <EditableText
                      value={text("home.hero.viewCart", "viewCart")}
                      textKey="home.hero.viewCart"
                      locale={locale}
                      page="home"
                      canEdit={isOwner}
                      as="span"
                  />
                </Link>
              </div>
            </div>

            <div className="glass-card hero-card-in relative overflow-hidden p-4 sm:p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,45,45,.28),transparent_45%)]" />

              <div className="relative flex min-h-[330px] items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[#FF1515] via-paprika to-cherry p-5 sm:min-h-[520px] sm:rounded-[1.7rem] sm:p-8">
                <div className="absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-full bg-white/20 blur-3xl sm:h-32" />

                <Image
                    src="/mikes_logo.png"
                    alt="Nordic Eatery food delivery in Boden"
                    width={520}
                    height={520}
                    priority
                    fetchPriority="high"
                    quality={80}
                    sizes="(max-width: 640px) 88vw, (max-width: 1024px) 50vw, 520px"
                    className="hero-image-in relative mx-auto h-auto w-[88%] max-w-[430px] object-contain drop-shadow-2xl sm:w-[82%] sm:max-w-[520px]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="container-page pb-12 sm:pb-14">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {categories.map((category) => (
                <Link
                    key={category.key}
                    href={`/${locale}/menu`}
                    className="glass-card group p-4 transition hover:-translate-y-1 hover:bg-white sm:p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-paprika/10 text-xl sm:mb-6 sm:h-14 sm:w-14 sm:text-2xl">
                    {category.emoji}
                  </div>

                  <div className="relative">
                    <EditableText
                        value={category.name}
                        textKey={category.key}
                        locale={locale}
                        page="home"
                        canEdit={isOwner}
                        as="p"
                        className="text-lg font-black text-dark sm:text-xl"
                    />
                  </div>

                  <p className="mt-1 text-xs text-dark/50 sm:mt-2 sm:text-sm">
                    {text("home.categories.exploreMenu", "exploreMenu")}
                  </p>
                </Link>
            ))}
          </div>
        </section>

        <section className="container-page pb-20 sm:pb-24">
          <div className="mb-8 flex flex-col justify-between gap-4 text-center sm:mb-10 sm:flex-row sm:items-end sm:text-left">
            <div className="flex flex-col items-center gap-1 sm:items-start">
              <EditableText
                  value={text("home.popular", "popular")}
                  textKey="home.popular"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="p"
                  className="font-black uppercase tracking-[0.25em] text-paprika"
              />

              <EditableText
                  value={text("home.bestSellers", "bestSellers")}
                  textKey="home.bestSellers"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="h2"
                  className="section-title"
              />
            </div>

            <Link
                href={`/${locale}/menu`}
                className="btn-secondary w-full sm:w-auto"
            >
              <EditableText
                  value={text("home.fullMenu", "fullMenu")}
                  textKey="home.fullMenu"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="span"
              />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
            {(featuredItems || []).map((product) => (
                <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        </section>

        <section className="container-page pb-14 sm:pb-16">
          <div className="rounded-[1.5rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 sm:p-6">
            <div className="max-w-2xl">
              <EditableText
                  value={text("home.seoLinks.eyebrow", "seoLinks.eyebrow")}
                  textKey="home.seoLinks.eyebrow"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="p"
                  className="text-xs font-black uppercase tracking-[0.22em] text-paprika"
              />

              <EditableText
                  value={text("home.seoLinks.title", "seoLinks.title")}
                  textKey="home.seoLinks.title"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="h2"
                  className="mt-2 text-3xl font-black leading-[1] tracking-[-0.05em] text-dark sm:text-4xl"
              />

              <EditableText
                  value={text("home.seoLinks.description", "seoLinks.description")}
                  textKey="home.seoLinks.description"
                  locale={locale}
                  page="home"
                  canEdit={isOwner}
                  as="p"
                  className="mt-3 text-sm leading-7 text-dark/60 sm:text-base"
              />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Link
                  href={`/${locale}/delivery-boden`}
                  title={text("home.seoLinks.delivery", "seoLinks.delivery")}
                  aria-label={text("home.seoLinks.delivery", "seoLinks.delivery")}
                  className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
              >
                {text("home.seoLinks.deliveryShort", "seoLinks.deliveryShort")}
              </Link>

              <Link
                  href={`/${locale}/takeaway-boden`}
                  title={text("home.seoLinks.takeaway", "seoLinks.takeaway")}
                  aria-label={text("home.seoLinks.takeaway", "seoLinks.takeaway")}
                  className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
              >
                {text("home.seoLinks.takeawayShort", "seoLinks.takeawayShort")}
              </Link>

              <Link
                  href={`/${locale}/burgers-boden`}
                  title={text("home.seoLinks.burgers", "seoLinks.burgers")}
                  aria-label={text("home.seoLinks.burgers", "seoLinks.burgers")}
                  className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
              >
                {text("home.seoLinks.burgersShort", "seoLinks.burgersShort")}
              </Link>

              <Link
                  href={`/${locale}/catering-boden`}
                  title={text("home.seoLinks.catering", "seoLinks.catering")}
                  aria-label={text("home.seoLinks.catering", "seoLinks.catering")}
                  className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
              >
                {text("home.seoLinks.cateringShort", "seoLinks.cateringShort")}
              </Link>

              <Link
                  href={`/${locale}/menu`}
                  title={text("home.seoLinks.menu", "seoLinks.menu")}
                  aria-label={text("home.seoLinks.menu", "seoLinks.menu")}
                  className="rounded-xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-center text-sm font-black text-dark transition hover:border-paprika/30 hover:text-paprika"
              >
                {text("home.seoLinks.menuShort", "seoLinks.menuShort")}
              </Link>
            </div>
          </div>
        </section>
      </main>
  );
}

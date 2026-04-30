import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function HomePage({
                                         params,
                                       }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createClient();
  const t = await getTranslations("pages.home");

  const { data: featuredItems } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .eq("is_popular", true)
      .or("track_stock.eq.false,stock_quantity.gt.0")
      .order("sort_order", { ascending: true })
      .limit(6);

  const categories = [
    { name: t("categories.maczanka"), emoji: "🥪" },
    { name: t("categories.knysza"), emoji: "🌯" },
    { name: t("categories.fries"), emoji: "🍟" },
    { name: t("categories.drinks"), emoji: "🥤" },
  ];

  return (
      <main>
        <section className="container-page pb-12 pt-14 sm:pb-20 sm:pt-20">
          <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="text-center sm:text-left">


              <h1 className="mx-auto mt-6 max-w-2xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-dark sm:mx-0 sm:text-6xl lg:text-7xl">
                {t("titleLine1")}
                <br />
                {t("titleLine2")}
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-dark/60 sm:mx-0 sm:text-xl sm:leading-9">
                {t("subtitle")}
              </p>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:justify-start">
                <Link
                    href={`/${locale}/menu`}
                    className="btn-primary w-full gap-2 sm:w-auto"
                >
                  {t("orderNow")}
                  <ArrowRight size={18} />
                </Link>

                <Link
                    href={`/${locale}/cart`}
                    className="btn-secondary w-full sm:w-auto"
                >
                  {t("viewCart")}
                </Link>
              </div>
            </div>

            <div className="glass-card hero-card-in relative overflow-hidden p-4 sm:p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,45,45,.28),transparent_45%)]" />

              <div className="relative flex min-h-[330px] items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[#FF1515] via-paprika to-cherry p-5 sm:min-h-[520px] sm:rounded-[1.7rem] sm:p-8">
                <div className="absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-full bg-white/20 blur-3xl sm:h-32" />

                <Image
                    src="/mikes_logo.PNG"
                    alt="Mike"
                    width={540}
                    height={540}
                    priority
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
                    key={category.name}
                    href={`/${locale}/menu`}
                    className="glass-card group p-4 transition hover:-translate-y-1 hover:bg-white sm:p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-paprika/10 text-xl sm:mb-6 sm:h-14 sm:w-14 sm:text-2xl">
                    {category.emoji}
                  </div>

                  <p className="text-lg font-black text-dark sm:text-xl">
                    {category.name}
                  </p>

                  <p className="mt-1 text-xs text-dark/50 sm:mt-2 sm:text-sm">
                    {t("exploreMenu")}
                  </p>
                </Link>
            ))}
          </div>
        </section>

        <section className="container-page pb-20 sm:pb-24">
          <div className="text-center sm:text-left mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
            <div>
              <p className="font-black uppercase tracking-[0.25em] text-paprika">
                {t("popular")}
              </p>

              <h2 className="section-title mt-3">{t("bestSellers")}</h2>
            </div>

            <Link
                href={`/${locale}/menu`}
                className="btn-secondary w-full sm:w-auto"
            >
              {t("fullMenu")}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
            {(featuredItems || []).map((product) => (
                <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        </section>
      </main>
  );
}

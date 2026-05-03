import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Flame, Clock, Sparkles } from "lucide-react";

export default async function AboutPage({
                                          params,
                                        }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("pages.about");

  return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <section className="grid min-h-[680px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h1 className="mt-2 max-w-xl text-5xl font-black leading-[1.05] tracking-[-0.05em] text-dark sm:text-6xl">
                {t("title")}
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-dark/60">
                {t("whoText")}
              </p>

              <p className="mt-7 inline-flex rounded-full bg-paprika/10 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-paprika">
                {t("badge")}
              </p>
            </div>

            <div className="relative h-[560px] overflow-hidden rounded-[2.75rem] shadow-2xl">
              <Image
                  src="/images/about/hero.jpg"
                  alt="Mike's Food"
                  fill
                  priority
                  className="object-cover transition duration-700 hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          </section>

          <section className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Flame,
                title: t("freshTitle"),
                text: t("freshText"),
              },
              {
                icon: Clock,
                title: t("fastTitle"),
                text: t("fastText"),
              },
              {
                icon: Sparkles,
                title: t("tasteTitle"),
                text: t("tasteText"),
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                  <div key={item.title} className="glass-card p-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paprika/10 text-paprika">
                      <Icon size={22} />
                    </div>

                    <h3 className="mt-6 text-xl font-black text-dark">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-dark/60">
                      {item.text}
                    </p>
                  </div>
              );
            })}
          </section>

          <section className="mt-24 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative h-[520px] overflow-hidden rounded-[2.5rem] shadow-xl">
              <Image
                  src="/images/about/knysza.jpg"
                  alt="Knysza"
                  fill
                  className="object-cover transition duration-700 hover:scale-[1.03]"
              />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-paprika">
                {t("foodEyebrow")}
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-dark">
                {t("foodTitle")}
              </h2>

              <p className="mt-6 text-lg leading-8 text-dark/60">
                {t("foodText")}
              </p>
            </div>
          </section>

          <section className="mt-24 grid gap-5 md:grid-cols-3">
            {[
              "/images/about/fries1.jpg",
              "/images/about/fries2.jpg",
              "/images/about/fries3.jpg",
            ].map((src) => (
                <div
                    key={src}
                    className="relative h-[360px] overflow-hidden rounded-[2rem] bg-white shadow-lg"
                >
                  <Image
                      src={src}
                      alt="Mike's Food"
                      fill
                      className="object-cover transition duration-700 hover:scale-[1.04]"
                  />
                </div>
            ))}
          </section>

          <section className="mt-24 overflow-hidden rounded-[2.75rem] bg-gradient-to-r from-paprika to-orange-400 shadow-xl">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.8fr]">
              <div className="p-10 text-white sm:p-14">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-white/70">
                  {t("ctaEyebrow")}
                </p>

                <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-0.04em]">
                  {t("ctaTitle")}
                </h2>

                <p className="mt-5 max-w-xl text-lg leading-8 text-white/90">
                  {t("ctaText")}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={`/${locale}/booking`} className="btn-secondary gap-2">
                    {t("ctaBook")}
                    <ArrowRight size={18} />
                  </Link>

                  <Link href={`/${locale}/contact`} className="btn-secondary">
                    {t("ctaContact")}
                  </Link>
                </div>
              </div>

              <div className="relative hidden h-[420px] lg:block">
                <Image
                    src="/images/about/fries2.jpg"
                    alt="Event food"
                    fill
                    className="object-cover"
                />
              </div>
            </div>
          </section>
        </div>
      </main>
  );
}
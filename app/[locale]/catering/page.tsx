import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function CateringPage({
                                             params,
                                           }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("pages.catering");

  const provideItems = [
    t("provideCustomMenu"),
    t("provideGroups"),
    t("providePickup"),
    t("provideFoodTruck"),
    t("providePlanning"),
    t("provideFastCommunication"),
  ];

  return (
      <main className="min-h-screen px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <section className="text-center">
            <h1 className="mt-1 text-5xl font-black text-dark">
              {t("title")}
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-dark/60">
              {t("subtitle")}
            </p>

            <div className="mt-8 flex justify-center gap-3">
              <Link href={`/${locale}/booking`} className="btn-primary">
                {t("button")}
              </Link>

              <Link href={`/${locale}/contact`} className="btn-secondary">
                {t("contactButton")}
              </Link>
            </div>
          </section>

          <section className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              { title: t("smallTitle"), text: t("smallText") },
              { title: t("companyTitle"), text: t("companyText") },
              { title: t("largeTitle"), text: t("largeText") },
            ].map((item) => (
                <div
                    key={item.title}
                    className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur"
                >
                  <h3 className="text-xl font-black text-dark">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-dark/60">
                    {item.text}
                  </p>
                </div>
            ))}
          </section>

          <section className="mt-16 rounded-[2rem] bg-white/80 p-8 shadow-xl backdrop-blur">
            <h2 className="text-3xl font-black text-dark">
              {t("provideTitle")}
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {provideItems.map((item) => (
                  <div
                      key={item}
                      className="rounded-2xl bg-cream/70 px-5 py-4 text-sm font-bold text-dark/70"
                  >
                    {item}
                  </div>
              ))}
            </div>
          </section>

          <section className="mt-16 rounded-[2rem] bg-gradient-to-r from-paprika to-orange-400 p-10 text-center text-white shadow-xl">
            <h2 className="text-3xl font-black">{t("ctaTitle")}</h2>

            <p className="mx-auto mt-4 max-w-2xl text-white/90">
              {t("ctaText")}
            </p>

            <Link
                href={`/${locale}/booking`}
                className="btn-secondary mt-8 inline-flex"
            >
              {t("ctaButton")}
            </Link>
          </section>
        </div>
      </main>
  );
}
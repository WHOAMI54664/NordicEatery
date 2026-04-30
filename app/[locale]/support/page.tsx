import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("pages.support");

  return (
    <main className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <section className="text-center">
          <h1 className="mt-1 text-5xl font-black text-dark">
            {t("title")}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-dark/60">
            {t("subtitle")}
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-16 space-y-6">
          {[
            { q: t("q1"), a: t("a1") },
            { q: t("q2"), a: t("a2") },
            { q: t("q3"), a: t("a3") },
            { q: t("q4"), a: t("a4") },
          ].map((item) => (
            <div
              key={item.q}
              className="rounded-3xl bg-white/80 p-6 shadow-md backdrop-blur"
            >
              <h3 className="text-lg font-black text-dark">{item.q}</h3>
              <p className="mt-2 text-sm text-dark/60">{item.a}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-[2rem] bg-gradient-to-r from-paprika to-orange-400 p-10 text-center text-white shadow-xl">
          <h2 className="text-3xl font-black">
            {t("ctaTitle")}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-white/90">
            {t("ctaText")}
          </p>

          <div className="mt-8 flex justify-center gap-3">
            <Link href={`/${locale}/contact`} className="btn-secondary">
              {t("contact")}
            </Link>

            <Link href={`/${locale}/booking`} className="btn-secondary">
              {t("booking")}
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
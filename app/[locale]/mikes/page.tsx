import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function MikesPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations("pages.mikes");
  const locale = params.locale;

  return (
    <main className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h1 className="mt-1 text-5xl font-black text-dark">
              {t("title")}
            </h1>

            <p className="mt-6 text-lg leading-8 text-dark/60">
              {t("subtitle")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/booking`} className="btn-primary">
                {t("button")}
              </Link>

              <Link href={`/${locale}/contact`} className="btn-secondary">
                {t("contact")}
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] bg-white/70 p-3 shadow-xl backdrop-blur">
            <Image
              src="/foodtruck.jpg"
              alt="Mike's Food Truck"
              width={900}
              height={650}
              className="h-[420px] w-full rounded-[1.5rem] object-cover"
              priority
            />
          </div>
        </section>

        <section className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            {
              title: t("privateTitle"),
              text: t("privateText"),
            },
            {
              title: t("businessTitle"),
              text: t("businessText"),
            },
            {
              title: t("festivalsTitle"),
              text: t("festivalsText"),
            },
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
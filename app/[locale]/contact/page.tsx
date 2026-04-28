import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("pages.contact");

  return (
    <main className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <section className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-paprika">
            {t("eyebrow")}
          </p>

          <h1 className="mt-4 text-5xl font-black text-dark">
            {t("title")}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-dark/60">
            {t("subtitle")}
          </p>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          <a
            href="tel:+46734218925"
            className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
          >
            <Phone className="text-paprika" size={28} />
            <h3 className="mt-5 text-xl font-black text-dark">
              {t("phone")}
            </h3>
            <p className="mt-2 text-sm text-dark/60">+46 73 421 89 25</p>
          </a>

          <a
            href="mailto:kontakt@nordiceatery.se"
            className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
          >
            <Mail className="text-paprika" size={28} />
            <h3 className="mt-5 text-xl font-black text-dark">
              {t("email")}
            </h3>
            <p className="mt-2 text-sm text-dark/60">
              kontakt@nordiceatery.se
            </p>
          </a>

          <div className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur">
            <MapPin className="text-paprika" size={28} />
            <h3 className="mt-5 text-xl font-black text-dark">
              {t("location")}
            </h3>
            <p className="mt-2 text-sm text-dark/60">Sweden</p>
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
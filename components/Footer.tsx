"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

function useLocalePath(path: string) {
  const params = useParams();
  const locale = String(params.locale || "en");

  return `/${locale}${path}`;
}

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-20 border-t border-dark/10 bg-cream/60">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <p className="text-2xl font-black text-paprika">{t("brand")}</p>
            <p className="mt-3 text-sm text-dark/60">{t("tagline")}</p>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-dark/50">
              {t("navigation")}
            </p>

            <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-dark/70">
              <Link href={useLocalePath("/menu")} className="hover:text-paprika transition">
                {t("menu")}
              </Link>
              <Link href={useLocalePath("/about")} className="hover:text-paprika transition">
                {t("about")}
              </Link>
              <Link href={useLocalePath("/booking")} className="hover:text-paprika transition">
                {t("booking")}
              </Link>
              <Link href={useLocalePath("/mikes")} className="hover:text-paprika transition">
                {t("foodTruck")}
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-dark/50">
              {t("services")}
            </p>

            <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-dark/70">
              <Link href={useLocalePath("/catering")} className="hover:text-paprika transition">
                {t("catering")}
              </Link>
              <Link href={useLocalePath("/contact")} className="hover:text-paprika transition">
                {t("contact")}
              </Link>
              <Link href={useLocalePath("/support")} className="hover:text-paprika transition">
                {t("support")}
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-dark/50">
              {t("contact")}
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <a href="mailto:boking@nordiceatery.se" className="rounded-xl bg-paprika px-4 py-3 text-center text-sm font-bold text-white shadow transition hover:opacity-90">
                {t("booking")}
              </a>

              <a href="mailto:support@nordiceatery.se" className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-dark shadow transition hover:bg-dark/5">
                {t("support")}
              </a>

              <a href="mailto:kontakt@nordiceatery.se" className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-dark shadow transition hover:bg-dark/5">
                {t("contact")}
              </a>

              <p className="mt-2 text-sm text-dark/60">{t("location")}</p>
              <p className="text-sm text-dark/60">{t("delivery")}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-dark/10 pt-6 text-sm text-dark/50 sm:flex-row">
          <p>© {new Date().getFullYear()} NordicEatery</p>

          <div className="flex gap-6">
            <Link href={useLocalePath("/support")} className="hover:text-paprika transition">
              {t("support")}
            </Link>
            <Link href={useLocalePath("/contact")} className="hover:text-paprika transition">
              {t("contact")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
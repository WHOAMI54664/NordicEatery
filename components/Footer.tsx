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
      <footer className="mt-16 border-t border-dark/10 bg-cream/60">
        <div className="container-page py-8 sm:py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="text-2xl font-black text-paprika">{t("brand")}</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-dark/60">
                {t("tagline")}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                {t("navigation")}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-dark/70 sm:flex sm:flex-col">
                <Link href={useLocalePath("/menu")} className="transition hover:text-paprika">
                  {t("menu")}
                </Link>
                <Link href={useLocalePath("/about")} className="transition hover:text-paprika">
                  {t("about")}
                </Link>
                <Link href={useLocalePath("/booking")} className="transition hover:text-paprika">
                  {t("booking")}
                </Link>
                <Link href={useLocalePath("/mikes")} className="transition hover:text-paprika">
                  {t("foodTruck")}
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                {t("services")}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-dark/70 sm:flex sm:flex-col">
                <Link href={useLocalePath("/catering")} className="transition hover:text-paprika">
                  {t("catering")}
                </Link>
                <Link href={useLocalePath("/contact")} className="transition hover:text-paprika">
                  {t("contact")}
                </Link>
                <Link href={useLocalePath("/support")} className="transition hover:text-paprika">
                  {t("support")}
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                Legal
              </p>

              <div className="mt-3 flex flex-col gap-2 text-sm font-semibold text-dark/70">
                <Link href={useLocalePath("/terms")} className="transition hover:text-paprika">
                  {t("terms")}
                </Link>
                <Link href={useLocalePath("/privacy")} className="transition hover:text-paprika">
                  {t("privacy")}
                </Link>
                <Link href={useLocalePath("/contact")} className="transition hover:text-paprika">
                  {t("refunds")}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-white/50 p-4 text-sm leading-6 text-dark/60">
            <p>
              <span className="font-bold text-dark">{t("businessInfo")}:</span>{" "}
              Nordic Eatery
            </p>
            <p>{t("location")}</p>
            <p>Email: kontakt@nordiceatery.se</p>
            <p>Phone: +46 73 421 89 25</p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-dark/10 pt-6 text-xs text-dark/45 sm:flex-row">
            <p>© {new Date().getFullYear()} NordicEatery</p>

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              <Link href={useLocalePath("/terms")} className="transition hover:text-paprika">
                {t("terms")}
              </Link>
              <Link href={useLocalePath("/privacy")} className="transition hover:text-paprika">
                {t("privacy")}
              </Link>
              <Link href={useLocalePath("/contact")} className="transition hover:text-paprika">
                {t("contact")}
              </Link>
              <Link href={useLocalePath("/support")} className="transition hover:text-paprika">
                {t("support")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
  );
}
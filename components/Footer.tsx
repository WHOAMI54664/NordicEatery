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
              <p className="text-sm font-black uppercase tracking-[0.2em] text-dark/50">
                {t("services")}
              </p>

              <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-dark/70">
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
              <p className="text-sm font-black uppercase tracking-[0.2em] text-dark/50">
                Legal
              </p>

              <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-dark/70">
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

              <div className="mt-6 space-y-1 text-sm text-dark/60">
                <p>
                  <span className="font-bold text-dark">{t("businessInfo")}:</span>{" "}
                  Nordic Eatery
                </p>
                <p>{t("location")}</p>
                <p>Email: kontakt@nordiceatery.se</p>
                <p>Phone: +46 73 421 89 25</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-dark/10 pt-6 text-sm text-dark/50 sm:flex-row">
            <p>© {new Date().getFullYear()} NordicEatery</p>

            <div className="flex flex-wrap gap-6">
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
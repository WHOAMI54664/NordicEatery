"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

function useLocalePath(path: string) {
  const params = useParams();
  const locale = String(params.locale || "en");

  return `/${locale}${path}`;
}

function PaymentIcons() {
  const payments = [
    { src: "/payments/visa.svg", alt: "Visa" },
    { src: "/payments/mastercard.svg", alt: "Mastercard" },
    { src: "/payments/swish.svg", alt: "Swish" },
    { src: "/payments/applepay.svg", alt: "Apple Pay" }
  ];

  return (
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {payments.map((item) => (
            <div
                key={item.alt}
                className="flex h-8 w-14 items-center justify-center rounded-xl border border-dark/10 bg-white/80 shadow-sm sm:h-10 sm:w-16 sm:rounded-2xl"
            >
              <Image
                  src={item.src}
                  alt={item.alt}
                  width={38}
                  height={20}
                  className="h-4 w-auto object-contain sm:h-5"
              />
            </div>
        ))}
      </div>
  );
}

export function Footer() {
  const t = useTranslations("footer");

  return (
      <footer className="mt-12 border-t border-dark/10 bg-cream/60 sm:mt-16">
        <div className="container-page py-8 sm:py-10">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-1">
              <p className="text-xl font-black text-paprika sm:text-2xl">
                {t("brand")}
              </p>

              <p className="mt-2 max-w-xs text-sm leading-6 text-dark/60">
                {t("tagline")}
              </p>

              <div className="mt-5">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                  {t("payments")}
                </p>

                <PaymentIcons />
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                {t("navigation")}
              </p>

              <div className="mt-3 flex flex-col gap-1.5 text-sm font-semibold text-dark/70 sm:gap-2">
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

              <div className="mt-3 flex flex-col gap-1.5 text-sm font-semibold text-dark/70 sm:gap-2">
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

              <div className="mt-3 flex flex-col gap-1.5 text-sm font-semibold text-dark/70 sm:gap-2">
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

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                {t("businessInfo")}
              </p>

              <div className="mt-3 text-sm font-semibold leading-6 text-dark/70">
                <p>Nordic Eatery</p>
                <p>Unbyn 7</p>
                <p>961 93 Boden</p>
                <p>Sweden</p>

                <div className="mt-2">
                  <p className="break-words">kontakt@nordiceatery.se</p>
                  <p>+46 73 421 89 25</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-dark/10 pt-5">
            <div className="flex flex-col items-center justify-between gap-4 text-xs text-dark/50 sm:flex-row">
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
        </div>
      </footer>
  );
}
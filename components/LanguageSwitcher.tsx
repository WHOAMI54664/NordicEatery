"use client";

import { getPublicPath } from "@/i18n/paths";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { useParams, usePathname } from "next/navigation";

const locales = [
  { code: "en", label: "English" },
  { code: "sv", label: "Svenska" },
  { code: "pl", label: "Polski" },
  { code: "ru", label: "Русский" },
];

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const params = useParams();
  const pathname = usePathname();

  const locale = String(params.locale || "en");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-dark shadow-sm transition hover:bg-white"
        aria-label="Change language"
        title="Change language"
        aria-expanded={open}
        aria-controls="language-switcher-menu"
      >
        <Globe size={18} aria-hidden="true" />
      </button>

      {open && (
        <div
          id="language-switcher-menu"
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-dark/10 bg-white shadow-xl"
        >
          {locales.map((lng) => (
            <Link
              key={lng.code}
              href={getPublicPath(lng.code, pathname)}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 text-sm font-semibold transition ${
                locale === lng.code
                  ? "bg-paprika text-white"
                  : "text-dark hover:bg-dark/5"
              }`}
              aria-label={`Switch language to ${lng.label}`}
              aria-current={locale === lng.code ? "page" : undefined}
            >
              {lng.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

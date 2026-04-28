"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { useParams } from "next/navigation";

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
  const locale = String(params.locale || "en");

  // закрытие при клике вне
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-dark shadow-sm hover:bg-white transition"
      >
        <Globe size={18} />
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-white shadow-xl border border-dark/10 overflow-hidden z-50">
          {locales.map((lng) => (
            <Link
              key={lng.code}
              href={`/${lng.code}`}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 text-sm font-semibold transition ${
                locale === lng.code
                  ? "bg-paprika text-white"
                  : "text-dark hover:bg-dark/5"
              }`}
            >
              {lng.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
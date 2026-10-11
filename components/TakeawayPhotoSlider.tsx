"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

const photos = ["meal-rice", "meal-potatoes", "meal-meatballs", "meal-fish"];

export function TakeawayPhotoSlider() {
  const t = useTranslations("takeawayGallery");
  const [active, setActive] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  function move(direction: number) {
    setActive((value) => (value + direction + photos.length) % photos.length);
  }

  return (
    <section
      aria-label={t("label")}
      aria-roledescription={t("carousel")}
      className="mx-auto w-full max-w-[440px] min-w-0"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div
        className="relative flex aspect-[3/4] touch-pan-y items-center justify-center overflow-hidden rounded-[1.5rem] bg-cream"
        onPointerDown={(event) => {
          touch.current = event.isPrimary
            ? { x: event.clientX, y: event.clientY }
            : null;
          if (event.isPrimary)
            event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          touch.current = null;
        }}
        onPointerUp={(event) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = event.clientX - start.x;
          if (
            Math.abs(dx) > 50 &&
            Math.abs(dx) > Math.abs(event.clientY - start.y)
          )
            move(dx < 0 ? 1 : -1);
        }}
      >
        {photos.map((photo, index) => (
          <Image
            key={photo}
            src={`/images/takeaway/${photo}.webp`}
            alt={t(`photos.${photo}`)}
            width={photo === "meal-meatballs" ? 1280 : 1200}
            height={photo === "meal-meatballs" ? 960 : 1600}
            sizes="(max-width: 639px) 85vw, 440px"
            priority={index === 0}
            hidden={index !== active}
            draggable={false}
            className="absolute inset-0 m-auto max-h-full w-auto max-w-full rounded-[1.5rem] object-contain"
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label={t("previous")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-dark/15 bg-white text-dark hover:border-paprika hover:text-paprika focus-visible:outline-paprika"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <div className="flex items-center">
          {photos.map((photo, index) => (
            <button
              key={photo}
              type="button"
              onClick={() => setActive(index)}
              aria-label={t("show", { number: index + 1 })}
              aria-current={index === active ? "true" : undefined}
              className="flex h-11 w-9 items-center justify-center rounded-full focus-visible:outline-paprika"
            >
              <span
                className={`h-2.5 rounded-full transition-all motion-reduce:transition-none ${index === active ? "w-6 bg-paprika" : "w-2.5 bg-dark/25"}`}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label={t("next")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-dark/15 bg-white text-dark hover:border-paprika hover:text-paprika focus-visible:outline-paprika"
        >
          <ChevronRight size={22} aria-hidden="true" />
        </button>
        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {t("position", { number: active + 1, total: photos.length })}
        </p>
      </div>
    </section>
  );
}

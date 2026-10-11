"use client";

import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Poster = {
  key: string;
  src: string;
};

type HomeHeroPosterProps = {
  posters: Poster[];
  fallbackImage: string;
  locale: string;
  page: string;
  canEdit?: boolean;
};

const posterKeys = [
  "home.hero.poster.1",
  "home.hero.poster.2",
  "home.hero.poster.3",
  "home.hero.poster.4",
];

export function HomeHeroPoster({
  posters,
  fallbackImage,
  locale,
  page,
  canEdit = false,
}: HomeHeroPosterProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [localPosters, setLocalPosters] = useState<Poster[]>(posters);

  useEffect(() => {
    setLocalPosters(posters);
  }, [posters]);

  const visiblePosters = useMemo(() => {
    const valid = localPosters.filter((poster) => poster.src);

    if (valid.length > 0) {
      return valid;
    }

    return [
      {
        key: "home.hero.fallback",
        src: fallbackImage,
      },
    ];
  }, [localPosters, fallbackImage]);

  useEffect(() => {
    if (visiblePosters.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visiblePosters.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [visiblePosters.length]);

  const activePoster = visiblePosters[activeIndex] || visiblePosters[0];

  async function uploadPoster(file: File, imageKey: string) {
    try {
      setUploadingKey(imageKey);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("key", imageKey);
      formData.append("locale", locale);
      formData.append("page", page);

      const response = await fetch("/api/admin/site-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        alert(data.error || "Could not upload image");
        return;
      }

      setLocalPosters((current) => {
        const exists = current.some((poster) => poster.key === imageKey);

        if (exists) {
          return current.map((poster) =>
            poster.key === imageKey ? { ...poster, src: data.url } : poster,
          );
        }

        return [...current, { key: imageKey, src: data.url }];
      });

      setActiveIndex(0);
    } catch {
      alert("Could not upload image");
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <>
      <div className="home-hero-photo absolute inset-0 flex items-center justify-center overflow-hidden">
        <Image
          src={activePoster.src}
          alt="Nordic Eatery street food"
          width={1440}
          height={1800}
          priority
          fetchPriority="high"
          quality={80}
          sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) 720px, (max-width: 1279px) 59vw, 720px"
          className={
            activePoster.key === "home.hero.fallback"
              ? "h-auto w-auto max-h-full max-w-full rounded-[inherit] object-contain p-8 sm:p-12"
              : "h-auto w-auto max-h-full max-w-full rounded-[inherit] object-contain object-center"
          }
        />
      </div>

      {visiblePosters.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-black/25 px-4 py-3 backdrop-blur-md">
          {visiblePosters.map((poster, index) => (
            <button
              key={poster.key}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition ${
                index === activeIndex ? "w-7 bg-white" : "w-2.5 bg-white/50"
              }`}
              aria-label={`Show poster ${index + 1}`}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
          {posterKeys.map((imageKey, index) => (
            <label
              key={imageKey}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-paprika shadow-md ring-1 ring-dark/10 transition hover:bg-paprika hover:text-white"
            >
              <ImagePlus size={14} />
              {uploadingKey === imageKey
                ? "Uploading..."
                : `Poster ${index + 1}`}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={Boolean(uploadingKey)}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    uploadPoster(file, imageKey);
                  }

                  event.currentTarget.value = "";
                }}
              />
            </label>
          ))}
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import { MapPin, Navigation } from "lucide-react";
import {
  parsePublicTruckLocation,
  truckMapUrl,
  type PublicTruckLocation,
} from "@/lib/restaurant/location";

export function HomeFoodTruckLocation({
  initialLocation,
}: {
  initialLocation: PublicTruckLocation;
}) {
  const t = useEditableTranslations("truckLocation");
  const [location, setLocation] = useState(initialLocation);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let active: AbortController | null = null;
    let refreshAgain = false;
    async function refresh() {
      clearTimeout(timer);
      if (document.visibilityState === "hidden" || stopped) return;
      if (active) {
        refreshAgain = true;
        return;
      }
      const controller = new AbortController();
      active = controller;
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch("/api/truck-location", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Location unavailable");
        const next = parsePublicTruckLocation(await response.json());
        if (!stopped) setLocation(next);
      } catch {
        // Keep the last known location; the scheduled refresh will retry.
      } finally {
        clearTimeout(timeout);
        active = null;
        if (!stopped) {
          timer = setTimeout(refresh, refreshAgain ? 0 : 20000);
          refreshAgain = false;
        }
      }
    }
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("nordic-truck-location")
        : null;
    if (channel)
      channel.onmessage = () => {
        void refresh();
      };
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("focus", refreshVisible);
    void refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
      active?.abort();
      channel?.close();
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("focus", refreshVisible);
    };
  }, []);

  if (!location.isOpen || (!location.address && !location.coordinates))
    return null;
  const directions = truckMapUrl(
    location.approximate ? null : location.coordinates,
    location.address || "",
  );
  return (
    <section
      id="foodtruck-location"
      className="container-page scroll-mt-36 pb-12 sm:pb-16"
      aria-labelledby="foodtruck-location-title"
    >
      <div className="overflow-hidden rounded-[2rem] border border-dark/10 bg-white shadow-xl shadow-dark/5">
        <div className="flex flex-wrap items-center justify-between gap-5 p-5 sm:p-7">
          <div className="flex min-w-0 items-start gap-3">
            <span className="rounded-2xl bg-paprika/10 p-3 text-paprika">
              <MapPin size={24} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="foodtruck-location-title"
                className="text-2xl font-black tracking-tight text-dark sm:text-3xl"
              >
                {t.edit("title")}
              </h2>
              <p
                className="mt-2 break-words text-sm text-dark/70 sm:text-base"
                aria-live="polite"
              >
                {location.address || t.edit("exactPoint")}
              </p>
            </div>
          </div>
          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full gap-2 sm:w-auto"
            >
              <Navigation size={17} />
              {t.edit("directions")}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

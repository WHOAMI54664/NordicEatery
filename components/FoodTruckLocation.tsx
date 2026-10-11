"use client";
import { MapPin, ExternalLink } from "lucide-react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import { truckMapUrl, type TruckCoordinates } from "@/lib/restaurant/location";

export function FoodTruckLocation({
  address,
  coordinates,
  className = "",
}: {
  address: string | null;
  coordinates: TruckCoordinates | null;
  className?: string;
}) {
  const t = useEditableTranslations("truckLocation");
  const url = truckMapUrl(coordinates, address || "");
  if (!url) return null;
  return (
    <aside
      className={`flex flex-wrap items-center gap-3 rounded-2xl border border-dark/10 bg-white/80 p-4 ${className}`}
      aria-label={t("title")}
    >
      <MapPin size={22} className="shrink-0 text-paprika" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-dark">{t.edit("title")}</p>
        <p className="mt-1 break-words text-sm text-dark/65">
          {address || t.edit("exactPoint")}
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-paprika/10 px-4 py-2.5 text-sm font-bold text-paprika hover:bg-paprika/15"
      >
        <ExternalLink size={16} />
        {t.edit("openMap")}
      </a>
    </aside>
  );
}

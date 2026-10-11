"use client";

import { MapPin, Navigation } from "lucide-react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import {
  canShowGroupPickup,
  GROUP_PICKUP_MAP_URL,
} from "@/lib/group-orders/pickup";
import type { PublicGroup } from "@/lib/group-orders/model";

export function GroupPickupDirections({ group }: { group: PublicGroup }) {
  const t = useEditableTranslations("groupOrder");
  if (!canShowGroupPickup(group)) return null;
  return (
    <section
      aria-label={t("pickupLocationTitle")}
      className="mb-5 rounded-3xl border border-paprika/15 bg-white p-6"
    >
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <MapPin
          size={22}
          className="shrink-0 text-paprika"
          aria-hidden="true"
        />
        {t.edit("pickupLocationTitle")}
      </h2>
      <p className="mt-3 text-sm leading-6 text-dark/70">
        {t.edit("pickupLocationDescription")}
      </p>
      <a
        href={GROUP_PICKUP_MAP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary mt-4 gap-2"
      >
        <Navigation size={18} aria-hidden="true" />
        {t.edit("openPickupMap")}
      </a>
    </section>
  );
}

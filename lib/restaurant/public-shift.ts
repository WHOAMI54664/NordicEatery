import { createAdminClient } from "@/lib/supabase/admin";
import { parseCoordinates, type TruckCoordinates } from "./location";

export type PublicShiftStatus = {
  isOpen: boolean;
  openedAt: string | null;
  closedAt: string | null;
  locationAddress: string | null;
  coordinates: TruckCoordinates | null;
};

type ShiftRow = {
  is_open: boolean | null;
  opened_at: string | null;
  closed_at: string | null;
  location_address?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
};

export async function getPublicShiftStatus(): Promise<PublicShiftStatus> {
  const supabase = createAdminClient({ timeoutMs: 10000 });
  let { data, error } = await supabase
    .from("restaurant_shift_state")
    .select(
      "is_open, opened_at, closed_at, location_address, location_latitude, location_longitude",
    )
    .eq("id", 1)
    .maybeSingle<ShiftRow>();

  // Keep reads compatible during an additive rollout, without hiding unrelated
  // failures or silently discarding a location on a write.
  if (error?.code === "42703" || error?.code === "PGRST204") {
    const fallback = await supabase
      .from("restaurant_shift_state")
      .select("is_open, opened_at, closed_at, location_address")
      .eq("id", 1)
      .maybeSingle<ShiftRow>();
    data = fallback.data;
    error = fallback.error;
  }
  if (error) console.error("Public shift status error", { code: error.code });
  let coordinates: TruckCoordinates | null = null;
  if (
    !error &&
    data?.is_open &&
    data.location_latitude != null &&
    data.location_longitude != null
  ) {
    try {
      coordinates = parseCoordinates({
        latitude: data.location_latitude,
        longitude: data.location_longitude,
      });
    } catch {
      console.error("Invalid stored foodtruck coordinates");
    }
  }
  return {
    isOpen: !error && Boolean(data?.is_open),
    openedAt: data?.opened_at || null,
    closedAt: data?.closed_at || null,
    locationAddress:
      !error && data?.is_open ? data.location_address || null : null,
    coordinates,
  };
}

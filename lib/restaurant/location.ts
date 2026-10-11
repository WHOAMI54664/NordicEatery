export type TruckCoordinates = { latitude: number; longitude: number };

export function parseCoordinates(value: unknown): TruckCoordinates | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value))
    throw new Error("invalidCoordinates");
  const { latitude, longitude } = value as Record<string, unknown>;
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180
  ) {
    throw new Error("invalidCoordinates");
  }
  return { latitude, longitude };
}

export function coordinatesFromInput(
  latitude: string,
  longitude: string,
): TruckCoordinates | null {
  if (!latitude.trim() && !longitude.trim()) return null;
  const values = [latitude, longitude].map((value) =>
    value.trim().replace(",", "."),
  );
  if (values.some((value) => !/^-?\d+(?:\.\d+)?$/.test(value)))
    throw new Error("invalidCoordinates");
  return parseCoordinates({
    latitude: Number(values[0]),
    longitude: Number(values[1]),
  });
}

export function truckMapUrl(
  coordinates: TruckCoordinates | null,
  address = "",
): string | null {
  const point = parseCoordinates(coordinates);
  const query = point ? `${point.latitude},${point.longitude}` : address.trim();
  if (!query) return null;
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", query);
  return url.toString();
}

export type ShiftUpdate = {
  action: "open" | "close" | "location";
  address?: string;
  coordinates?: TruckCoordinates | null;
};

export function parseShiftUpdate(value: unknown): ShiftUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalidInput");
  const body = value as Record<string, unknown>;
  if (body.action === "close") return { action: "close" };
  if (body.action !== "open" && body.action !== "location")
    throw new Error("invalidInput");
  if (
    typeof body.address !== "string" ||
    body.address.trim().length > 300 ||
    /[\u0000-\u001f\u007f]/.test(body.address)
  )
    throw new Error("invalidAddress");
  const coordinates = parseCoordinates(body.coordinates);
  const address = body.address.trim();
  if (!address && !coordinates) throw new Error("locationRequired");
  return { action: body.action, address, coordinates };
}

export function shiftUpdatePayload(
  update: ShiftUpdate,
  userId: string,
  now: string,
) {
  if (update.action === "close")
    return {
      is_open: false,
      closed_at: now,
      closed_by: userId,
      updated_at: now,
    };
  return {
    location_address: update.address || null,
    // An older address-only client must not leave a previous GPS pin attached
    // to a newly entered address.
    location_latitude: update.coordinates?.latitude ?? null,
    location_longitude: update.coordinates?.longitude ?? null,
    updated_at: now,
    ...(update.action === "open"
      ? { is_open: true, opened_at: now, opened_by: userId }
      : {}),
  };
}

export type PublicTruckLocation = {
  isOpen: boolean;
  address: string | null;
  coordinates: TruckCoordinates | null;
  approximate: boolean;
};

export function parsePublicTruckLocation(value: unknown): PublicTruckLocation {
  if (!value || typeof value !== "object") throw new Error("invalidLocation");
  const row = value as Record<string, unknown>;
  if (typeof row.isOpen !== "boolean") throw new Error("invalidLocation");
  if (!row.isOpen)
    return {
      isOpen: false,
      address: null,
      coordinates: null,
      approximate: false,
    };
  if (
    row.address !== null &&
    (typeof row.address !== "string" || row.address.length > 300)
  )
    throw new Error("invalidLocation");
  return {
    isOpen: true,
    address: row.address as string | null,
    coordinates: parseCoordinates(row.coordinates),
    approximate: row.approximate === true,
  };
}

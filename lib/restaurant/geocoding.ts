import { parseCoordinates, type TruckCoordinates } from "./location";

export type GeocodedLocation = {
  coordinates: TruckCoordinates;
  address: string;
};

export function parseGeocodingResult(value: unknown): GeocodedLocation | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("features" in value) ||
    !Array.isArray(value.features)
  )
    return null;
  for (const feature of value.features.slice(0, 5)) {
    if (
      feature?.geometry?.type !== "Point" ||
      !Array.isArray(feature.geometry.coordinates)
    )
      continue;
    let coordinates: TruckCoordinates | null;
    try {
      coordinates = parseCoordinates({
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
      });
    } catch {
      continue;
    }
    const p = feature.properties;
    if (!coordinates || !p || typeof p !== "object") continue;
    const part = (key: string): string =>
      typeof p[key] === "string" ? p[key].trim() : "";
    const street = part("street") || part("name");
    const address = [
      ...new Set(
        [
          [street, part("housenumber")].filter(Boolean).join(" "),
          [part("postcode"), part("city") || part("district")]
            .filter(Boolean)
            .join(" "),
          part("country"),
        ].filter(Boolean),
      ),
    ].join(", ");
    if (
      !street ||
      address.length > 300 ||
      /[\u0000-\u001f\u007f]/.test(address)
    )
      continue;
    return { coordinates, address };
  }
  return null;
}

async function lookup(
  query: URLSearchParams,
): Promise<GeocodedLocation | null> {
  const base = new URL(
    process.env.TRUCK_GEOCODER_URL || "https://photon.komoot.io/",
  );
  if (
    base.protocol !== "https:" &&
    !(process.env.NODE_ENV === "development" && base.hostname === "127.0.0.1")
  )
    throw new Error("geocodingUnavailable");
  const url = new URL("reverse", base);
  url.search = query.toString();
  const response = await fetch(url, {
    headers: {
      "User-Agent": "NordicEatery/1.0 (https://www.nordiceatery.se)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(5000),
    redirect: "error",
    // Reuse address suggestions for repeated admin lookups of the same point.
    cache: "force-cache",
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error("geocodingUnavailable");
  const body = await response.text();
  if (body.length > 64000) throw new Error("geocodingUnavailable");
  return parseGeocodingResult(JSON.parse(body));
}

export async function addressForCoordinates(
  point: TruckCoordinates,
): Promise<string> {
  const coordinates = parseCoordinates(point);
  if (!coordinates) throw new Error("invalidCoordinates");
  const result = await lookup(
    new URLSearchParams({
      lat: coordinates.latitude.toFixed(6),
      lon: coordinates.longitude.toFixed(6),
      radius: "0.5",
      limit: "1",
      layer: "street",
    }),
  );
  if (!result) throw new Error("addressNotFound");
  return result.address;
}

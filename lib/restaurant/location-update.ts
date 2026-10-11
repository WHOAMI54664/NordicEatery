import type { ShiftUpdate, TruckCoordinates } from "./location";

export function sameCoordinates(
  a: TruckCoordinates | null | undefined,
  b: TruckCoordinates | null | undefined,
) {
  return a?.latitude === b?.latitude && a?.longitude === b?.longitude;
}

export async function completeShiftLocation(
  update: ShiftUpdate,
  current: { address: string | null; coordinates: TruckCoordinates | null },
  resolveAddress: (coordinates: TruckCoordinates) => Promise<string>,
): Promise<ShiftUpdate> {
  if (update.action === "close" || !update.coordinates) return update;
  const movedWithOldAddress =
    !sameCoordinates(update.coordinates, current.coordinates) &&
    update.address === current.address;
  if (!update.address || movedWithOldAddress) {
    // Keep the actual GPS point. A geocoder's nearby street point must never
    // replace it, and failure must not publish a new pin with the old address.
    const address = await resolveAddress(update.coordinates);
    if (!address) throw new Error("addressNotFound");
    return { ...update, address };
  }
  return update;
}

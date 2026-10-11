import { MAX_GROUP_SLOTS, SLOT_TIME } from "./schedule";
export const GROUP_TIME_ZONE = "Europe/Stockholm";
export const GROUP_SLOT_CAPACITY = 10;
export type GroupReservation = {
  id: string;
  version: number;
  pickupAt: string;
  participantCount: number;
  expiresAt: string;
};
export type GroupSlot = {
  pickupAt: string;
  time: string;
  available: boolean;
  capacity?: number;
  remaining?: number;
};
export type GroupAvailability = {
  date: string;
  slots: GroupSlot[];
  reservation?: GroupReservation | null;
};

export function validParticipantCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= GROUP_SLOT_CAPACITY
  );
}

export function isGroupReservation(value: unknown): value is GroupReservation {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      r.id,
    ) &&
    typeof r.version === "number" &&
    Number.isSafeInteger(r.version) &&
    r.version > 0 &&
    validParticipantCount(r.participantCount) &&
    typeof r.pickupAt === "string" &&
    Number.isFinite(Date.parse(r.pickupAt)) &&
    typeof r.expiresAt === "string" &&
    Number.isFinite(Date.parse(r.expiresAt))
  );
}

export function reservableSeats(
  slot: GroupSlot,
  reservation?: GroupReservation | null,
  now = Date.now(),
) {
  return Math.min(
    GROUP_SLOT_CAPACITY,
    (slot.remaining ?? 0) +
      (reservation?.pickupAt === slot.pickupAt &&
      Date.parse(reservation.expiresAt) > now
        ? reservation.participantCount
        : 0),
  );
}

export function stockholmDateTime(value: string | number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GROUP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === name)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    second: get("second"),
  };
}

export function validPickupTime(value: unknown, now: number): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:00(?:\.000)?Z$/.test(value)
  )
    return false;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time <= now) return false;
  if (
    new Date(time).toISOString().replace(".000Z", "Z") !==
    value.replace(".000Z", "Z")
  )
    return false;
  const local = stockholmDateTime(time);
  // The database checks the configurable schedule and reserves capacity atomically.
  return local.date === stockholmDateTime(now).date;
}

export function isGroupAvailability(
  value: unknown,
): value is GroupAvailability {
  if (
    !value ||
    typeof value !== "object" ||
    !("date" in value) ||
    !("slots" in value)
  )
    return false;
  if (
    typeof value.date !== "string" ||
    !/^\d{4}-\d\d-\d\d$/.test(value.date) ||
    !Array.isArray(value.slots) ||
    value.slots.length > MAX_GROUP_SLOTS
  )
    return false;
  if (
    "reservation" in value &&
    value.reservation != null &&
    !isGroupReservation(value.reservation)
  )
    return false;
  const seen = new Set<string>();
  return value.slots.every((slot) => {
    if (
      !slot ||
      typeof slot.pickupAt !== "string" ||
      typeof slot.time !== "string" ||
      !SLOT_TIME.test(slot.time) ||
      typeof slot.available !== "boolean" ||
      ((slot.capacity !== undefined || slot.remaining !== undefined) &&
        (slot.capacity !== GROUP_SLOT_CAPACITY ||
          !Number.isInteger(slot.remaining) ||
          slot.remaining < 0 ||
          slot.remaining > GROUP_SLOT_CAPACITY)) ||
      seen.has(slot.time) ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:00Z$/.test(slot.pickupAt) ||
      !Number.isFinite(Date.parse(slot.pickupAt))
    )
      return false;
    const local = stockholmDateTime(slot.pickupAt);
    seen.add(slot.time);
    return local.date === value.date && local.time === slot.time;
  });
}

export function formatGroupPickup(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: GROUP_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

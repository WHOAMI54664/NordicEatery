export const MAX_GROUP_SLOTS = 48;
export const SLOT_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export type GroupScheduleSlot = { time: string; enabled: boolean };
export type GroupSchedule = {
  version: number;
  slots: GroupScheduleSlot[];
  updatedAt: string;
};

export function parseScheduleSlots(value: unknown): GroupScheduleSlot[] | null {
  if (!Array.isArray(value) || value.length > MAX_GROUP_SLOTS) return null;
  const slots: GroupScheduleSlot[] = [];
  const times = new Set<string>();
  for (const slot of value) {
    if (
      !slot ||
      typeof slot !== "object" ||
      typeof slot.time !== "string" ||
      !SLOT_TIME.test(slot.time) ||
      typeof slot.enabled !== "boolean" ||
      times.has(slot.time)
    )
      return null;
    times.add(slot.time);
    slots.push({ time: slot.time, enabled: slot.enabled });
  }
  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

import type { PublicGroup } from "./model";

// SSAB group pickup is separate from the foodtruck's changing daily location.
export const GROUP_PICKUP_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=65.557719%2C22.237107";

export function canShowGroupPickup(
  group: Pick<
    PublicGroup,
    "me" | "status" | "orderStatus" | "mode" | "deliveryType" | "payments"
  >,
) {
  if (
    !group.me ||
    group.status === "cancelled" ||
    group.orderStatus === "cancelled" ||
    group.deliveryType !== "pickup"
  )
    return false;
  return group.payments.some(
    (payment) =>
      payment.status === "paid" &&
      (group.mode === "host" || payment.memberId === group.me?.id),
  );
}

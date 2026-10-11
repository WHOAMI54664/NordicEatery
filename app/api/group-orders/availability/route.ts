import {
  groupAvailability,
  newToken,
  tokenHash,
} from "@/lib/group-orders/store";
import {
  groupFailure,
  groupResponse,
  readReservationToken,
  setReservationCookie,
} from "@/lib/group-orders/http";
export const dynamic = "force-dynamic";
export async function GET() {
  if (process.env.GROUP_ORDERS_ENABLED !== "true")
    return groupResponse({ error: "unavailable" }, 503);
  try {
    const existing = await readReservationToken();
    const token = existing || newToken();
    const response = groupResponse(
      await groupAvailability(undefined, tokenHash(token)),
    );
    if (!existing) setReservationCookie(response, token);
    return response;
  } catch (error) {
    return groupFailure(error);
  }
}

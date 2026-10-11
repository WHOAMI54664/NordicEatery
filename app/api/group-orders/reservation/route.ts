import {
  groupDb,
  groupStorageError,
  tokenHash,
} from "@/lib/group-orders/store";
import { GroupError, UUID } from "@/lib/group-orders/model";
import {
  groupBody,
  groupResponse,
  groupFailure,
  readReservationToken,
} from "@/lib/group-orders/http";
import { isGroupAvailability } from "@/lib/group-orders/slots";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = rateLimit("group-reservation", request, 120, 60000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);
    if (process.env.GROUP_ORDERS_ENABLED !== "true")
      throw new GroupError("unavailable", 503);
    const body = await groupBody(request);
    const token = await readReservationToken();
    if (!token) throw new GroupError("reservationExpired", 409);
    if (body.action !== "release")
      throw new GroupError("reservationDisabled", 410);
    if (
      (body.reservationId != null &&
        (typeof body.reservationId !== "string" ||
          !UUID.test(body.reservationId))) ||
      (body.version != null &&
        (!Number.isSafeInteger(body.version) ||
          Number(body.version) < 1 ||
          Number(body.version) > 2147483647))
    )
      throw new GroupError("invalidInput");
    const db = groupDb();
    const identity = {
      p_token_hash: tokenHash(token),
      p_id: body.reservationId ?? null,
      p_version: body.version ?? null,
    };
    let result;
    if (!body.reservationId || !body.version)
      throw new GroupError("invalidInput");
    result = await db.rpc("release_group_seats", identity);
    if (result.error) throw groupStorageError(result.error);
    if (!isGroupAvailability(result.data))
      throw new GroupError("unavailable", 503);
    return groupResponse(result.data);
  } catch (error) {
    return groupFailure(error);
  }
}

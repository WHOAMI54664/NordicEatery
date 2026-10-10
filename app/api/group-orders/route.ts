import { newGroup, newToken, tokenHash } from "@/lib/group-orders/store";
import { publicGroup, GroupError } from "@/lib/group-orders/model";
import {
  groupBody,
  groupResponse,
  groupFailure,
  setMemberCookie,
  groupWorkerReady,
} from "@/lib/group-orders/http";
import { groupSiteUrl } from "@/lib/group-orders/payments";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const limit = rateLimit("group-create", request, 10, 60 * 60 * 1000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);
    if (process.env.GROUP_ORDERS_ENABLED !== "true")
      throw new GroupError("unavailable", 503);
    groupSiteUrl();
    const body = await groupBody(request);
    if (!(await groupWorkerReady())) throw new GroupError("unavailable", 503);
    const token = newToken();
    const row = await newGroup(body, token);
    const response = groupResponse(publicGroup(row, tokenHash(token)), 201);
    setMemberCookie(response, row.id, token);
    return response;
  } catch (error) {
    return groupFailure(error);
  }
}

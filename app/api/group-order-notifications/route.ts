import {
  groupBody,
  groupFailure,
  groupResponse,
  groupWorkerReady,
} from "@/lib/group-orders/http";
import { GroupError } from "@/lib/group-orders/model";
import { groupDb } from "@/lib/group-orders/store";
import { normalizeEmail, emailLocale } from "@/lib/notifications/opening-email";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
export async function POST(request: Request) {
  try {
    const limit = rateLimit("group-slot-email", request, 5, 10 * 60 * 1000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);
    const body = await groupBody(request);
    const email = normalizeEmail(body.email);
    if (!email) throw new GroupError("invalidInput");
    if (
      process.env.GROUP_ORDERS_ENABLED !== "true" ||
      !process.env.RESEND_API_KEY ||
      !process.env.RESEND_FROM_EMAIL ||
      !(await groupWorkerReady())
    )
      throw new GroupError("unavailable", 503);
    const { error } = await groupDb().rpc("subscribe_group_slot_email", {
      p_email: email,
      p_locale: emailLocale(body.locale),
    });
    if (error) throw new GroupError("unavailable", 503);
    return groupResponse({ success: true });
  } catch (error) {
    return groupFailure(error);
  }
}

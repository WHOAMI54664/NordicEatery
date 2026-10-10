import { groupFailure, groupResponse } from "@/lib/group-orders/http";
import { GroupError, UUID } from "@/lib/group-orders/model";
import { readGroup } from "@/lib/group-orders/store";
import { reconcileGroup } from "@/lib/group-orders/payments";
import { swishInstruction } from "@/lib/group-orders/swish";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const limit = rateLimit("group-swish-callback", request, 120, 60000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);
    const id = new URL(request.url).searchParams.get("groupId") || "";
    if (!UUID.test(id)) throw new GroupError("invalidInput");
    const text = await request.text();
    if (text.length > 10000) throw new GroupError("invalidInput", 413);
    const payload = JSON.parse(text);
    const row = await readGroup(id);
    if (
      row.state.paymentMethod !== "swish" ||
      !row.state.payments.some(
        (p) =>
          p.attemptedAt &&
          [swishInstruction(p.id), swishInstruction(p.id, true)].includes(
            payload?.id,
          ),
      )
    )
      throw new GroupError("invalidInput");
    // Callbacks only wake reconciliation. Only authenticated provider GETs can confirm money.
    await reconcileGroup(id);
    return groupResponse({ received: true });
  } catch (error) {
    return groupFailure(error);
  }
}

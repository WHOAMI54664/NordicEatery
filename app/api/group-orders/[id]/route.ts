import {
  actOnGroup,
  groupDb,
  readGroup,
  newToken,
  tokenHash,
} from "@/lib/group-orders/store";
import { publicGroup, GroupError } from "@/lib/group-orders/model";
import {
  groupBody,
  groupResponse,
  groupFailure,
  memberHash,
  setMemberCookie,
} from "@/lib/group-orders/http";
import { reconcileGroup, startGroupPayment } from "@/lib/group-orders/payments";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const limit = rateLimit("group-read", request, 600, 60000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);
    const { id } = await context.params;
    const row = await readGroup(id);
    const result = publicGroup(row, await memberHash(id));
    if (result.me && row.state.status === "submitted") {
      const { data, error } = await groupDb()
        .from("orders")
        .select("status, display_order_number")
        .eq("group_order_id", id)
        .maybeSingle();
      if (error) throw new GroupError("unavailable", 503);
      return groupResponse({
        ...result,
        orderStatus: data?.status,
        displayOrderNumber: data?.display_order_number,
      });
    }
    return groupResponse(result);
  } catch (error) {
    return groupFailure(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const limit = rateLimit("group-write", request, 100, 60000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);
    const { id } = await context.params;
    const body = await groupBody(request);
    let hash = await memberHash(id);
    const token = !hash && body.action === "join" ? newToken() : null;
    if (token) hash = tokenHash(token);
    if (!hash) throw new GroupError("unauthorized", 401);
    if (body.action === "pay")
      return groupResponse(
        await startGroupPayment(id, hash, undefined, body.phone, {
          amount: body.amount,
          method: body.method,
        }),
      );
    const row = await actOnGroup(id, hash, body);
    // A durable cancelled state is committed before contacting Stripe.
    // The worker retries refunds even if this request disconnects or times out.
    if (body.action === "cancel" || body.action === "lock")
      await reconcileGroup(id);
    const response = groupResponse(
      publicGroup(
        body.action === "cancel" || body.action === "lock"
          ? await readGroup(id)
          : row,
        hash,
      ),
    );
    if (token) setMemberCookie(response, id, token);
    return response;
  } catch (error) {
    return groupFailure(error);
  }
}

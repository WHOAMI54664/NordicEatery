import { groupDb, readGroup } from "@/lib/group-orders/store";
import { reconcileGroup } from "@/lib/group-orders/payments";
import {
  groupResponse,
  groupFailure,
  validWorkerSecret,
} from "@/lib/group-orders/http";
import { GroupError } from "@/lib/group-orders/model";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    if (!(await validWorkerSecret(request)))
      return groupResponse({ error: "unauthorized" }, 401);
    const db = groupDb();
    const { data, error } = await db
      .from("group_orders")
      .select("id")
      .in("status", ["open", "locked", "paying", "cancelled"])
      .lte("next_check_at", new Date().toISOString())
      .order("next_check_at")
      .limit(10);
    if (error) throw new GroupError("unavailable", 503);
    let failed = 0;
    const started = Date.now();
    let processed = 0;
    for (const { id } of data || []) {
      if (Date.now() - started > 35000) break;
      try {
        await reconcileGroup(id);
        const row = await readGroup(id);
        const settled =
          row.state.status === "cancelled" &&
          row.state.payments.every(
            (payment) =>
              ["refunded", "expired", "pay_on_site"].includes(payment.status) ||
              (!payment.attemptedAt && payment.status === "pending"),
          );
        const next = new Date(
          Date.now() + (settled ? 86400000 : 60000),
        ).toISOString();
        await db
          .from("group_orders")
          .update({ next_check_at: next })
          .eq("id", id)
          .eq("version", row.version)
          .throwOnError();
      } catch (error) {
        failed++;
        console.error("Group order reconciliation failed", {
          groupId: id,
          code: error instanceof GroupError ? error.code : "dependencyFailure",
        });
        await db
          .from("group_orders")
          .update({ next_check_at: new Date(Date.now() + 60000).toISOString() })
          .eq("id", id)
          .throwOnError();
      }
      processed++;
    }
    return groupResponse({ processed, failed }, failed ? 503 : 200);
  } catch (error) {
    return groupFailure(error);
  }
}

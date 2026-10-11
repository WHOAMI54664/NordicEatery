import { requireRole } from "@/lib/auth/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  groupBody,
  groupFailure,
  groupResponse,
} from "@/lib/group-orders/http";
import { GroupError } from "@/lib/group-orders/model";
import { parseScheduleSlots } from "@/lib/group-orders/schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await requireRole(["owner", "admin"]);
    if (!access.ok) return groupResponse({ error: "forbidden" }, access.status);
    const { data, error } = await createAdminClient({ timeoutMs: 10000 }).rpc(
      "get_group_slot_schedule",
    );
    if (error || !data) throw new GroupError("unavailable", 503);
    return groupResponse(data);
  } catch (error) {
    return groupFailure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const access = await requireRole(["owner", "admin"]);
    if (!access.ok) return groupResponse({ error: "forbidden" }, access.status);
    const body = await groupBody(request);
    const slots = parseScheduleSlots(body.slots);
    if (
      !slots ||
      !Number.isSafeInteger(body.version) ||
      Number(body.version) < 1 ||
      Number(body.version) >= 2147483647
    )
      throw new GroupError("invalidSchedule");
    const { data, error } = await createAdminClient({ timeoutMs: 10000 }).rpc(
      "save_group_slot_schedule",
      {
        p_version: body.version,
        p_slots: slots,
        p_actor: access.userId,
      },
    );
    if (error?.message === "scheduleConflict")
      throw new GroupError("scheduleConflict", 409);
    if (error?.code === "42501") throw new GroupError("forbidden", 403);
    if (error?.message === "invalidSchedule")
      throw new GroupError("invalidSchedule");
    if (error || !data) throw new GroupError("unavailable", 503);
    return groupResponse(data);
  } catch (error) {
    return groupFailure(error);
  }
}

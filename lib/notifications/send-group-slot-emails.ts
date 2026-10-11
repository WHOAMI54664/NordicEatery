import { groupAvailability } from "@/lib/group-orders/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { groupSiteUrl } from "@/lib/group-orders/payments";
import { groupSlotMessage } from "./group-slot-email";

export async function sendGroupSlotEmails() {
  if (process.env.GROUP_ORDERS_ENABLED !== "true") return { accepted: 0 };
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) throw new Error("Group notification sender unavailable");
  const db = createAdminClient({ timeoutMs: 2000 });
  const started = Date.now();
  let accepted = 0;
  // Leave the rest of the worker's duration for payment reconciliation.
  for (let count = 0; count < 5 && Date.now() - started < 8000; count++) {
    const { data, error } = await db.rpc("claim_group_slot_email");
    if (error) throw new Error("Group notification claim failed");
    const job = data?.[0];
    if (!job) break;
    const { data: current, error: readError } = await db
      .from("group_slot_notifications")
      .select("status")
      .eq("id", job.id)
      .single();
    if (readError) throw new Error("Group notification state unavailable");
    if (current.status !== "sending") continue;
    if (!(await groupAvailability(db)).slots.some((slot) => slot.available))
      break;
    // Bounded provider call. The queue UUID makes ambiguous retries idempotent.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `group-slot-${job.id}`,
      },
      body: JSON.stringify({
        from,
        to: [job.email],
        ...groupSlotMessage(job.locale, job.unsubscribe_token, groupSiteUrl()),
      }),
    });
    if (!response.ok)
      throw new Error("Group notification provider rejected request");
    const result = await response.json();
    if (typeof result.id !== "string" || !result.id)
      throw new Error("Group notification provider response invalid");
    const { error: saveError } = await db
      .from("group_slot_notifications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("status", "sending");
    if (saveError) throw new Error("Group notification receipt save failed");
    accepted++;
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return { accepted };
}

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { openingMessage } from "./opening-email";

export async function sendOpeningEmails() {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) throw new Error("Opening email sender is not configured");
  const db = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await db.rpc("claim_opening_emails");
  if (error) throw new Error("Could not claim opening emails");
  let accepted = 0;
  for (const row of data || []) {
    // Recheck cancellation and kitchen state immediately before sending.
    const { data: job, error: jobError } = await db.from("opening_email_queue").select("status").eq("id", row.id).single();
    const { data: shift, error: shiftError } = await db.from("restaurant_shift_state").select("is_open").eq("id", 1).single();
    if (jobError || shiftError) throw new Error("Could not verify opening email state");
    if (!shift?.is_open) break;
    if (job?.status !== "sending") continue;
    const result = await resend.emails.send({ from, to: row.email, ...openingMessage(row.locale, row.unsubscribe_token) },
      { idempotencyKey: `opening-${row.id}` });
    if (result.error) throw new Error("Opening email provider rejected request; queued for retry");
    const { error: saveError } = await db.from("opening_email_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id).eq("status", "sending");
    if (saveError) throw new Error("Could not record opening email acceptance");
    accepted++;
    // Stay below the default Resend rate of two requests per second.
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return { accepted };
}

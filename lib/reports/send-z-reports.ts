import { createAdminClient } from "../supabase/admin";
import { generateZReportPdf } from "./z-report-pdf";
import { zDate, zReportFilename, type ZReport } from "./z-report";

export async function deliverZReport(
  report: ZReport & { email: string },
  config: { apiKey: string; from: string },
  request: typeof fetch = fetch,
) {
  const pdf = await generateZReportPdf(report);
  const response = await request("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `shift-z-report-${report.id}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [report.email],
      subject: `Z-Rapport ${report.id} - ${zDate(report.closed_at, true)} - ${report.snapshot.company.name}`,
      text: `Hej!\n\nSkiftet är stängt. Z-rapport ${report.id} finns som bifogad PDF.\n\nFrån: ${zDate(report.opened_at)}\nTill: ${zDate(report.closed_at)}\n\n${report.snapshot.company.name}`,
      attachments: [
        {
          filename: zReportFilename(report.id),
          content: pdf.toString("base64"),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error("Z-report email rejected");
  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("id" in result) ||
    typeof result.id !== "string" ||
    !result.id
  )
    throw new Error("Z-report email acknowledgement missing");
  return result.id;
}

export async function sendZReportEmail() {
  const from = process.env.RESEND_FROM_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!from || !apiKey) throw new Error("Z-report sender is not configured");
  const db = createAdminClient({ timeoutMs: 10000 });
  const { data, error } = await db.rpc("claim_shift_z_report");
  if (error) throw new Error("Could not claim Z-report");
  const report = data?.[0] as
    (ZReport & { email: string; attempts: number }) | undefined;
  if (!report) return { accepted: 0 };
  // One report per invocation keeps PDF generation + provider/DB calls within 60 seconds.
  const providerId = await deliverZReport(report, { from, apiKey });
  const { data: saved, error: saveError } = await db
    .from("shift_z_reports")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_id: providerId,
      lease_until: null,
    })
    .eq("id", report.id)
    .eq("status", "sending")
    .eq("attempts", report.attempts)
    .select("id")
    .maybeSingle();
  if (saveError || !saved)
    throw new Error("Could not record Z-report delivery");
  return { accepted: 1 };
}

import { NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { emailLocale, normalizeEmail } from "@/lib/notifications/opening-email";
import { sendOpeningEmails } from "@/lib/notifications/send-opening-emails";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const limit = rateLimit("opening-email", request, 5, 10 * 60 * 1000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const email = normalizeEmail(body?.email);
  if (!email) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
    return NextResponse.json({ error: "Email notifications are temporarily unavailable" }, { status: 503 });
  try {
    const { error } = await createAdminClient().rpc("subscribe_opening_email", {
      p_email: email, p_locale: emailLocale(body.locale), p_marketing: body.marketingConsent === true,
    });
    if (error) throw new Error("Subscription storage unavailable");
    // Covers a visitor submitting a form just after the kitchen has opened.
    after(async () => { try { await sendOpeningEmails(); } catch { console.error("Opening email processing needs retry"); } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not save notification request" }, { status: 503 });
  }
}

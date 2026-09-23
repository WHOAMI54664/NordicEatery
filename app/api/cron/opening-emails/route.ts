import { NextResponse } from "next/server";
import { sendOpeningEmails } from "@/lib/notifications/send-opening-emails";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await sendOpeningEmails()); }
  catch { return NextResponse.json({ error: "Opening email processing failed" }, { status: 503 }); }
}

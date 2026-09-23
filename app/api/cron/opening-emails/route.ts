import { NextResponse } from "next/server";
import { sendOpeningEmails } from "@/lib/notifications/send-opening-emails";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data: authorized, error } = await createAdminClient().rpc("authorize_opening_email_worker", { p_token: token });
    if (error || authorized !== true) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(await sendOpeningEmails());
  }
  catch { return NextResponse.json({ error: "Opening email processing failed" }, { status: 503 }); }
}

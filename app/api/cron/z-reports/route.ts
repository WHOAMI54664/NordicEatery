import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendZReportEmail } from "@/lib/reports/send-z-reports";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data, error } = await createAdminClient({ timeoutMs: 10000 }).rpc(
      "authorize_z_report_worker",
      { p_token: token },
    );
    if (error || data !== true)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(await sendZReportEmail());
  } catch {
    console.error("Z-report delivery needs retry");
    return NextResponse.json(
      { error: "Z-report processing failed" },
      { status: 503 },
    );
  }
}

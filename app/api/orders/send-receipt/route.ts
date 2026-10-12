import { NextResponse } from "next/server";
import {
  loadOrderReceipt,
  sendReceiptEmail,
  ReceiptError,
} from "@/lib/orders/receipt-service";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const limit = rateLimit("send-receipt", request, 5, 10 * 60000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);
  try {
    const text = await request.text();
    if (text.length > 2000) throw new ReceiptError(413, "invalidInput");
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new ReceiptError(400, "invalidInput");
    }
    if (!body || typeof body.orderNumber !== "string")
      throw new ReceiptError(400, "invalidInput");
    const order = await loadOrderReceipt(body.orderNumber, body.sessionId);
    await sendReceiptEmail(order, body.email);
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof ReceiptError ? error.code : "unavailable" },
      {
        status: error instanceof ReceiptError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

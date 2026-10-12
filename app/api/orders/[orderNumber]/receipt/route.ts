import { NextResponse } from "next/server";
import { generateReceiptPdf, receiptFilename } from "@/lib/orders/receipt-pdf";
import { loadOrderReceipt, ReceiptError } from "@/lib/orders/receipt-service";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const limit = rateLimit("receipt-download", request, 30, 60000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);
  try {
    const { orderNumber } = await context.params;
    const order = await loadOrderReceipt(
      orderNumber,
      new URL(request.url).searchParams.get("session_id"),
    );
    return new NextResponse(new Uint8Array(await generateReceiptPdf(order)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${receiptFilename(order)}"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
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

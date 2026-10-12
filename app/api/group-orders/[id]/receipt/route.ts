import { NextResponse } from "next/server";
import {
  memberHash,
  groupBody,
  groupFailure,
  groupResponse,
} from "@/lib/group-orders/http";
import { loadGroupReceipt } from "@/lib/group-orders/receipt";
import { generateReceiptPdf, receiptFilename } from "@/lib/orders/receipt-pdf";
import { ReceiptError, sendReceiptEmail } from "@/lib/orders/receipt-service";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
function failure(error: unknown) {
  return error instanceof ReceiptError
    ? groupResponse({ error: error.code }, error.status)
    : groupFailure(error);
}
export async function GET(request: Request, context: Context) {
  const limit = rateLimit("group-receipt", request, 30, 60000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);
  try {
    const { id } = await context.params;
    const order = await loadGroupReceipt(id, await memberHash(id));
    return new NextResponse(new Uint8Array(await generateReceiptPdf(order)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${receiptFilename(order)}"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request, context: Context) {
  const limit = rateLimit("group-receipt-email", request, 5, 10 * 60000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);
  try {
    const body = await groupBody(request);
    const { id } = await context.params;
    const order = await loadGroupReceipt(id, await memberHash(id));
    await sendReceiptEmail(order, body.email);
    return groupResponse({ success: true });
  } catch (error) {
    return failure(error);
  }
}

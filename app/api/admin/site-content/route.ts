import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/api-guard";
import {
  ContentInputError,
  parseContentInput,
  validateCopyInput,
} from "@/lib/site-content/validation";

function response(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(req: Request) {
  try {
    const guard = await requireRole(["owner", "admin"]);
    if (!guard.ok) return response({ error: guard.error }, guard.status);
    const origin = req.headers.get("origin");
    const canonical = new URL(process.env.NEXT_PUBLIC_SITE_URL || req.url)
      .origin;
    if (
      origin !== canonical ||
      !req.headers.get("content-type")?.startsWith("application/json")
    )
      return response({ error: "forbidden" }, 403);
    // Bound the stream as well as Content-Length; neither chunked bodies nor
    // multi-byte copy should bypass the limit.
    const reader = req.body?.getReader();
    if (!reader) return response({ error: "invalidInput" }, 400);
    const parts: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 40000) {
          await reader.cancel();
          return response({ error: "invalidInput" }, 413);
        }
        parts.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(parts).toString("utf8"));
    } catch {
      return response({ error: "invalidInput" }, 400);
    }
    const input = parseContentInput(body);
    const messages = {
      ...(await import(`@/messages/${input.locale}.json`)).default,
      groupOrder: (await import(`@/messages/group-orders/${input.locale}.json`))
        .default,
    };
    validateCopyInput(input, messages);
    const db = createAdminClient({ timeoutMs: 8000 });
    const { error } = await db
      .from("site_content")
      .upsert(
        { ...input, updated_at: new Date().toISOString() },
        { onConflict: "key,locale" },
      );
    if (error) throw error;
    if (input.key.startsWith("menu.categories.")) {
      revalidatePath(`/${input.locale}`, "layout");
    }
    return response({ success: true });
  } catch (error) {
    if (error instanceof ContentInputError)
      return response({ error: error.message }, 400);
    console.error("Site content save failed", {
      kind: error instanceof Error ? error.name : "database",
    });
    return response({ error: "unavailable" }, 503);
  }
}

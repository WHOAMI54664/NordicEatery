import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCategoryDeletion } from "@/lib/menu-category-deletion";
import { getPublicPath } from "@/i18n/paths";
export async function DELETE(request: Request) {
  const response = (body: object, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  try {
    const guard = await requireRole(["owner", "admin"]);
    if (!guard.ok) return response({ error: guard.error }, guard.status);
    const origin = request.headers.get("origin");
    const allowed = [
      new URL(request.url).origin,
      new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin,
    ];
    if (
      !origin ||
      !allowed.includes(origin) ||
      !request.headers.get("content-type")?.startsWith("application/json")
    )
      return response({ error: "forbidden" }, 403);
    const reader = request.body?.getReader();
    if (!reader) return response({ error: "invalidInput" }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 4096) {
          await reader.cancel();
          return response({ error: "invalidInput" }, 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let input;
    try {
      input = parseCategoryDeletion(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      );
    } catch {
      return response({ error: "invalidInput" }, 400);
    }
    const { data, error } = await createAdminClient({ timeoutMs: 10000 }).rpc(
      "delete_menu_category",
      { p_source: input.source, p_target: input.target },
    );
    if (error) {
      const known = [
        "invalidInput",
        "categoryNotFound",
        "invalidTarget",
        "targetRequired",
      ];
      if (known.includes(error.message))
        return response({ error: error.message }, 409);
      throw new Error("Category deletion failed");
    }
    for (const locale of ["sv", "en", "pl", "ru"]) {
      revalidatePath("/" + locale, "layout");
      revalidatePath(getPublicPath(locale, "/menu"));
    }
    return response({ success: true, moved: data });
  } catch {
    console.error("Category deletion failed");
    return response({ error: "unavailable" }, 503);
  }
}

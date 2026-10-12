import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/api-guard";
import {
  getMenuCategoryIds,
  MENU_CATEGORY_ORDER_KEY,
  MENU_CATEGORY_ORDER_LOCALE,
} from "@/lib/menu-display";

const locales = ["sv", "en", "pl", "ru"] as const;
const categoryIdPattern = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,63}$/u;

function response(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function readJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid-body");
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        throw new Error("body-too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function parseOrder(body: unknown): string[] | null {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !Array.isArray((body as { order?: unknown }).order)
  ) {
    return null;
  }
  const order = (body as { order: unknown[] }).order;
  if (order.length > 200) return null;

  const seen = new Set<string>();
  for (const id of order) {
    if (typeof id !== "string" || !categoryIdPattern.test(id) || seen.has(id)) {
      return null;
    }
    seen.add(id);
  }
  return order as string[];
}

export async function POST(request: Request) {
  try {
    const guard = await requireRole(["owner", "admin"]);
    if (!guard.ok) return response({ error: guard.error }, guard.status);

    const origin = request.headers.get("origin");
    const canonical = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url)
      .origin;
    if (
      origin !== canonical ||
      !request.headers.get("content-type")?.startsWith("application/json")
    ) {
      return response({ error: "forbidden" }, 403);
    }

    let order: string[] | null;
    try {
      order = parseOrder(await readJson(request));
    } catch (error) {
      return response(
        { error: "invalidInput" },
        error instanceof Error && error.message === "body-too-large"
          ? 413
          : 400,
      );
    }
    if (!order) return response({ error: "invalidInput" }, 400);

    const db = createAdminClient({ timeoutMs: 8000 });
    const { data: products, error: productsError } = await db
      .from("products")
      .select("category")
      .eq("is_available", true)
      .or("track_stock.eq.false,stock_quantity.gt.0")
      .limit(1000);
    if (productsError) throw productsError;

    const availableIds = getMenuCategoryIds(products || []);
    if (
      order.length !== availableIds.length ||
      availableIds.some((id) => !order.includes(id))
    ) {
      return response({ error: "staleCategoryList" }, 409);
    }

    const { error } = await db.from("site_content").upsert(
      {
        key: MENU_CATEGORY_ORDER_KEY,
        value: JSON.stringify(order),
        page: "menu",
        locale: MENU_CATEGORY_ORDER_LOCALE,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key,locale" },
    );
    if (error) throw error;

    for (const locale of locales) {
      revalidatePath("/" + locale, "page");
      revalidatePath("/" + locale + "/menu", "page");
    }

    return response({ success: true });
  } catch (error) {
    console.error("Menu category order save failed", {
      kind: error instanceof Error ? error.name : "database",
    });
    return response({ error: "unavailable" }, 503);
  }
}

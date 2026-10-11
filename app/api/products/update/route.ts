import {
    normalizeProductSubtitle,
    productDescriptionTranslations,
    validateProductInput,
} from "@/lib/products-input";
import { MenuValidationError } from "@/lib/menu-options";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/api-guard";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
    try {
        const guard = await requireRole(["owner", "admin"]);

        if (!guard.ok) {
            return NextResponse.json(
                { error: guard.error },
                { status: guard.status },
            );
        }

        const body = await request.json();
        if (!body || typeof body !== "object" || Array.isArray(body))
            throw new MenuValidationError("Invalid product");
        const modifierGroups = validateProductInput(body);
        const subtitle = normalizeProductSubtitle(body.subtitle);
        const clearingSubtitle = body.subtitle !== undefined && subtitle === "";

        const {
            id,
            name,
            description,
            price,
            category,
            menu_type = "standard",
            image_url,
            badge,
            is_available = true,
            is_popular = false,
            track_stock = false,
            stock_quantity = 0,
            sort_order = 0,

            name_sv,
            name_pl,
            name_ru,

            subtitle_sv,
            subtitle_pl,
            subtitle_ru,

        } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Missing product id" },
                { status: 400 },
            );
        }

        if (
            !name ||
            !description ||
            price === undefined ||
            price === null ||
            !category
        ) {
            return NextResponse.json(
                { error: "Missing required product fields" },
                { status: 400 },
            );
        }

        const supabase = createAdminClient();
        const { data: previous, error: readError } = await supabase
            .from("products")
            .select("description, description_sv, description_pl, description_ru")
            .eq("id", id)
            .maybeSingle();
        if (readError) throw readError;
        if (!previous)
            return NextResponse.json({ error: "Product not found" }, { status: 404 });

        const updatePayload = {
            ...(body.modifier_groups !== undefined
                ? { modifier_groups: modifierGroups }
                : {}),
            name,
            subtitle,
            description,
            price: Number(price),
            category,
            menu_type: menu_type || "standard",
            image_url: image_url || null,
            badge: badge || null,

            is_available: Boolean(is_available),
            is_popular: Boolean(is_popular),

            track_stock: Boolean(track_stock),
            stock_quantity: Boolean(track_stock)
                ? Math.max(0, Number(stock_quantity) || 0)
                : 0,

            sort_order: Number(sort_order || 0),

            ...(name_sv !== undefined ? { name_sv: name_sv || name } : {}),
            ...(name_pl !== undefined ? { name_pl: name_pl || name } : {}),
            ...(name_ru !== undefined ? { name_ru: name_ru || name } : {}),

            ...(clearingSubtitle || subtitle_sv !== undefined
                ? {
                    subtitle_sv: clearingSubtitle
                        ? null
                        : subtitle_sv || subtitle || null,
                }
                : {}),
            ...(clearingSubtitle || subtitle_pl !== undefined
                ? {
                    subtitle_pl: clearingSubtitle
                        ? null
                        : subtitle_pl || subtitle || null,
                }
                : {}),
            ...(clearingSubtitle || subtitle_ru !== undefined
                ? {
                    subtitle_ru: clearingSubtitle
                        ? null
                        : subtitle_ru || subtitle || null,
                }
                : {}),

            ...productDescriptionTranslations(body, previous),

            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from("products")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Product update error:", error);

            return NextResponse.json(
                {
                    error: "Failed to update product",
                },
                { status: 500 },
            );
        }

        revalidatePath("/[locale]/menu", "page");
        revalidatePath("/[locale]", "page");
        revalidatePath("/[locale]/group-order/[id]", "page");
        return NextResponse.json({ product: data });
    } catch (error: unknown) {
        if (
            error instanceof MenuValidationError ||
            error instanceof SyntaxError
        )
            return NextResponse.json(
                {
                    error:
                        error instanceof SyntaxError
                            ? "Invalid JSON"
                            : error.message,
                },
                { status: 400 },
            );
        console.error("Update product API error:", error);

        return NextResponse.json(
            {
                error: "Something went wrong",
            },
            { status: 500 },
        );
    }
}

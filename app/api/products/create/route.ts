import {
    normalizeProductSubtitle,
    validateProductInput,
} from "@/lib/products-input";
import { MenuValidationError } from "@/lib/menu-options";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/api-guard";

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

        const {
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
        } = body;

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

        const { data, error } = await supabase
            .from("products")
            .insert({
                id: randomUUID(),
                modifier_groups: modifierGroups,

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
                stock_quantity: Number(stock_quantity || 0),
                sort_order: Number(sort_order || 0),

                name_sv: name,
                name_pl: name,
                name_ru: name,

                subtitle_sv: subtitle || null,
                subtitle_pl: subtitle || null,
                subtitle_ru: subtitle || null,

                description_sv: description,
                description_pl: description,
                description_ru: description,
            })
            .select()
            .single();

        if (error) {
            console.error("Product create error:", error);

            return NextResponse.json(
                {
                    error: "Failed to create product",
                },
                { status: 500 },
            );
        }

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
        console.error("Create product API error:", error);

        return NextResponse.json(
            {
                error: "Something went wrong",
            },
            { status: 500 },
        );
    }
}

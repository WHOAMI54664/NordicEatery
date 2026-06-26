import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/api-guard";

export async function POST(request: Request) {
    try {
        const guard = await requireRole(["owner", "admin"]);

        if (!guard.ok) {
            return NextResponse.json(
                { error: guard.error },
                { status: guard.status }
            );
        }

        const body = await request.json();

        const {
            id,
            name,
            subtitle,
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

            description_sv,
            description_pl,
            description_ru,
        } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Missing product id" },
                { status: 400 }
            );
        }

        if (!name || !description || price === undefined || price === null || !category) {
            return NextResponse.json(
                { error: "Missing required product fields" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const updatePayload = {
            name,
            subtitle: subtitle || null,
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

            name_sv: name_sv || name,
            name_pl: name_pl || name,
            name_ru: name_ru || name,

            subtitle_sv: subtitle_sv || subtitle || null,
            subtitle_pl: subtitle_pl || subtitle || null,
            subtitle_ru: subtitle_ru || subtitle || null,

            description_sv: description_sv || description,
            description_pl: description_pl || description,
            description_ru: description_ru || description,

            updated_at: new Date().toISOString(),
        };

        console.log("PRODUCT UPDATE ID:", id);
        console.log("PRODUCT UPDATE PAYLOAD:", updatePayload);

        const { data, error } = await supabase
            .from("products")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single();

        console.log("PRODUCT UPDATE RESPONSE:", { data, error });

        if (error) {
            console.error("Product update error:", error);

            return NextResponse.json(
                {
                    error: "Failed to update product",
                    details: error.message,
                    code: error.code,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ product: data });
    } catch (error: any) {
        console.error("Update product API error:", error);

        return NextResponse.json(
            {
                error: "Something went wrong",
                details: error?.message || String(error),
            },
            { status: 500 }
        );
    }
}
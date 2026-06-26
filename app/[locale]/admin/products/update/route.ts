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
        } = body;

        if (!id || !name || price === undefined || price === null || !category) {
            return NextResponse.json(
                { error: "Missing required product fields" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("products")
            .update({
                name,
                subtitle: subtitle || null,
                description: description || null,
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

                description_sv: description || null,
                description_pl: description || null,
                description_ru: description || null,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { error: "Failed to update product", details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ product: data });
    } catch (error: any) {
        return NextResponse.json(
            { error: "Something went wrong", details: error?.message },
            { status: 500 }
        );
    }
}

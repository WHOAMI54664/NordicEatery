import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import * as deepl from "deepl-node";
import { createAdminClient } from "@/lib/supabase/admin";

async function translateText(
    translator: deepl.Translator,
    text: string | null | undefined,
    target: deepl.TargetLanguageCode
) {
    if (!text || !text.trim()) return null;

    try {
        const result = await translator.translateText(text, "EN", target);
        return Array.isArray(result) ? result[0].text : result.text;
    } catch (error: any) {
        const message = String(error?.message || error || "").toLowerCase();

        if (
            error?.statusCode === 456 ||
            error?.status_code === 456 ||
            message.includes("quota") ||
            message.includes("billing period") ||
            message.includes("exceeded")
        ) {
            console.error("DeepL quota exceeded. Returning original text.");
            return text;
        }

        console.error(`DeepL translation failed for ${target}. Returning original text.`, error);
        return text;
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            name,
            subtitle,
            description,
            price,
            category,
            image_url,
            badge,
            is_available = true,
            is_popular = false,
            track_stock = false,
            stock_quantity = 0,
            sort_order = 0,
        } = body;

        if (!name || !description || !price || !category) {
            return NextResponse.json(
                { error: "Missing required product fields" },
                { status: 400 }
            );
        }

        const deeplApiKey = process.env.DEEPL_API_KEY;
        const translator = deeplApiKey ? new deepl.Translator(deeplApiKey) : null;

        let name_sv = name;
        let name_pl = name;
        let name_ru = name;

        let subtitle_sv = subtitle || null;
        let subtitle_pl = subtitle || null;
        let subtitle_ru = subtitle || null;

        let description_sv = description;
        let description_pl = description;
        let description_ru = description;

        if (translator) {
            [
                name_sv,
                name_pl,
                name_ru,
                subtitle_sv,
                subtitle_pl,
                subtitle_ru,
                description_sv,
                description_pl,
                description_ru,
            ] = await Promise.all([
                translateText(translator, name, "SV"),
                translateText(translator, name, "PL"),
                translateText(translator, name, "RU"),

                translateText(translator, subtitle, "SV"),
                translateText(translator, subtitle, "PL"),
                translateText(translator, subtitle, "RU"),

                translateText(translator, description, "SV"),
                translateText(translator, description, "PL"),
                translateText(translator, description, "RU"),
            ]);
        } else {
            console.warn("DEEPL_API_KEY is missing. Product will be saved without translations.");
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("products")
            .insert({
                id: randomUUID(),

                name,
                subtitle: subtitle || null,
                description,
                price: Number(price),
                category,
                image_url: image_url || null,
                badge: badge || null,

                is_available: Boolean(is_available),
                is_popular: Boolean(is_popular),
                track_stock: Boolean(track_stock),
                stock_quantity: Number(stock_quantity || 0),
                sort_order: Number(sort_order || 0),

                name_sv,
                name_pl,
                name_ru,

                subtitle_sv,
                subtitle_pl,
                subtitle_ru,

                description_sv,
                description_pl,
                description_ru,
            })
            .select()
            .single();

        if (error) {
            console.error("Product create error:", error);

            return NextResponse.json(
                {
                    error: "Failed to create product",
                    details: error.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ product: data });
    } catch (error: any) {
        console.error("Create product API error:", error);

        return NextResponse.json(
            {
                error: "Something went wrong",
                details: error?.message || String(error),
            },
            { status: 500 }
        );
    }
}
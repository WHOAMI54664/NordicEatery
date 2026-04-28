import { NextResponse } from "next/server";
import * as deepl from "deepl-node";
import { createAdminClient } from "@/lib/supabase/admin";

async function translateText(
  translator: deepl.Translator,
  text: string | null | undefined,
  target: deepl.TargetLanguageCode
) {
  if (!text || !text.trim()) return null;

  const result = await translator.translateText(text, "EN", target);
  return Array.isArray(result) ? result[0].text : result.text;
}

export async function POST(request: Request) {
  try {
    const deeplApiKey = process.env.DEEPL_API_KEY;

    if (!deeplApiKey) {
      return NextResponse.json(
        { error: "Missing DEEPL_API_KEY" },
        { status: 500 }
      );
    }

    const translator = new deepl.Translator(deeplApiKey);

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

    const [
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

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        subtitle,
        description,
        price: Number(price),
        category,
        image_url: image_url || null,
        badge: badge || null,

        is_available,
        is_popular,
        track_stock,
        stock_quantity: Number(stock_quantity),
        sort_order: Number(sort_order),

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
        { error: "Failed to create product" },
        { status: 500 }
      );
    }

    return NextResponse.json({ product: data });
  } catch (error) {
    console.error("Create product API error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
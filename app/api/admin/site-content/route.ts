import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
    try {
        const supabase = createAdminClient();
        const body = await req.json();

        const { key, value, locale, page } = body;

        if (!key || !value || !locale || !page) {
            return NextResponse.json(
                { error: "Missing fields" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("site_content")
            .upsert(
                {
                    key,
                    value,
                    locale,
                    page,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: "key,locale",
                }
            );

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}
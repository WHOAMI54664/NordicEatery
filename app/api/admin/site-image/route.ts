import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "owner") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const formData = await request.formData();

        const file = formData.get("file") as File | null;
        const key = String(formData.get("key") || "");
        const locale = String(formData.get("locale") || "");
        const page = String(formData.get("page") || "");

        if (!file || !key || !locale || !page) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const admin = createAdminClient();

        const extension = file.name.split(".").pop() || "jpg";
        const filePath = `${page}/${key}-${locale}-${Date.now()}.${extension}`;

        const { error: uploadError } = await admin.storage
            .from("site-images")
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type,
            });

        if (uploadError) {
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        const { data: publicUrlData } = admin.storage
            .from("site-images")
            .getPublicUrl(filePath);

        const url = publicUrlData.publicUrl;

        const { error: dbError } = await admin.from("site_content").upsert(
            {
                key,
                locale,
                page,
                value: url,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: "key,locale",
            }
        );

        if (dbError) {
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({ url });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function sanitizePathPart(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_./]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-/]+|[-/]+$/g, "");
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 403 });
        }

        const canEdit = profile.role === "owner" || profile.role === "admin";

        if (!canEdit) {
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

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Only JPG, PNG and WebP images are allowed" },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Image is too large. Maximum size is 2 MB" },
                { status: 400 }
            );
        }

        const admin = createAdminClient();

        const extension =
            file.type === "image/png"
                ? "png"
                : file.type === "image/webp"
                    ? "webp"
                    : "jpg";

        const safePage = sanitizePathPart(page);
        const safeKey = sanitizePathPart(key);
        const safeLocale = sanitizePathPart(locale);

        const filePath = `${safePage}/${safeKey}-${safeLocale}-${Date.now()}.${extension}`;

        const { error: uploadError } = await admin.storage
            .from("site-images")
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type,
                cacheControl: "3600",
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
                section: "images",
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
    } catch (error) {
        console.error("site-image upload error:", error);

        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
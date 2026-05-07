import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function checkAccess() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { allowed: false, error: "Unauthorized", status: 401 };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const allowed = profile?.role === "owner" || profile?.role === "admin";

    if (!allowed) {
        return { allowed: false, error: "Forbidden", status: 403 };
    }

    return { allowed: true };
}

export async function POST(request: Request) {
    try {
        const access = await checkAccess();

        if (!access.allowed) {
            return NextResponse.json(
                { error: access.error },
                { status: access.status }
            );
        }

        const body = await request.json();

        const page = String(body.page || "");
        const locale = String(body.locale || "");
        const title = String(body.title || "");
        const blockBody = String(body.body || "");
        const sortOrder = Number(body.sort_order || 0);

        if (!page || !locale) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const admin = createAdminClient();

        const { data, error } = await admin
            .from("site_blocks")
            .insert({
                page,
                locale,
                title,
                body: blockBody,
                sort_order: sortOrder,
            })
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ block: data });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const access = await checkAccess();

        if (!access.allowed) {
            return NextResponse.json(
                { error: access.error },
                { status: access.status }
            );
        }

        const body = await request.json();

        const id = String(body.id || "");
        const title = String(body.title || "");
        const blockBody = String(body.body || "");
        const sortOrder = Number(body.sort_order || 0);

        if (!id) {
            return NextResponse.json({ error: "Missing block id" }, { status: 400 });
        }

        const admin = createAdminClient();

        const { data, error } = await admin
            .from("site_blocks")
            .update({
                title,
                body: blockBody,
                sort_order: sortOrder,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ block: data });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const access = await checkAccess();

        if (!access.allowed) {
            return NextResponse.json(
                { error: access.error },
                { status: access.status }
            );
        }

        const body = await request.json();

        const id = String(body.id || "");

        if (!id) {
            return NextResponse.json({ error: "Missing block id" }, { status: 400 });
        }

        const admin = createAdminClient();

        const { error } = await admin.from("site_blocks").delete().eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageOrders } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShiftActionBody = {
    action?: "open" | "close";
};

export async function GET() {
    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("restaurant_shift_state")
            .select("id, is_open, opened_at, closed_at, opened_by, closed_by, updated_at")
            .eq("id", 1)
            .maybeSingle();

        if (error) {
            console.error("Shift state fetch error:", error);

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            shift: {
                isOpen: Boolean(data?.is_open),
                openedAt: data?.opened_at || null,
                closedAt: data?.closed_at || null,
                updatedAt: data?.updated_at || null,
            },
        });
    } catch (error) {
        console.error("Shift GET error:", error);

        return NextResponse.json(
            { error: "Could not load shift state" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const authSupabase = await createClient();

        const {
            data: { user },
        } = await authSupabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile, error: profileError } = await authSupabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError) {
            console.error("Shift profile error:", profileError);

            return NextResponse.json(
                { error: "Could not verify user role" },
                { status: 500 }
            );
        }

        if (!canManageOrders(profile?.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = (await request.json()) as ShiftActionBody;

        if (body.action !== "open" && body.action !== "close") {
            return NextResponse.json(
                { error: "Invalid shift action" },
                { status: 400 }
            );
        }

        const adminSupabase = createAdminClient();
        const now = new Date().toISOString();

        const updatePayload =
            body.action === "open"
                ? {
                    is_open: true,
                    opened_at: now,
                    opened_by: user.id,
                    updated_at: now,
                }
                : {
                    is_open: false,
                    closed_at: now,
                    closed_by: user.id,
                    updated_at: now,
                };

        const { data, error } = await adminSupabase
            .from("restaurant_shift_state")
            .update(updatePayload)
            .eq("id", 1)
            .select("id, is_open, opened_at, closed_at, updated_at")
            .maybeSingle();

        if (error) {
            console.error("Shift update error:", error);

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            shift: {
                isOpen: Boolean(data?.is_open),
                openedAt: data?.opened_at || null,
                closedAt: data?.closed_at || null,
                updatedAt: data?.updated_at || null,
            },
        });
    } catch (error) {
        console.error("Shift POST error:", error);

        return NextResponse.json(
            { error: "Could not update shift state" },
            { status: 500 }
        );
    }
}
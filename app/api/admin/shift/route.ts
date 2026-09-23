import { sendOpeningEmails } from "@/lib/notifications/send-opening-emails";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageOrders } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type ShiftActionBody = {
    action?: "open" | "close";
    address?: string;
};

export async function GET() {
    try {
        const supabase = createAdminClient();

        let { data, error } = await supabase
            .from("restaurant_shift_state")
            .select("id, is_open, opened_at, closed_at, opened_by, closed_by, updated_at, location_address")
            .eq("id", 1)
            .maybeSingle();

        if (error) {
            // Fallback for before the location_address migration is applied.
            const fallback = await supabase
                .from("restaurant_shift_state")
                .select("id, is_open, opened_at, closed_at, opened_by, closed_by, updated_at")
                .eq("id", 1)
                .maybeSingle();

            data = fallback.data as typeof data;
            error = fallback.error;
        }

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
                locationAddress:
                    (data as { location_address?: string | null })
                        ?.location_address || null,
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

        const locationAddress = (body.address || "").trim();

        if (body.action === "open" && !locationAddress) {
            return NextResponse.json(
                { error: "Foodtruck address is required to open the shift" },
                { status: 400 }
            );
        }

        const adminSupabase = createAdminClient();
        const now = new Date().toISOString();

        const basePayload =
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

        const updatePayload =
            body.action === "open"
                ? { ...basePayload, location_address: locationAddress }
                : basePayload;

        let { data, error } = await adminSupabase
            .from("restaurant_shift_state")
            .update(updatePayload)
            .eq("id", 1)
            .select("id, is_open, opened_at, closed_at, updated_at, location_address")
            .maybeSingle();

        if (error && body.action === "open") {
            /**
             * Fallback for before the location_address migration is applied:
             * still allow opening the shift (address simply won't persist yet).
             */
            const fallback = await adminSupabase
                .from("restaurant_shift_state")
                .update(basePayload)
                .eq("id", 1)
                .select("id, is_open, opened_at, closed_at, updated_at")
                .maybeSingle();

            data = fallback.data as typeof data;
            error = fallback.error;
        }

        if (error) {
            console.error("Shift update error:", error);

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (body.action === "open" && data?.is_open) {
            after(async () => {
                try { await sendOpeningEmails(); }
                catch { console.error("Opening email processing needs retry"); }
            });
        }

        return NextResponse.json({
            success: true,
            shift: {
                isOpen: Boolean(data?.is_open),
                openedAt: data?.opened_at || null,
                closedAt: data?.closed_at || null,
                updatedAt: data?.updated_at || null,
                locationAddress:
                    (data as { location_address?: string | null })
                        ?.location_address || null,
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
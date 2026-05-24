import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CustomerProfileRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;

    total_orders: number | null;
    total_spent_gross: number | string | null;
    loyalty_points: number | null;
    discount_percent: number | null;

    last_order_at: string | null;
    created_at: string | null;
};

type CustomerProfileRequestBody = {
    email?: string;
    phone?: string;
    useAuth?: boolean;
};

function normalizeEmail(email?: string | null) {
    const value = email?.trim().toLowerCase();

    return value || null;
}

function normalizePhone(phone?: string | null) {
    const value = phone?.trim();

    if (!value) return null;

    return value.replace(/[^\d+]/g, "");
}

function safeNumber(value: number | string | null | undefined) {
    const amount = Number(value ?? 0);

    return Number.isFinite(amount) ? amount : 0;
}

function profileResponse(profile: CustomerProfileRow) {
    return {
        id: profile.id,

        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        avatarUrl: profile.avatar_url,

        totalOrders: Number(profile.total_orders || 0),
        totalSpentGross: safeNumber(profile.total_spent_gross),
        loyaltyPoints: Number(profile.loyalty_points || 0),
        discountPercent: Number(profile.discount_percent || 0),

        lastOrderAt: profile.last_order_at,
        createdAt: profile.created_at,
    };
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as CustomerProfileRequestBody;

        const adminSupabase = createAdminClient();

        let normalizedEmail = normalizeEmail(body.email);
        let normalizedPhone = normalizePhone(body.phone);

        if (body.useAuth) {
            const supabase = await createClient();

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                return NextResponse.json(
                    { error: "You are not logged in" },
                    { status: 401 }
                );
            }

            normalizedEmail = normalizeEmail(user.email);

            if (!normalizedEmail) {
                return NextResponse.json(
                    { error: "Your social account did not provide an email" },
                    { status: 400 }
                );
            }

            const { data: profile, error } = await adminSupabase
                .from("customer_profiles")
                .select(
                    `
          id,
          full_name,
          email,
          phone,
          avatar_url,
          total_orders,
          total_spent_gross,
          loyalty_points,
          discount_percent,
          last_order_at,
          created_at
        `
                )
                .eq("normalized_email", normalizedEmail)
                .maybeSingle<CustomerProfileRow>();

            if (error) {
                console.error("Customer auth profile fetch error:", error);

                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            if (!profile) {
                return NextResponse.json(
                    {
                        error:
                            "No loyalty profile found for this email. Create it during checkout or link your phone number.",
                        authEmail: normalizedEmail,
                    },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                profile: profileResponse(profile),
            });
        }

        if (!normalizedEmail) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        if (!normalizedPhone) {
            return NextResponse.json(
                { error: "Phone is required" },
                { status: 400 }
            );
        }

        const { data: profile, error } = await adminSupabase
            .from("customer_profiles")
            .select(
                `
        id,
        full_name,
        email,
        phone,
        avatar_url,
        total_orders,
        total_spent_gross,
        loyalty_points,
        discount_percent,
        last_order_at,
        created_at
      `
            )
            .eq("normalized_email", normalizedEmail)
            .eq("normalized_phone", normalizedPhone)
            .maybeSingle<CustomerProfileRow>();

        if (error) {
            console.error("Customer profile fetch error:", error);

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!profile) {
            return NextResponse.json(
                {
                    error:
                        "Customer profile not found. Please check your email and phone number.",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            profile: profileResponse(profile),
        });
    } catch (error) {
        console.error("Customer profile API error:", error);

        return NextResponse.json(
            { error: "Could not load customer profile" },
            { status: 500 }
        );
    }
}

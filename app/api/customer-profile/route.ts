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
    normalized_email?: string | null;
    normalized_phone?: string | null;
    avatar_url: string | null;

    is_registered?: boolean | null;
    loyalty_opt_in?: boolean | null;

    total_orders: number | null;
    total_spent_gross: number | string | null;
    loyalty_stamps: number | null;
    loyalty_rewards_available: number | null;

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
        loyaltyStamps: Number(profile.loyalty_stamps || 0),
        loyaltyRewardsAvailable: Number(profile.loyalty_rewards_available || 0),

        lastOrderAt: profile.last_order_at,
        createdAt: profile.created_at,
    };
}

function getUserFullName(userMetadata: Record<string, unknown> | undefined) {
    const fullName =
        typeof userMetadata?.full_name === "string"
            ? userMetadata.full_name
            : null;

    const name =
        typeof userMetadata?.name === "string" ? userMetadata.name : null;

    return fullName || name || null;
}

function getUserAvatarUrl(userMetadata: Record<string, unknown> | undefined) {
    const avatarUrl =
        typeof userMetadata?.avatar_url === "string"
            ? userMetadata.avatar_url
            : null;

    const picture =
        typeof userMetadata?.picture === "string" ? userMetadata.picture : null;

    return avatarUrl || picture || null;
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as CustomerProfileRequestBody;

        const adminSupabase = createAdminClient();

        let normalizedEmail = normalizeEmail(body.email);
        const normalizedPhone = normalizePhone(body.phone);

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

            const { data: existingProfile, error: findError } = await adminSupabase
                .from("customer_profiles")
                .select(
                    `
          id,
          full_name,
          email,
          phone,
          avatar_url,
          is_registered,
          loyalty_opt_in,
          total_orders,
          total_spent_gross,
          loyalty_stamps,
          loyalty_rewards_available,
          last_order_at,
          created_at
        `
                )
                .eq("normalized_email", normalizedEmail)
                .maybeSingle<CustomerProfileRow>();

            if (findError) {
                console.error("Customer auth profile fetch error:", findError);

                return NextResponse.json({ error: findError.message }, { status: 500 });
            }

            if (existingProfile) {
                return NextResponse.json({
                    success: true,
                    profile: profileResponse(existingProfile),
                    authEmail: normalizedEmail,
                });
            }

            const now = new Date().toISOString();

            const fullName = getUserFullName(user.user_metadata);
            const avatarUrl = getUserAvatarUrl(user.user_metadata);

            const { data: createdProfile, error: createError } = await adminSupabase
                .from("customer_profiles")
                .insert({
                    full_name: fullName,
                    email: normalizedEmail,
                    phone: null,

                    normalized_email: normalizedEmail,
                    normalized_phone: null,

                    avatar_url: avatarUrl,

                    is_registered: true,
                    loyalty_opt_in: true,
                    marketing_consent: false,
                    registered_at: now,

                    total_orders: 0,
                    total_spent_gross: 0,
                    loyalty_stamps: 0,
                    loyalty_rewards_available: 0,

                    last_order_at: null,
                    updated_at: now,
                })
                .select(
                    `
          id,
          full_name,
          email,
          phone,
          avatar_url,
          is_registered,
          loyalty_opt_in,
          total_orders,
          total_spent_gross,
          loyalty_stamps,
          loyalty_rewards_available,
          last_order_at,
          created_at
        `
                )
                .single<CustomerProfileRow>();

            if (createError) {
                console.error("Create OAuth customer profile error:", createError);

                return NextResponse.json(
                    { error: createError.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                profile: profileResponse(createdProfile),
                authEmail: normalizedEmail,
                created: true,
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
        is_registered,
        loyalty_opt_in,
        total_orders,
        total_spent_gross,
        loyalty_stamps,
        loyalty_rewards_available,
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
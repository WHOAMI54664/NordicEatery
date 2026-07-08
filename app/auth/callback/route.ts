import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnv(name: string) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} is missing`);
    }

    return value;
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");

    /**
     * Optional post-login destination. Only relative paths are accepted
     * (prevents open-redirect to external sites).
     */
    const next = requestUrl.searchParams.get("next");

    const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
            ? next
            : "/sv/profile";

    const redirectUrl = new URL(safeNext, requestUrl.origin);

    if (!code) {
        return NextResponse.redirect(
            new URL("/sv/profile/login?auth_error=missing_code", requestUrl.origin)
        );
    }

    const response = NextResponse.redirect(redirectUrl);

    const cookieStore = await cookies();

    const supabase = createServerClient(
        getEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },

                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        console.error("Customer OAuth callback error:", error);

        return NextResponse.redirect(
            new URL(
                `/sv/profile/login?auth_error=${encodeURIComponent(error.message)}`,
                requestUrl.origin
            )
        );
    }

    console.log("Customer OAuth session saved:", {
        hasSession: Boolean(data.session),
        hasUser: Boolean(data.user),
        email: data.user?.email,
    });

    return response;
}
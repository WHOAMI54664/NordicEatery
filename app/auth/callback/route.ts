import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(
            new URL("/sv/profile/login?auth_error=missing_code", requestUrl.origin)
        );
    }

    const supabase = await createClient();

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

    console.log("Customer OAuth session created:", {
        hasSession: Boolean(data.session),
        hasUser: Boolean(data.user),
        userEmail: data.user?.email,
    });

    return NextResponse.redirect(
        new URL("/sv/profile?oauth=ok", requestUrl.origin)
    );
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);

    const code = requestUrl.searchParams.get("code");

    if (code) {
        const supabase = await createClient();

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(new URL("/auth/finish", requestUrl.origin));
        }

        console.error("OAuth callback error:", error);
    }

    return NextResponse.redirect(
        new URL("/sv/profile/login?auth_error=oauth_failed", requestUrl.origin)
    );
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSafeNextPath(value: string | null) {
    if (!value) return "/sv/profile";

    if (!value.startsWith("/")) return "/sv/profile";
    if (value.startsWith("//")) return "/sv/profile";

    return value;
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);

    const code = requestUrl.searchParams.get("code");
    const next = getSafeNextPath(requestUrl.searchParams.get("next"));

    if (code) {
        const supabase = await createClient();

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(new URL(next, requestUrl.origin));
        }

        console.error("OAuth callback error:", error);
    }

    return NextResponse.redirect(
        new URL("/sv/profile?auth_error=oauth_failed", requestUrl.origin)
    );
}
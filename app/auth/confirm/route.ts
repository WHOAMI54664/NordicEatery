import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSafeNext(next: string | null, origin: string) {
    if (!next) return `${origin}/en/set-password`;

    try {
        const url = new URL(next);

        if (url.origin !== origin) {
            return `${origin}/en/set-password`;
        }

        return url.toString();
    } catch {
        if (next.startsWith("/") && !next.startsWith("//")) {
            return `${origin}${next}`;
        }

        return `${origin}/en/set-password`;
    }
}

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);

    const token_hash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
    const next = getSafeNext(requestUrl.searchParams.get("next"), requestUrl.origin);

    if (!token_hash || !type) {
        return NextResponse.redirect(new URL("/en/login?error=missing_token", requestUrl.origin));
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
    });

    if (error) {
        console.error("verifyOtp error:", error.message);

        return NextResponse.redirect(new URL("/en/login?error=auth", requestUrl.origin));
    }

    return NextResponse.redirect(next);
}
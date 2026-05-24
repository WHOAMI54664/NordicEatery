"use client";

import { Github, Mail } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

const OAUTH_RETURN_TO_KEY = "nordic-eatery-oauth-return-to";

type CustomerOAuthButtonsProps = {
    locale: string;
    returnTo?: string;
};

type OAuthProvider = "google" | "github" | "apple";

const SUPPORTED_LOCALES = ["sv", "en", "pl", "ru"];

function normalizeLocale(locale: string) {
    const cleanLocale = locale.replace(/^\/+|\/+$/g, "");

    return SUPPORTED_LOCALES.includes(cleanLocale) ? cleanLocale : "sv";
}

function getSafeReturnPath(value: string, locale: string) {
    const safeLocale = normalizeLocale(locale);

    if (!value.startsWith("/")) return `/${safeLocale}/profile`;
    if (value.startsWith("//")) return `/${safeLocale}/profile`;

    const parts = value.split("/").filter(Boolean);

    if (
        parts.length >= 2 &&
        SUPPORTED_LOCALES.includes(parts[0]) &&
        SUPPORTED_LOCALES.includes(parts[1])
    ) {
        return `/${parts[0]}/${parts.slice(2).join("/")}`;
    }

    if (parts.length > 0 && !SUPPORTED_LOCALES.includes(parts[0])) {
        return `/${safeLocale}${value}`;
    }

    return value;
}

export function CustomerOAuthButtons({
                                         locale,
                                         returnTo,
                                     }: CustomerOAuthButtonsProps) {
    const supabase = createClient();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const safeLocale = normalizeLocale(locale);

    function getCurrentReturnPath() {
        const currentPath = pathname || `/${safeLocale}/profile`;
        const queryString = searchParams.toString();

        return queryString ? `${currentPath}?${queryString}` : currentPath;
    }

    async function signInWithProvider(provider: OAuthProvider) {
        const origin =
            typeof window !== "undefined"
                ? window.location.origin
                : process.env.NEXT_PUBLIC_SITE_URL || "https://www.nordiceatery.se";

        const cleanOrigin = origin.replace(/\/+$/, "");

        const finalReturnPath = getSafeReturnPath(
            returnTo || getCurrentReturnPath(),
            safeLocale
        );

        window.localStorage.setItem(OAUTH_RETURN_TO_KEY, finalReturnPath);

        /**
         * Important:
         * No query params here. Supabase must see an exact allowed redirect URL.
         */
        const redirectTo = `${cleanOrigin}/auth/callback`;

        console.log("OAuth redirectTo:", redirectTo);
        console.log("OAuth returnTo:", finalReturnPath);

        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo,
            },
        });

        if (error) {
            alert(error.message);
        }
    }

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={() => signInWithProvider("apple")}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#111] px-5 py-3 font-black text-white shadow-sm transition hover:scale-[1.01]"
            >
                <span className="text-lg leading-none"></span>
                Continue with Apple
            </button>

            <button
                type="button"
                onClick={() => signInWithProvider("google")}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dark/10 bg-white/80 px-5 py-3 font-black text-dark shadow-sm transition hover:scale-[1.01]"
            >
                <Mail className="h-5 w-5 text-paprika" />
                Continue with Google
            </button>

            <button
                type="button"
                onClick={() => signInWithProvider("github")}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dark/10 bg-white/80 px-5 py-3 font-black text-dark shadow-sm transition hover:scale-[1.01]"
            >
                <Github className="h-5 w-5" />
                Continue with GitHub
            </button>
        </div>
    );
}
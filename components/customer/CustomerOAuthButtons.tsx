"use client";

import { Github, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type CustomerOAuthButtonsProps = {
    locale: string;
};

type OAuthProvider = "google" | "github" | "apple";

export function CustomerOAuthButtons({ locale }: CustomerOAuthButtonsProps) {
    const supabase = createClient();

    async function signInWithProvider(provider: OAuthProvider) {
        const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

        const cleanSiteUrl = siteUrl.replace(/\/+$/, "");

        const redirectTo = `${cleanSiteUrl}/auth/callback?next=/${locale}/profile`;

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
                className="flex h-13 w-full items-center justify-center gap-3 rounded-2xl bg-[#111] px-5 py-3 font-black text-white transition hover:scale-[1.01]"
            >
                <span className="text-lg"></span>
                Continue with Apple
            </button>

            <button
                type="button"
                onClick={() => signInWithProvider("google")}
                className="flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-dark/10 bg-white/80 px-5 py-3 font-black text-dark transition hover:scale-[1.01]"
            >
                <Mail className="h-5 w-5 text-paprika" />
                Continue with Google
            </button>

            <button
                type="button"
                onClick={() => signInWithProvider("github")}
                className="flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-dark/10 bg-white/80 px-5 py-3 font-black text-dark transition hover:scale-[1.01]"
            >
                <Github className="h-5 w-5" />
                Continue with GitHub
            </button>
        </div>
    );
}
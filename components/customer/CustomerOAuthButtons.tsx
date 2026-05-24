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
        const redirectTo = "https://www.nordiceatery.se/auth/callback";

        console.log("Customer OAuth provider:", provider);
        console.log("Customer OAuth locale:", locale);
        console.log("Customer OAuth redirectTo:", redirectTo);

        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo,
            },
        });

        if (error) {
            console.error("Customer OAuth error:", error);
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
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const OAUTH_RETURN_TO_KEY = "nordic-eatery-oauth-return-to";

function getSafeReturnPath(value: string | null) {
    if (!value) return "/sv/profile";
    if (!value.startsWith("/")) return "/sv/profile";
    if (value.startsWith("//")) return "/sv/profile";

    return value;
}

export default function AuthFinishPage() {
    const router = useRouter();

    useEffect(() => {
        const savedReturnTo = window.localStorage.getItem(OAUTH_RETURN_TO_KEY);

        window.localStorage.removeItem(OAUTH_RETURN_TO_KEY);

        router.replace(getSafeReturnPath(savedReturnTo));
    }, [router]);

    return (
        <main className="flex min-h-[70vh] items-center justify-center bg-cream px-6 text-dark">
            <div className="glass-card max-w-md p-8 text-center">
                <RefreshCw className="mx-auto h-10 w-10 animate-spin text-paprika" />

                <h1 className="mt-5 text-2xl font-black">Finishing login...</h1>

                <p className="mt-2 text-sm leading-6 text-dark/55">
                    Please wait while we return you to your profile.
                </p>
            </div>
        </main>
    );
}
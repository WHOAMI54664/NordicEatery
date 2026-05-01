"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type AccountSignOutButtonProps = {
    locale: string;
};

export function AccountSignOutButton({ locale }: AccountSignOutButtonProps) {
    const router = useRouter();
    const supabase = createClient();

    async function signOut() {
        await supabase.auth.signOut();

        router.push(`/${locale}/login`);
        router.refresh();
    }

    return (
        <button
            type="button"
            onClick={signOut}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-5 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E]"
        >
            <LogOut className="h-4 w-4" />
            Sign out
        </button>
    );
}
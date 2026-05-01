import { redirect } from "next/navigation";
import { KitchenBoard } from "@/components/KitchenBoard";
import { createClient } from "@/lib/supabase/server";
import { canAccessKitchen } from "@/lib/auth/roles";

type KitchenDisplayPageProps = {
    params: Promise<{
        locale: string;
    }>;
};

export default async function KitchenDisplayPage({
                                                     params
                                                 }: KitchenDisplayPageProps) {
    const { locale } = await params;

    const supabase = await createClient();

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login?next=/${locale}/kitchen-display`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!canAccessKitchen(profile?.role)) {
        redirect(`/${locale}/unauthorized`);
    }

    return (
        <main className="min-h-screen bg-[#FFF7EA] px-4 py-6 text-[#25120F] lg:px-8">
            <KitchenBoard />
        </main>
    );
}
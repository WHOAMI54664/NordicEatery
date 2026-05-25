import { createAdminClient } from "@/lib/supabase/admin";

export type PublicShiftStatus = {
    isOpen: boolean;
    openedAt: string | null;
    closedAt: string | null;
};

export async function getPublicShiftStatus(): Promise<PublicShiftStatus> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("restaurant_shifts")
        .select("opened_at, closed_at")
        .is("closed_at", null)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Public shift status error:", error);

        return {
            isOpen: true,
            openedAt: null,
            closedAt: null,
        };
    }

    return {
        isOpen: Boolean(data),
        openedAt: data?.opened_at || null,
        closedAt: data?.closed_at || null,
    };
}
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicShiftStatus = {
    isOpen: boolean;
    openedAt: string | null;
    closedAt: string | null;
};

type RestaurantShiftStateRow = {
    is_open: boolean | null;
    opened_at: string | null;
    closed_at: string | null;
};

export async function getPublicShiftStatus(): Promise<PublicShiftStatus> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("restaurant_shift_state")
        .select("is_open, opened_at, closed_at")
        .limit(1)
        .maybeSingle<RestaurantShiftStateRow>();

    if (error) {
        console.error("Public shift status error:", error);

        return {
            isOpen: false,
            openedAt: null,
            closedAt: null,
        };
    }

    return {
        isOpen: Boolean(data?.is_open),
        openedAt: data?.opened_at || null,
        closedAt: data?.closed_at || null,
    };
}
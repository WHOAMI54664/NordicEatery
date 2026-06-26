import { createAdminClient } from "@/lib/supabase/admin";

export type PublicShiftStatus = {
    isOpen: boolean;
    openedAt: string | null;
    closedAt: string | null;
    locationAddress: string | null;
};

type RestaurantShiftStateRow = {
    is_open: boolean | null;
    opened_at: string | null;
    closed_at: string | null;
    location_address: string | null;
};

export async function getPublicShiftStatus(): Promise<PublicShiftStatus> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("restaurant_shift_state")
        .select("is_open, opened_at, closed_at, location_address")
        .limit(1)
        .maybeSingle<RestaurantShiftStateRow>();

    if (!error) {
        return {
            isOpen: Boolean(data?.is_open),
            openedAt: data?.opened_at || null,
            closedAt: data?.closed_at || null,
            locationAddress: data?.location_address || null,
        };
    }

    /**
     * Fallback for before the `location_address` migration has been applied.
     * The public site must keep working (and must not wrongly show "closed")
     * even if the new column does not exist yet.
     */
    const fallback = await supabase
        .from("restaurant_shift_state")
        .select("is_open, opened_at, closed_at")
        .limit(1)
        .maybeSingle<Omit<RestaurantShiftStateRow, "location_address">>();

    if (fallback.error) {
        console.error("Public shift status error:", fallback.error);

        return {
            isOpen: false,
            openedAt: null,
            closedAt: null,
            locationAddress: null,
        };
    }

    return {
        isOpen: Boolean(fallback.data?.is_open),
        openedAt: fallback.data?.opened_at || null,
        closedAt: fallback.data?.closed_at || null,
        locationAddress: null,
    };
}
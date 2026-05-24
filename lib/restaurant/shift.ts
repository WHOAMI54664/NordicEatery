import { createAdminClient } from "@/lib/supabase/admin";

export type RestaurantShiftState = {
    isOpen: boolean;
    openedAt: string | null;
    closedAt: string | null;
    updatedAt: string | null;
};

export async function getRestaurantShiftState(): Promise<RestaurantShiftState> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("restaurant_shift_state")
        .select("is_open, opened_at, closed_at, updated_at")
        .eq("id", 1)
        .maybeSingle();

    if (error) {
        console.error("Restaurant shift state error:", error);

        return {
            isOpen: false,
            openedAt: null,
            closedAt: null,
            updatedAt: null,
        };
    }

    if (!data) {
        return {
            isOpen: false,
            openedAt: null,
            closedAt: null,
            updatedAt: null,
        };
    }

    return {
        isOpen: Boolean(data.is_open),
        openedAt: data.opened_at || null,
        closedAt: data.closed_at || null,
        updatedAt: data.updated_at || null,
    };
}

export async function assertRestaurantShiftIsOpen() {
    const shift = await getRestaurantShiftState();

    if (!shift.isOpen) {
        return {
            ok: false as const,
            error:
                "Kitchen is currently closed. Orders are available when the restaurant opens the shift.",
            shift,
        };
    }

    return {
        ok: true as const,
        shift,
    };
}
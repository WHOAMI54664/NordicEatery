import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stamp-based loyalty program.
 *
 * - 1 stamp per paid order of at least LOYALTY_STAMP_MIN_ORDER_GROSS kr.
 * - Every LOYALTY_STAMPS_PER_REWARD stamps convert into one reward of
 *   LOYALTY_REWARD_VALUE kr off a future order.
 * - The customer chooses at checkout whether to redeem an available reward.
 *
 * This replaces the old percent-based system (loyalty_points /
 * discount_percent are kept in the database for history but no longer used).
 */

export const LOYALTY_STAMP_MIN_ORDER_GROSS = 150;
export const LOYALTY_STAMPS_PER_REWARD = 10;
export const LOYALTY_REWARD_VALUE = 100;

type OrderForLoyalty = {
    id: string;
    customer_name: string | null;
    customer_phone: string | null;
    customer_email?: string | null;
    loyalty_opt_in?: boolean | null;
    total_gross: number | string | null;
    total_price: number | string | null;
    /** Kr of loyalty reward redeemed on this order (0 if none). */
    loyalty_reward_used?: number | string | null;
    payment_status: string | null;
    paid_at: string | null;
};

type CustomerProfileRow = {
    id: string;
    total_orders: number | null;
    total_spent_gross: number | string | null;
    loyalty_stamps: number | null;
    loyalty_rewards_available: number | null;
    registered_at?: string | null;
};

function normalizeEmail(email?: string | null) {
    const value = email?.trim().toLowerCase();

    return value || null;
}

function normalizePhone(phone?: string | null) {
    const value = phone?.trim();

    if (!value) return null;

    return value.replace(/[^\d+]/g, "");
}

function safeAmount(value: number | string | null | undefined) {
    const amount = Number(value ?? 0);

    return Number.isFinite(amount) ? amount : 0;
}

const PROFILE_SELECT =
    "id, total_orders, total_spent_gross, loyalty_stamps, loyalty_rewards_available, registered_at";

async function findExistingCustomer(params: {
    normalizedEmail: string | null;
    normalizedPhone: string | null;
}) {
    const supabase = createAdminClient();

    if (params.normalizedEmail) {
        const { data, error } = await supabase
            .from("customer_profiles")
            .select(PROFILE_SELECT)
            .eq("normalized_email", params.normalizedEmail)
            .maybeSingle<CustomerProfileRow>();

        if (error) {
            console.error("Find customer by email error:", error);
        }

        if (data) return data;
    }

    if (params.normalizedPhone) {
        const { data, error } = await supabase
            .from("customer_profiles")
            .select(PROFILE_SELECT)
            .eq("normalized_phone", params.normalizedPhone)
            .maybeSingle<CustomerProfileRow>();

        if (error) {
            console.error("Find customer by phone error:", error);
        }

        if (data) return data;
    }

    return null;
}

/**
 * Loyalty status lookup for checkout: how many stamps and unredeemed
 * rewards a customer has. Returns null when no profile exists.
 */
export async function getLoyaltyStatusByContact(params: {
    email?: string | null;
    phone?: string | null;
}) {
    const normalizedEmail = normalizeEmail(params.email);
    const normalizedPhone = normalizePhone(params.phone);

    if (!normalizedEmail && !normalizedPhone) {
        return null;
    }

    const customer = await findExistingCustomer({
        normalizedEmail,
        normalizedPhone,
    });

    if (!customer) return null;

    return {
        customerId: customer.id,
        stamps: Number(customer.loyalty_stamps || 0),
        rewardsAvailable: Number(customer.loyalty_rewards_available || 0),
    };
}

async function createCustomerProfile(params: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    normalizedEmail: string | null;
    normalizedPhone: string | null;
    registeredAt: string;
}) {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("customer_profiles")
        .insert({
            full_name: params.fullName,
            email: params.email,
            phone: params.phone,
            normalized_email: params.normalizedEmail,
            normalized_phone: params.normalizedPhone,

            is_registered: true,
            loyalty_opt_in: true,
            marketing_consent: false,
            registered_at: params.registeredAt,

            total_orders: 0,
            total_spent_gross: 0,
            loyalty_stamps: 0,
            loyalty_rewards_available: 0,
        })
        .select(PROFILE_SELECT)
        .single<CustomerProfileRow>();

    if (error) {
        console.error("Create customer profile error:", error);
        throw new Error(error.message);
    }

    return data;
}

export async function applyLoyaltyForPaidOrder(order: OrderForLoyalty) {
    const supabase = createAdminClient();

    if (order.payment_status !== "paid") {
        return {
            success: false,
            reason: "Order is not paid",
        };
    }

    /**
     * Important:
     * We only create/update loyalty profiles when the customer explicitly opted in
     * during checkout.
     */
    if (!order.loyalty_opt_in) {
        return {
            success: false,
            reason: "Customer did not opt in to loyalty profile",
        };
    }

    const email = normalizeEmail(order.customer_email);
    const phone = order.customer_phone?.trim() || null;

    const normalizedEmail = normalizeEmail(order.customer_email);
    const normalizedPhone = normalizePhone(order.customer_phone);

    /**
     * For loyalty registration, email is required.
     * Phone is still useful for matching existing customers.
     */
    if (!normalizedEmail) {
        return {
            success: false,
            reason: "Customer email is required for loyalty profile",
        };
    }

    if (!normalizedPhone) {
        return {
            success: false,
            reason: "Customer phone is required for loyalty profile",
        };
    }

    /**
     * Protection from double stamps.
     * If this order already has a loyalty event, do nothing.
     */
    const { data: existingEvent, error: existingEventError } = await supabase
        .from("customer_loyalty_events")
        .select("id")
        .eq("order_id", order.id)
        .eq("event_type", "order_paid")
        .maybeSingle();

    if (existingEventError) {
        console.error("Existing loyalty event check error:", existingEventError);
    }

    if (existingEvent) {
        return {
            success: true,
            alreadyApplied: true,
            reason: "Loyalty already applied for this order",
        };
    }

    const now = new Date().toISOString();

    const existingCustomer = await findExistingCustomer({
        normalizedEmail,
        normalizedPhone,
    });

    const customer =
        existingCustomer ||
        (await createCustomerProfile({
            fullName: order.customer_name?.trim() || null,
            email,
            phone,
            normalizedEmail,
            normalizedPhone,
            registeredAt: now,
        }));

    const totalGross = safeAmount(order.total_gross ?? order.total_price);
    const rewardUsed = safeAmount(order.loyalty_reward_used);

    /**
     * Stamp eligibility is based on what the customer actually ordered,
     * i.e. the total BEFORE the redeemed reward. Otherwise redeeming a
     * reward could unfairly cost the customer a stamp.
     */
    const qualifyingGross = totalGross + rewardUsed;
    const stampsToAdd =
        qualifyingGross >= LOYALTY_STAMP_MIN_ORDER_GROSS ? 1 : 0;

    const currentTotalOrders = Number(customer.total_orders || 0);
    const currentTotalSpent = safeAmount(customer.total_spent_gross);
    const currentStamps = Number(customer.loyalty_stamps || 0);
    const currentRewards = Number(customer.loyalty_rewards_available || 0);

    const nextTotalOrders = currentTotalOrders + 1;
    const nextTotalSpent = Number((currentTotalSpent + totalGross).toFixed(2));

    let nextStamps = currentStamps + stampsToAdd;
    let nextRewards = currentRewards;
    let rewardEarned = false;

    // A full stamp card converts into a banked reward.
    if (nextStamps >= LOYALTY_STAMPS_PER_REWARD) {
        nextStamps -= LOYALTY_STAMPS_PER_REWARD;
        nextRewards += 1;
        rewardEarned = true;
    }

    // The redeemed reward is consumed.
    if (rewardUsed > 0) {
        nextRewards = Math.max(0, nextRewards - 1);
    }

    const { error: updateCustomerError } = await supabase
        .from("customer_profiles")
        .update({
            full_name: order.customer_name?.trim() || null,
            email,
            phone,
            normalized_email: normalizedEmail,
            normalized_phone: normalizedPhone,

            is_registered: true,
            loyalty_opt_in: true,
            registered_at: customer.registered_at || now,

            total_orders: nextTotalOrders,
            total_spent_gross: nextTotalSpent,
            loyalty_stamps: nextStamps,
            loyalty_rewards_available: nextRewards,

            last_order_at: order.paid_at || now,
            updated_at: now,
        })
        .eq("id", customer.id);

    if (updateCustomerError) {
        console.error("Update customer loyalty error:", updateCustomerError);
        throw new Error(updateCustomerError.message);
    }

    const noteParts = [
        stampsToAdd > 0
            ? `Order paid. Added ${stampsToAdd} stamp.`
            : `Order paid. Below ${LOYALTY_STAMP_MIN_ORDER_GROSS} kr, no stamp.`,
    ];

    if (rewardEarned) {
        noteParts.push(
            `Full stamp card: earned ${LOYALTY_REWARD_VALUE} kr reward.`
        );
    }

    if (rewardUsed > 0) {
        noteParts.push(`Redeemed ${rewardUsed} kr reward on this order.`);
    }

    const { error: eventError } = await supabase
        .from("customer_loyalty_events")
        .insert({
            customer_id: customer.id,
            order_id: order.id,
            event_type: "order_paid",
            points_delta: stampsToAdd,
            amount_gross: totalGross,
            note: noteParts.join(" "),
        });

    if (eventError) {
        console.error("Create loyalty event error:", eventError);
        throw new Error(eventError.message);
    }

    return {
        success: true,
        alreadyApplied: false,
        customerId: customer.id,
        stampsAdded: stampsToAdd,
        totalStamps: nextStamps,
        rewardsAvailable: nextRewards,
        rewardEarned,
    };
}

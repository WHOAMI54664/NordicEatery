import { createAdminClient } from "@/lib/supabase/admin";

type OrderForLoyalty = {
    id: string;
    customer_name: string | null;
    customer_phone: string | null;
    customer_email?: string | null;
    loyalty_opt_in?: boolean | null;
    total_gross: number | string | null;
    total_price: number | string | null;
    payment_status: string | null;
    paid_at: string | null;
};

type CustomerProfileRow = {
    id: string;
    total_orders: number | null;
    total_spent_gross: number | string | null;
    loyalty_points: number | null;
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

function calculateDiscountPercent(points: number) {
    if (points >= 3000) return 20;
    if (points >= 2000) return 15;
    if (points >= 1000) return 10;
    if (points >= 500) return 5;

    return 0;
}

function calculatePointsFromOrder(totalGross: number) {
    return Math.max(0, Math.floor(totalGross));
}

async function findExistingCustomer(params: {
    normalizedEmail: string | null;
    normalizedPhone: string | null;
}) {
    const supabase = createAdminClient();

    if (params.normalizedEmail) {
        const { data, error } = await supabase
            .from("customer_profiles")
            .select("id, total_orders, total_spent_gross, loyalty_points, registered_at")
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
            .select("id, total_orders, total_spent_gross, loyalty_points, registered_at")
            .eq("normalized_phone", params.normalizedPhone)
            .maybeSingle<CustomerProfileRow>();

        if (error) {
            console.error("Find customer by phone error:", error);
        }

        if (data) return data;
    }

    return null;
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
            loyalty_points: 0,
            discount_percent: 0,
        })
        .select("id, total_orders, total_spent_gross, loyalty_points, registered_at")
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
     * Protection from double points.
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
    const pointsToAdd = calculatePointsFromOrder(totalGross);

    const currentTotalOrders = Number(customer.total_orders || 0);
    const currentTotalSpent = safeAmount(customer.total_spent_gross);
    const currentPoints = Number(customer.loyalty_points || 0);

    const nextTotalOrders = currentTotalOrders + 1;
    const nextTotalSpent = Number((currentTotalSpent + totalGross).toFixed(2));
    const nextPoints = currentPoints + pointsToAdd;
    const nextDiscountPercent = calculateDiscountPercent(nextPoints);

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
            loyalty_points: nextPoints,
            discount_percent: nextDiscountPercent,

            last_order_at: order.paid_at || now,
            updated_at: now,
        })
        .eq("id", customer.id);

    if (updateCustomerError) {
        console.error("Update customer loyalty error:", updateCustomerError);
        throw new Error(updateCustomerError.message);
    }

    const { error: eventError } = await supabase
        .from("customer_loyalty_events")
        .insert({
            customer_id: customer.id,
            order_id: order.id,
            event_type: "order_paid",
            points_delta: pointsToAdd,
            amount_gross: totalGross,
            note: `Order paid. Added ${pointsToAdd} loyalty points.`,
        });

    if (eventError) {
        console.error("Create loyalty event error:", eventError);
        throw new Error(eventError.message);
    }

    return {
        success: true,
        alreadyApplied: false,
        customerId: customer.id,
        pointsAdded: pointsToAdd,
        totalPoints: nextPoints,
        discountPercent: nextDiscountPercent,
    };
}
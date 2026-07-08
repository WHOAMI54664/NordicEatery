import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
    getLoyaltyStatusByContact,
    LOYALTY_REWARD_VALUE,
    LOYALTY_STAMPS_PER_REWARD,
    LOYALTY_STAMP_MIN_ORDER_GROSS,
} from "@/lib/customers/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoyaltyStatusBody = {
    email?: string;
    phone?: string;
};

/**
 * Public loyalty status lookup used at checkout.
 * Returns only counters (no personal data) so the form can offer
 * the customer to redeem an available reward.
 */
export async function POST(request: Request) {
    try {
        // Max 20 lookups per IP per 5 minutes.
        const limit = rateLimit("loyalty-status", request, 20, 5 * 60 * 1000);

        if (!limit.ok) {
            return rateLimitResponse(limit.retryAfter);
        }

        const body = (await request.json()) as LoyaltyStatusBody;

        const status = await getLoyaltyStatusByContact({
            email: body.email,
            phone: body.phone,
        });

        return NextResponse.json({
            success: true,
            stamps: status?.stamps ?? 0,
            rewardsAvailable: status?.rewardsAvailable ?? 0,
            stampsPerReward: LOYALTY_STAMPS_PER_REWARD,
            rewardValue: LOYALTY_REWARD_VALUE,
            minOrderForStamp: LOYALTY_STAMP_MIN_ORDER_GROSS,
        });
    } catch (error) {
        console.error("Loyalty status API error:", error);

        return NextResponse.json(
            { error: "Could not check loyalty status" },
            { status: 500 }
        );
    }
}

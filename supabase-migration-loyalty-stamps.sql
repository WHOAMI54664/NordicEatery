-- ============================================================
-- Loyalty stamps migration (run in Supabase SQL Editor)
--
-- New system: 1 stamp per paid order >= 150 kr.
-- 10 stamps -> 1 reward of 100 kr off a future order.
-- Replaces the old percent-based system (loyalty_points /
-- discount_percent columns are kept for history but no longer used).
-- ============================================================

-- 1. Customer profiles: stamp counter + banked rewards
alter table public.customer_profiles
    add column if not exists loyalty_stamps integer not null default 0,
    add column if not exists loyalty_rewards_available integer not null default 0;

-- 2. Orders: how many kr of loyalty reward was redeemed on this order
alter table public.orders
    add column if not exists loyalty_reward_used numeric not null default 0;

-- 3. Optional (uncomment to run): convert existing points to stamps.
--    Old points = kr spent. 1 stamp per full 165 kr historically spent,
--    capped at 9 stamps so nobody starts with an instant reward.
-- update public.customer_profiles
-- set loyalty_stamps = least(floor(coalesce(loyalty_points, 0) / 165.0)::int, 9)
-- where coalesce(loyalty_stamps, 0) = 0;

-- 4. Old percent discount is retired
update public.customer_profiles set discount_percent = 0;

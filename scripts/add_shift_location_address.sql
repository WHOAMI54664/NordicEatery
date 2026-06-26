-- Adds the foodtruck location entered when a shift is opened.
-- Run once in the Supabase SQL editor.

alter table public.restaurant_shift_state
  add column if not exists location_address text;

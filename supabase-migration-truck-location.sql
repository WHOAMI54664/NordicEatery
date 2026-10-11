BEGIN;

ALTER TABLE public.restaurant_shift_state
  ADD COLUMN IF NOT EXISTS location_latitude double precision,
  ADD COLUMN IF NOT EXISTS location_longitude double precision;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'restaurant_shift_location_coordinates_valid'
      AND conrelid = 'public.restaurant_shift_state'::regclass
  ) THEN
    ALTER TABLE public.restaurant_shift_state
      ADD CONSTRAINT restaurant_shift_location_coordinates_valid CHECK (
        (location_latitude IS NULL AND location_longitude IS NULL)
        OR (location_latitude IS NOT NULL AND location_longitude IS NOT NULL
          AND location_latitude BETWEEN -90 AND 90
          AND location_longitude BETWEEN -180 AND 180)
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;

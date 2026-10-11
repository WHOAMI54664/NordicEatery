-- Run after supabase-migration-group-slots.sql. Existing reservations are unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.valid_group_slot_schedule(p_slots jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE slot jsonb; seen text[] := ARRAY[]::text[];
BEGIN
  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(p_slots) > 48 THEN RETURN false; END IF;
  FOR slot IN SELECT value FROM jsonb_array_elements(p_slots) LOOP
    IF jsonb_typeof(slot) <> 'object'
      OR jsonb_typeof(slot->'time') IS DISTINCT FROM 'string'
      OR (slot->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      OR jsonb_typeof(slot->'enabled') IS DISTINCT FROM 'boolean'
      OR slot->>'time' = ANY(seen)
    THEN RETURN false; END IF;
    seen := array_append(seen, slot->>'time');
  END LOOP;
  RETURN true;
END $$;

CREATE TABLE IF NOT EXISTS public.group_slot_schedule (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  slots jsonb NOT NULL CHECK (public.valid_group_slot_schedule(slots)),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
INSERT INTO public.group_slot_schedule(id, slots)
VALUES (1, '[{"time":"10:40","enabled":true},{"time":"11:00","enabled":true}]')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.group_slot_schedule ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_slot_schedule FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_group_slot_schedule()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('version',version,'slots',slots,'updatedAt',updated_at)
    FROM public.group_slot_schedule WHERE id=1;
$$;

CREATE OR REPLACE FUNCTION public.save_group_slot_schedule(p_version integer, p_slots jsonb, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $$
DECLARE current_version integer; normalized jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_actor AND lower(role::text) IN ('owner','admin'))
    THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  IF p_version IS NULL OR p_version < 1 OR p_version >= 2147483647
    OR NOT public.valid_group_slot_schedule(p_slots)
    THEN RAISE EXCEPTION 'invalidSchedule'; END IF;
  SELECT version INTO current_version FROM public.group_slot_schedule WHERE id=1 FOR UPDATE;
  IF current_version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'scheduleConflict'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('time',s->>'time','enabled',(s->>'enabled')::boolean) ORDER BY s->>'time'), '[]'::jsonb)
    INTO normalized FROM jsonb_array_elements(p_slots) s;
  UPDATE public.group_slot_schedule SET slots=normalized, version=version+1, updated_at=now(), updated_by=p_actor WHERE id=1;
  RETURN public.get_group_slot_schedule();
END $$;

CREATE OR REPLACE FUNCTION public.group_pickup_availability()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH today AS (SELECT (now() AT TIME ZONE 'Europe/Stockholm')::date AS day),
  slots AS (
    SELECT day, (s->>'time')::time AS t,
      (day + (s->>'time')::time) AT TIME ZONE 'Europe/Stockholm' AS pickup
    FROM today, public.group_slot_schedule c, jsonb_array_elements(c.slots) s
    WHERE c.id=1 AND (s->>'enabled')::boolean
  )
  SELECT jsonb_build_object('date', (SELECT day FROM today), 'slots', coalesce(jsonb_agg(jsonb_build_object(
    'pickupAt', to_char(pickup AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'time', to_char(t, 'HH24:MI'),
    'available', pickup > now() AND NOT EXISTS (
      SELECT 1 FROM public.group_orders g WHERE g.pickup_at=pickup AND g.status <> 'cancelled'
    )
  ) ORDER BY t), '[]'::jsonb)) FROM slots
  -- Skip local times that do not exist on the spring DST transition day.
  WHERE (pickup AT TIME ZONE 'Europe/Stockholm')::time = t;
$$;

CREATE OR REPLACE FUNCTION public.validate_group_pickup_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $$
DECLARE chosen timestamptz; local_time timestamp; paid_share jsonb; next_share jsonb;
BEGIN
  chosen := (NEW.state->>'pickupAt')::timestamptz;
  IF TG_OP = 'UPDATE' THEN
    IF chosen IS DISTINCT FROM OLD.pickup_at THEN RAISE EXCEPTION 'slotImmutable'; END IF;
    IF OLD.state->>'individualCheckout' = 'true' THEN
      FOR paid_share IN SELECT p FROM jsonb_array_elements(OLD.state->'payments') p WHERE p->>'attemptedAt' IS NOT NULL LOOP
        SELECT p INTO next_share FROM jsonb_array_elements(NEW.state->'payments') p WHERE p->>'id' = paid_share->>'id';
        IF next_share IS NULL OR next_share->>'amount' IS DISTINCT FROM paid_share->>'amount'
          OR next_share->>'memberId' IS DISTINCT FROM paid_share->>'memberId'
          OR NEW.state->>'paymentMethod' IS DISTINCT FROM OLD.state->>'paymentMethod'
          OR (SELECT m->'items' FROM jsonb_array_elements(NEW.state->'members') m WHERE m->>'id'=paid_share->>'memberId')
            IS DISTINCT FROM (SELECT m->'items' FROM jsonb_array_elements(OLD.state->'members') m WHERE m->>'id'=paid_share->>'memberId')
          OR (SELECT jsonb_agg(l) FROM jsonb_array_elements(NEW.state->'lines') l WHERE l->>'memberId'=paid_share->>'memberId')
            IS DISTINCT FROM (SELECT jsonb_agg(l) FROM jsonb_array_elements(OLD.state->'lines') l WHERE l->>'memberId'=paid_share->>'memberId')
        THEN RAISE EXCEPTION 'selectionPaid'; END IF;
      END LOOP;
    END IF;
  ELSIF chosen IS NOT NULL THEN
    -- Serialize new reservations with schedule edits; existing bookings are immutable.
    PERFORM id FROM public.group_slot_schedule WHERE id = 1 FOR SHARE;
    local_time := chosen AT TIME ZONE 'Europe/Stockholm';
    IF chosen <= clock_timestamp()
      OR local_time::date <> (clock_timestamp() AT TIME ZONE 'Europe/Stockholm')::date
      OR NOT EXISTS (
        SELECT 1 FROM public.group_slot_schedule c, jsonb_array_elements(c.slots) s
        WHERE c.id = 1 AND (s->>'enabled')::boolean
          AND local_time::time = (s->>'time')::time
          AND chosen = (local_time::date + (s->>'time')::time) AT TIME ZONE 'Europe/Stockholm'
      )
    THEN RAISE EXCEPTION 'slotUnavailable'; END IF;
  END IF;
  IF chosen IS NOT NULL AND (
    (NEW.state->>'expiresAt')::timestamptz IS NULL
    OR (NEW.state->>'expiresAt')::timestamptz > chosen
    OR (NEW.state->>'paymentDeadline')::timestamptz > chosen
  ) THEN RAISE EXCEPTION 'invalidSlotDeadline'; END IF;
  NEW.pickup_at := chosen;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.valid_group_slot_schedule(jsonb), public.get_group_slot_schedule(),
  public.save_group_slot_schedule(integer,jsonb,uuid), public.group_pickup_availability()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_slot_schedule(), public.save_group_slot_schedule(integer,jsonb,uuid),
  public.group_pickup_availability() TO service_role;
COMMIT;

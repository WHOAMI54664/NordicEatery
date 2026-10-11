-- Run after group-slot-settings. Legacy groups keep their original state and occupy
-- the full slot; new groups reserve their declared headcount, including the host.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS public.group_slot_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  pickup_at timestamptz NOT NULL,
  participant_count integer NOT NULL CHECK (participant_count BETWEEN 1 AND 10),
  expires_at timestamptz NOT NULL,
  group_id uuid REFERENCES public.group_orders(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS group_slot_reservations_expiry ON public.group_slot_reservations(expires_at);
CREATE INDEX IF NOT EXISTS group_slot_reservations_pickup ON public.group_slot_reservations(pickup_at) WHERE group_id IS NULL;
ALTER TABLE public.group_slot_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_slot_reservations FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.group_booked_seats(p_pickup timestamptz)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(sum(coalesce((state->>'participantCount')::integer,10)),0)::integer
  FROM public.group_orders WHERE pickup_at=p_pickup AND status <> 'cancelled';
$$;
DROP INDEX IF EXISTS public.group_orders_one_pickup_slot;
CREATE INDEX IF NOT EXISTS group_orders_pickup_capacity ON public.group_orders(pickup_at)
  WHERE pickup_at IS NOT NULL AND status <> 'cancelled';

CREATE OR REPLACE FUNCTION public.group_pickup_availability()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH today AS (SELECT (now() AT TIME ZONE 'Europe/Stockholm')::date AS day),
  slots AS (
    SELECT day, (s->>'time')::time AS t,
      (day + (s->>'time')::time) AT TIME ZONE 'Europe/Stockholm' AS pickup
    FROM today, public.group_slot_schedule c, jsonb_array_elements(c.slots) s
    WHERE c.id=1 AND (s->>'enabled')::boolean
  ), capacity AS (
    SELECT *, greatest(0,10 - public.group_booked_seats(pickup) - (
      SELECT coalesce(sum(participant_count),0)::integer FROM public.group_slot_reservations
      WHERE pickup_at=pickup AND group_id IS NULL AND expires_at > now()
    )) AS remaining FROM slots
    WHERE (pickup AT TIME ZONE 'Europe/Stockholm')::time = t
  )
  SELECT jsonb_build_object('date',(SELECT day FROM today),'slots',coalesce(jsonb_agg(jsonb_build_object(
    'pickupAt',to_char(pickup AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'time',to_char(t,'HH24:MI'),'capacity',10,'remaining',remaining,
    'available',pickup > now() AND remaining > 0
  ) ORDER BY t),'[]'::jsonb)) FROM capacity;
$$;

CREATE OR REPLACE FUNCTION public.group_slot_availability(p_token_hash text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb; reservation public.group_slot_reservations%ROWTYPE;
BEGIN
  result := public.group_pickup_availability();
  SELECT * INTO reservation FROM public.group_slot_reservations
    WHERE token_hash=p_token_hash AND group_id IS NULL AND expires_at > now();
  IF FOUND THEN
    result := result || jsonb_build_object('reservation',jsonb_build_object(
      'id',reservation.id,'version',reservation.version,
      'pickupAt',to_char(reservation.pickup_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'participantCount',reservation.participant_count,'expiresAt',reservation.expires_at
    ));
    -- A holder can continue even when no unreserved seats remain.
    result := jsonb_set(result,'{slots}',(SELECT coalesce(jsonb_agg(
      CASE WHEN (s->>'pickupAt')::timestamptz=reservation.pickup_at
        THEN s || jsonb_build_object('available',true) ELSE s END
      ORDER BY s->>'time'),'[]'::jsonb) FROM jsonb_array_elements(result->'slots') s));
  ELSE result := result || '{"reservation":null}'::jsonb;
  END IF;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.reserve_group_seats(
  p_token_hash text, p_pickup timestamptz, p_count integer, p_id uuid, p_version integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $$
DECLARE current_reservation public.group_slot_reservations%ROWTYPE; local_time timestamp; occupied integer;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' OR p_count IS NULL OR p_count NOT BETWEEN 1 AND 10
    THEN RAISE EXCEPTION 'invalidInput'; END IF;
  -- A single bounded row lock serializes capacity claims, conversions and schedule edits.
  -- All capacity reads happen after this lock; clients never authorize availability.
  PERFORM id FROM public.group_slot_schedule WHERE id=1 FOR UPDATE;
  local_time := p_pickup AT TIME ZONE 'Europe/Stockholm';
  IF p_pickup IS NULL OR p_pickup <= clock_timestamp()
    OR local_time::date <> (clock_timestamp() AT TIME ZONE 'Europe/Stockholm')::date
    OR NOT EXISTS (SELECT 1 FROM public.group_slot_schedule c,jsonb_array_elements(c.slots) s
      WHERE c.id=1 AND (s->>'enabled')::boolean AND local_time::time=(s->>'time')::time
        AND p_pickup=(local_time::date+(s->>'time')::time) AT TIME ZONE 'Europe/Stockholm')
    THEN RAISE EXCEPTION 'slotUnavailable'; END IF;
  SELECT * INTO current_reservation FROM public.group_slot_reservations WHERE token_hash=p_token_hash FOR UPDATE;
  IF FOUND AND current_reservation.group_id IS NULL AND current_reservation.expires_at > clock_timestamp()
    AND (current_reservation.id IS DISTINCT FROM p_id OR current_reservation.version IS DISTINCT FROM p_version)
    THEN RAISE EXCEPTION 'reservationConflict'; END IF;
  SELECT public.group_booked_seats(p_pickup) + coalesce(sum(participant_count),0)
    INTO occupied FROM public.group_slot_reservations
    WHERE pickup_at=p_pickup AND group_id IS NULL AND expires_at > clock_timestamp() AND token_hash<>p_token_hash;
  IF occupied + p_count > 10 THEN RAISE EXCEPTION 'capacityExhausted'; END IF;
  INSERT INTO public.group_slot_reservations(token_hash,pickup_at,participant_count,expires_at)
    VALUES(p_token_hash,p_pickup,p_count,least(clock_timestamp()+interval '10 minutes',p_pickup))
    ON CONFLICT(token_hash) DO UPDATE SET
      id=CASE WHEN group_slot_reservations.group_id IS NULL AND group_slot_reservations.expires_at > clock_timestamp()
        THEN group_slot_reservations.id ELSE gen_random_uuid() END,
      version=group_slot_reservations.version+1,pickup_at=EXCLUDED.pickup_at,participant_count=EXCLUDED.participant_count,
      expires_at=EXCLUDED.expires_at,group_id=NULL;
  -- Expired records no longer consume capacity; keep retries for one day, then prune a bounded batch.
  DELETE FROM public.group_slot_reservations WHERE id IN (
    SELECT id FROM public.group_slot_reservations WHERE expires_at < clock_timestamp()-interval '1 day'
    ORDER BY expires_at LIMIT 100);
  RETURN public.group_slot_availability(p_token_hash);
END $$;

CREATE OR REPLACE FUNCTION public.release_group_seats(p_token_hash text,p_id uuid,p_version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $$
BEGIN
  PERFORM id FROM public.group_slot_schedule WHERE id=1 FOR UPDATE;
  DELETE FROM public.group_slot_reservations WHERE token_hash=p_token_hash AND id=p_id
    AND version=p_version AND group_id IS NULL;
  RETURN public.group_slot_availability(p_token_hash);
END $$;

CREATE OR REPLACE FUNCTION public.validate_group_pickup_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $$
DECLARE chosen timestamptz; local_time timestamp; paid_share jsonb; next_share jsonb; seats integer; reservation public.group_slot_reservations%ROWTYPE; occupied integer;
BEGIN
  chosen := (NEW.state->>'pickupAt')::timestamptz;
  IF NEW.state ? 'participantCount' AND (
    jsonb_typeof(NEW.state->'participantCount') IS DISTINCT FROM 'number'
    OR NEW.state->>'participantCount' !~ '^([1-9]|10)$'
    OR chosen IS NULL
    OR jsonb_typeof(NEW.state->'members') IS DISTINCT FROM 'array'
    OR jsonb_array_length(NEW.state->'members') > (NEW.state->>'participantCount')::integer
  ) THEN RAISE EXCEPTION 'groupFull'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.state->'participantCount' IS DISTINCT FROM OLD.state->'participantCount'
      OR NEW.state->'reservationId' IS DISTINCT FROM OLD.state->'reservationId'
      THEN RAISE EXCEPTION 'reservationImmutable'; END IF;
    IF OLD.state->>'status' = 'cancelled' AND NEW.state->>'status' <> 'cancelled'
      THEN RAISE EXCEPTION 'reservationImmutable'; END IF;
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
    PERFORM id FROM public.group_slot_schedule WHERE id = 1 FOR UPDATE;
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
    seats := coalesce((NEW.state->>'participantCount')::integer, 10);
    IF NEW.state ? 'participantCount' THEN
      SELECT * INTO reservation FROM public.group_slot_reservations
        WHERE id=(NEW.state->>'reservationId')::uuid FOR UPDATE;
      IF NOT FOUND OR reservation.group_id IS NOT NULL
        OR reservation.expires_at <= clock_timestamp()
        OR reservation.pickup_at <> chosen OR reservation.participant_count <> seats
        THEN RAISE EXCEPTION 'reservationExpired'; END IF;
    END IF;
    SELECT public.group_booked_seats(chosen) + coalesce(sum(r.participant_count),0)
      INTO occupied FROM public.group_slot_reservations r
      WHERE r.pickup_at=chosen AND r.group_id IS NULL AND r.expires_at > clock_timestamp()
        AND r.id IS DISTINCT FROM reservation.id;
    IF occupied + seats > 10 THEN RAISE EXCEPTION 'capacityExhausted'; END IF;
    IF reservation.id IS NOT NULL THEN
      UPDATE public.group_slot_reservations SET group_id=NEW.id WHERE id=reservation.id;
    END IF;
  END IF;
  IF chosen IS NOT NULL AND (
    (NEW.state->>'expiresAt')::timestamptz IS NULL
    OR (NEW.state->>'expiresAt')::timestamptz > chosen
    OR (NEW.state->>'paymentDeadline')::timestamptz > chosen
  ) THEN RAISE EXCEPTION 'invalidSlotDeadline'; END IF;
  NEW.pickup_at := chosen;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.create_reserved_group(p_id uuid,p_state jsonb,p_token_hash text,p_reservation_id uuid,p_version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $$
DECLARE reservation public.group_slot_reservations%ROWTYPE; result public.group_orders%ROWTYPE;
BEGIN
  PERFORM id FROM public.group_slot_schedule WHERE id=1 FOR UPDATE;
  SELECT * INTO reservation FROM public.group_slot_reservations
    WHERE id=p_reservation_id AND token_hash=p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservationExpired'; END IF;
  IF reservation.group_id IS NOT NULL THEN
    SELECT * INTO result FROM public.group_orders WHERE id=reservation.group_id;
    RETURN jsonb_build_object('id',result.id,'version',result.version,'state',result.state);
  END IF;
  IF reservation.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'reservationExpired'; END IF;
  IF reservation.version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'reservationConflict'; END IF;
  IF (p_state->>'pickupAt')::timestamptz IS DISTINCT FROM reservation.pickup_at
    OR (p_state->>'participantCount')::integer IS DISTINCT FROM reservation.participant_count
    OR p_state->'members'->0->>'tokenHash' IS DISTINCT FROM p_token_hash
    OR p_state->>'status' IS DISTINCT FROM 'open'
    THEN RAISE EXCEPTION 'invalidInput'; END IF;
  INSERT INTO public.group_orders(id,version,state)
    VALUES(p_id,1,p_state || jsonb_build_object('reservationId',reservation.id)) RETURNING * INTO result;
  RETURN jsonb_build_object('id',result.id,'version',result.version,'state',result.state);
END $$;

REVOKE ALL ON FUNCTION public.group_booked_seats(timestamptz), public.group_slot_availability(text),
 public.reserve_group_seats(text,timestamptz,integer,uuid,integer),public.release_group_seats(text,uuid,integer),
 public.create_reserved_group(uuid,jsonb,text,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.group_slot_availability(text),
 public.reserve_group_seats(text,timestamptz,integer,uuid,integer),public.release_group_seats(text,uuid,integer),
 public.create_reserved_group(uuid,jsonb,text,uuid,integer) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;

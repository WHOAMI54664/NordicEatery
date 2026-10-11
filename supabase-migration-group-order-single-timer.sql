-- Apply after group-slot-settings and group-slot-capacity. New groups claim portions atomically at
-- creation and use one deadline for selection, payment and slot occupancy.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.group_booked_seats(p_pickup timestamptz)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(sum(coalesce((state->>'participantCount')::integer, 10)), 0)::integer
  FROM public.group_orders
  WHERE pickup_at = p_pickup
    AND status <> 'cancelled'
    AND (
      status = 'submitted'
      OR (
        CASE
          WHEN status IN ('locked', 'paying') THEN
            coalesce(
              nullif(state->>'paymentDeadline', '')::timestamptz,
              nullif(state->>'expiresAt', '')::timestamptz,
              p_pickup
            ) > now()
          ELSE
            coalesce(
              nullif(state->>'deadline', '')::timestamptz,
              nullif(state->>'expiresAt', '')::timestamptz,
              p_pickup
            ) > now()
        END
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.group_pickup_availability()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH today AS (
    SELECT (now() AT TIME ZONE 'Europe/Stockholm')::date AS day
  ), slots AS (
    SELECT day, (s->>'time')::time AS t,
      (day + (s->>'time')::time) AT TIME ZONE 'Europe/Stockholm' AS pickup
    FROM today, public.group_slot_schedule c, jsonb_array_elements(c.slots) s
    WHERE c.id = 1 AND (s->>'enabled')::boolean
  ), capacity AS (
    SELECT *, greatest(0, 10 - public.group_booked_seats(pickup) - (
      SELECT coalesce(sum(participant_count), 0)::integer
      FROM public.group_slot_reservations
      WHERE pickup_at = pickup AND group_id IS NULL AND expires_at > now()
    )) AS remaining
    FROM slots
    WHERE (pickup AT TIME ZONE 'Europe/Stockholm')::time = t
  )
  SELECT jsonb_build_object(
    'date', (SELECT day FROM today),
    'slots', coalesce(jsonb_agg(jsonb_build_object(
      'pickupAt', to_char(pickup AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'time', to_char(t, 'HH24:MI'),
      'capacity', 10,
      'remaining', remaining,
      'available', pickup > now() + interval '20 minutes' AND remaining > 0
    ) ORDER BY t), '[]'::jsonb)
  )
  FROM capacity;
$$;

CREATE OR REPLACE FUNCTION public.group_slot_availability(p_token_hash text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  result jsonb;
  reservation public.group_slot_reservations%ROWTYPE;
BEGIN
  result := public.group_pickup_availability();
  SELECT * INTO reservation
  FROM public.group_slot_reservations
  WHERE token_hash = p_token_hash;

  IF FOUND AND reservation.group_id IS NOT NULL THEN
    result := result || jsonb_build_object(
      'createdGroupId', reservation.group_id,
      'reservation', NULL
    );
  ELSIF FOUND AND reservation.expires_at > now() THEN
    result := result || jsonb_build_object('reservation', jsonb_build_object(
      'id', reservation.id,
      'version', reservation.version,
      'pickupAt', to_char(reservation.pickup_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'participantCount', reservation.participant_count,
      'expiresAt', reservation.expires_at
    ));
    -- Keep a legacy active hold usable while the new create flow converts it.
    result := jsonb_set(result, '{slots}', (
      SELECT coalesce(jsonb_agg(
        CASE WHEN (slot->>'pickupAt')::timestamptz = reservation.pickup_at
          THEN slot || jsonb_build_object('available', true)
          ELSE slot
        END ORDER BY slot->>'time'
      ), '[]'::jsonb)
      FROM jsonb_array_elements(result->'slots') slot
    ));
  ELSE
    result := result || '{"reservation":null}'::jsonb;
  END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_with_capacity(
  p_id uuid,
  p_state jsonb,
  p_token_hash text,
  p_pickup timestamptz,
  p_count integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '5s' AS $$
DECLARE
  reservation public.group_slot_reservations%ROWTYPE;
  result public.group_orders%ROWTYPE;
  availability jsonb;
  reservation_id uuid;
  reservation_version integer;
  group_expiry timestamptz;
BEGIN
  -- Serialize the idempotency check and seat claim with all other capacity changes.
  PERFORM id FROM public.group_slot_schedule WHERE id = 1 FOR UPDATE;

  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$'
    OR p_count IS NULL OR p_count NOT BETWEEN 1 AND 10
    OR jsonb_typeof(p_state->'participantCount') IS DISTINCT FROM 'number'
    OR p_state->>'participantCount' !~ '^([1-9]|10)$'
    OR p_state->>'status' IS DISTINCT FROM 'open'
    OR coalesce(p_state->>'mode', '') NOT IN ('host', 'split')
    OR (p_state->>'pickupAt')::timestamptz IS DISTINCT FROM p_pickup
    OR (p_state->>'participantCount')::integer IS DISTINCT FROM p_count
    OR jsonb_typeof(p_state->'members') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_state->'members') NOT BETWEEN 1 AND p_count
    OR p_state->'members'->0->>'tokenHash' IS DISTINCT FROM p_token_hash
    OR p_state->>'deadline' IS DISTINCT FROM p_state->>'expiresAt'
  THEN
    RAISE EXCEPTION 'invalidInput';
  END IF;

  group_expiry := nullif(p_state->>'expiresAt', '')::timestamptz;
  IF group_expiry IS NULL OR group_expiry <= clock_timestamp()
    OR group_expiry > clock_timestamp() + interval '30 minutes'
    OR group_expiry > p_pickup - interval '20 minutes'
    OR (p_state->>'mode' = 'split' AND
      (p_state->>'paymentDeadline')::timestamptz IS DISTINCT FROM group_expiry)
    OR (p_state->>'mode' = 'host' AND p_state->>'paymentDeadline' IS NOT NULL)
  THEN
    RAISE EXCEPTION 'invalidSlotDeadline';
  END IF;

  SELECT * INTO reservation
  FROM public.group_slot_reservations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  -- A retried create request returns its original group instead of claiming seats twice.
  IF FOUND AND reservation.group_id IS NOT NULL THEN
    SELECT * INTO result FROM public.group_orders WHERE id = reservation.group_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'reservationConflict'; END IF;
    RETURN jsonb_build_object('id', result.id, 'version', result.version, 'state', result.state);
  END IF;

  IF FOUND AND reservation.expires_at > clock_timestamp() THEN
    reservation_id := reservation.id;
    reservation_version := reservation.version;
  ELSE
    reservation_id := NULL;
    reservation_version := NULL;
  END IF;

  -- Legacy unsubmitted holds can be converted in place; new clients make no hold
  -- request before this transaction.
  availability := public.reserve_group_seats(
    p_token_hash, p_pickup, p_count, reservation_id, reservation_version
  );
  reservation_id := (availability->'reservation'->>'id')::uuid;
  reservation_version := (availability->'reservation'->>'version')::integer;
  IF reservation_id IS NULL OR reservation_version IS NULL THEN
    RAISE EXCEPTION 'reservationExpired';
  END IF;

  UPDATE public.group_slot_reservations
  SET expires_at = group_expiry
  WHERE id = reservation_id AND token_hash = p_token_hash AND group_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservationExpired'; END IF;

  RETURN public.create_reserved_group(
    p_id, p_state, p_token_hash, reservation_id, reservation_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_with_capacity(uuid, jsonb, text, timestamptz, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_with_capacity(uuid, jsonb, text, timestamptz, integer)
  TO service_role;
REVOKE ALL ON FUNCTION public.group_slot_availability(text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.group_slot_availability(text)
  TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;

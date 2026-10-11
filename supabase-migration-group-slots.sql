-- Daily Stockholm pickup slots, private one-shot email requests. No emails sent here.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.group_orders ADD COLUMN IF NOT EXISTS pickup_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS group_orders_one_pickup_slot
  ON public.group_orders(pickup_at) WHERE status <> 'cancelled' AND pickup_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_group_pickup_slot()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
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
    local_time := chosen AT TIME ZONE 'Europe/Stockholm';
    IF chosen <= clock_timestamp()
      OR local_time::date <> (clock_timestamp() AT TIME ZONE 'Europe/Stockholm')::date
      OR local_time::time NOT IN (time '10:40', time '11:00')
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
DROP TRIGGER IF EXISTS group_pickup_slot_guard ON public.group_orders;
CREATE TRIGGER group_pickup_slot_guard BEFORE INSERT OR UPDATE ON public.group_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_group_pickup_slot();

-- The existing atomic finalizer remains authoritative for payments and fulfillment.
CREATE OR REPLACE FUNCTION public.copy_group_pickup_to_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.group_order_id IS NOT NULL THEN
    SELECT pickup_at INTO NEW.pickup_at FROM public.group_orders WHERE id = NEW.group_order_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS order_group_pickup ON public.orders;
CREATE TRIGGER order_group_pickup BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.copy_group_pickup_to_order();

CREATE OR REPLACE FUNCTION public.group_pickup_availability()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH today AS (SELECT (now() AT TIME ZONE 'Europe/Stockholm')::date AS day),
  slots AS (
    SELECT day, t, (day + t) AT TIME ZONE 'Europe/Stockholm' AS pickup FROM today,
      (VALUES (time '10:40'), (time '11:00')) AS times(t)
  )
  SELECT jsonb_build_object('date', min(day), 'slots', jsonb_agg(jsonb_build_object(
    'pickupAt', to_char(pickup AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'time', to_char(t, 'HH24:MI'),
    'available', pickup > now() AND NOT EXISTS (
      SELECT 1 FROM public.group_orders g WHERE g.pickup_at = pickup AND g.status <> 'cancelled'
    )
  ) ORDER BY t)) FROM slots;
$$;

CREATE TABLE IF NOT EXISTS public.group_slot_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  locale text NOT NULL CHECK (locale IN ('sv','en','ru','pl')),
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','cancelled','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  first_attempt_at timestamptz, lease_until timestamptz, sent_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS group_slot_one_pending_email ON public.group_slot_notifications(email)
  WHERE status IN ('pending','sending');
CREATE INDEX IF NOT EXISTS group_slot_notification_pending ON public.group_slot_notifications(created_at)
  WHERE status IN ('pending','sending');
ALTER TABLE public.group_slot_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_slot_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.group_slot_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.subscribe_group_slot_email(p_email text, p_locale text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.group_slot_notifications(email,locale) VALUES (lower(trim(p_email)),p_locale)
  ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.claim_group_slot_email()
RETURNS SETOF public.group_slot_notifications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.group_pickup_availability()->'slots') s
    WHERE (s->>'available')::boolean) THEN RETURN; END IF;
  -- Provider deduplication lasts 24h; ambiguous sends must never retry beyond it.
  UPDATE public.group_slot_notifications SET status='failed'
    WHERE status='sending' AND first_attempt_at < now()-interval '23 hours';
  RETURN QUERY WITH candidate AS (
    SELECT id FROM public.group_slot_notifications
    WHERE status='pending' OR (status='sending' AND lease_until < now())
    ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
  ) UPDATE public.group_slot_notifications n SET status='sending',lease_until=now()+interval '5 minutes',
    first_attempt_at=coalesce(n.first_attempt_at,now()) FROM candidate c WHERE n.id=c.id RETURNING n.*;
END $$;

CREATE OR REPLACE FUNCTION public.unsubscribe_group_slot_email(p_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.group_slot_notifications SET status='cancelled'
    WHERE unsubscribe_token=p_token AND status IN ('pending','sending');
$$;
REVOKE ALL ON FUNCTION public.validate_group_pickup_slot(), public.copy_group_pickup_to_order(),
  public.group_pickup_availability(), public.subscribe_group_slot_email(text,text),
  public.claim_group_slot_email(), public.unsubscribe_group_slot_email(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.group_pickup_availability(), public.subscribe_group_slot_email(text,text),
  public.claim_group_slot_email(), public.unsubscribe_group_slot_email(uuid) TO service_role;
COMMIT;

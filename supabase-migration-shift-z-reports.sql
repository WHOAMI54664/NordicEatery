-- Apply before deploying the settings field and worker. Does not send email.
BEGIN;
SET LOCAL lock_timeout = '5s';
-- Recipient settings are private; business_settings is read by the public website.
CREATE TABLE IF NOT EXISTS public.z_report_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
  email text CHECK(email IS NULL OR (length(email)<=254 AND
    email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'))
);
ALTER TABLE public.z_report_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.z_report_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.z_report_settings TO authenticated;
GRANT SELECT ON public.z_report_settings TO service_role;
DROP POLICY IF EXISTS z_report_settings_managers ON public.z_report_settings;
CREATE POLICY z_report_settings_managers ON public.z_report_settings FOR ALL TO authenticated
  USING(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND lower(role::text) IN ('owner','admin')))
  WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND lower(role::text) IN ('owner','admin')));

CREATE TABLE IF NOT EXISTS public.shift_z_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz NOT NULL,
  snapshot jsonb NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  first_attempt_at timestamptz,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opened_at),
  CHECK (closed_at >= opened_at)
);
CREATE INDEX IF NOT EXISTS shift_z_reports_due ON public.shift_z_reports(status,lease_until)
  WHERE status IN ('pending','sending');
-- A checkpoint makes late confirmations and later partial refunds visible in the next Z-report.
-- It contains no customer details and survives deletion of an order.
CREATE TABLE IF NOT EXISTS public.z_report_order_totals (
  order_id uuid PRIMARY KEY,
  refunded_gross numeric NOT NULL,
  refunded_net numeric NOT NULL,
  refunded_vat numeric NOT NULL
);
ALTER TABLE public.shift_z_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_report_order_totals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_z_reports, public.z_report_order_totals FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.shift_z_reports TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.shift_z_reports_id_seq TO service_role;

-- Baseline existing history once; keep an already open shift's sales for its first report.
-- A separate marker is needed even on an empty database to keep reruns idempotent.
CREATE TABLE IF NOT EXISTS public.z_report_initialization (
  id boolean PRIMARY KEY DEFAULT true CHECK(id), gross numeric NOT NULL, refunds numeric NOT NULL
);
ALTER TABLE public.z_report_initialization ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.z_report_initialization FROM PUBLIC, anon, authenticated;
DO $$
DECLARE cutoff timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.z_report_initialization) THEN
    SELECT CASE WHEN is_open THEN coalesce(opened_at,now()) ELSE now() END INTO cutoff
      FROM public.restaurant_shift_state WHERE id=1 FOR UPDATE;
    INSERT INTO public.z_report_order_totals
      SELECT id, coalesce(refunded_gross,0), coalesce(refunded_net,0), coalesce(refunded_vat,0)
      FROM public.orders WHERE order_channel='website'
      AND (paid_at IS NOT NULL OR payment_status::text IN ('paid','refunded'))
      AND coalesce(paid_at,created_at) < coalesce(cutoff,now())
      ON CONFLICT DO NOTHING;
    INSERT INTO public.z_report_initialization
      SELECT true,coalesce(sum(coalesce(o.total_gross,o.total_price)),0),coalesce(sum(o.refunded_gross),0)
      FROM public.orders o JOIN public.z_report_order_totals a ON a.order_id=o.id
      WHERE coalesce(o.currency,'SEK')='SEK';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.capture_shift_z_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  company jsonb;
  transactions jsonb := '[]'::jsonb;
  lines jsonb;
  o public.orders%ROWTYPE;
  previous public.z_report_order_totals%ROWTYPE;
  is_new boolean;
  rg numeric; rn numeric; rv numeric;
  grand jsonb;
  cancelled jsonb;
  unfinished jsonb;
BEGIN
  -- Repeated requests must not move shift boundaries or create duplicate reports.
  IF OLD.is_open IS TRUE AND NEW.is_open IS TRUE THEN
    NEW.opened_at := OLD.opened_at; NEW.opened_by := OLD.opened_by;
    RETURN NEW;
  END IF;
  IF OLD.is_open IS NOT TRUE AND NEW.is_open IS NOT TRUE THEN
    NEW.closed_at := OLD.closed_at; NEW.closed_by := OLD.closed_by;
    RETURN NEW;
  END IF;
  IF OLD.is_open IS NOT TRUE OR NEW.is_open IS NOT FALSE THEN RETURN NEW; END IF;
  IF OLD.opened_at IS NULL THEN RAISE EXCEPTION 'shift_opening_time_missing'; END IF;
  SELECT jsonb_build_object('name',coalesce(nullif(business_name,''),nullif(brand_name,''),'Webbshop'),
    'address',address,'location',location,'email',(SELECT email FROM public.z_report_settings WHERE id=1))
    INTO company FROM public.business_settings ORDER BY id LIMIT 1;

  company := coalesce(company,jsonb_build_object('name','Webbshop','address',null,'location',null,'email',null));

  -- Lock only changed accounting rows. Concurrent payment callbacks not yet visible
  -- remain uncheckpointed and are picked up on the next close, regardless of paid_at.
  FOR o IN
    SELECT s.* FROM public.orders s LEFT JOIN public.z_report_order_totals a ON a.order_id=s.id
    WHERE s.order_channel='website' AND coalesce(s.currency,'SEK')='SEK'
      AND (s.paid_at IS NOT NULL OR s.payment_status::text IN ('paid','refunded'))
      AND (a.order_id IS NULL OR (a.refunded_gross,a.refunded_net,a.refunded_vat)
        IS DISTINCT FROM (coalesce(s.refunded_gross,0),coalesce(s.refunded_net,0),coalesce(s.refunded_vat,0)))
    ORDER BY s.id FOR UPDATE OF s
  LOOP
    SELECT * INTO previous FROM public.z_report_order_totals WHERE order_id=o.id;
    is_new := NOT FOUND;
    IF is_new THEN
      -- Snapshot category labels now; no live catalog reads when retrying an email.
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'category',coalesce(nullif(l->>'category',''),p.category,'Okategoriserat'),
        'quantity',l->'quantity',
        'gross',coalesce((l->>'line_total_gross')::numeric,
          (l->>'price')::numeric*(l->>'quantity')::numeric)
      )), '[]'::jsonb) INTO lines
      FROM jsonb_array_elements(coalesce(o.items,'[]'::jsonb)) l
      LEFT JOIN public.products p ON p.id::text=l->>'id';
      transactions := transactions || jsonb_build_array(jsonb_build_object(
        'kind','sale','orderId',o.id,'method',o.payment_method,'rate',o.vat_rate,
        'gross',coalesce(o.total_gross,o.total_price),'net',o.total_net,'vat',o.total_vat,
        'discount',coalesce(o.discount_gross,0),'fee',coalesce(o.delivery_fee_gross,0),'items',lines));
    END IF;
    rg := coalesce(o.refunded_gross,0)-coalesce(previous.refunded_gross,0);
    rn := coalesce(o.refunded_net,0)-coalesce(previous.refunded_net,0);
    rv := coalesce(o.refunded_vat,0)-coalesce(previous.refunded_vat,0);
    IF rg <> 0 OR rn <> 0 OR rv <> 0 THEN
      transactions := transactions || jsonb_build_array(jsonb_build_object(
        'kind','refund','orderId',o.id,'method',o.payment_method,'rate',o.vat_rate,
        'gross',rg,'net',rn,'vat',rv,'discount',0,'fee',0,'items','[]'::jsonb));
    END IF;
    INSERT INTO public.z_report_order_totals VALUES(o.id,coalesce(o.refunded_gross,0),coalesce(o.refunded_net,0),coalesce(o.refunded_vat,0))
      ON CONFLICT(order_id) DO UPDATE SET refunded_gross=excluded.refunded_gross,
        refunded_net=excluded.refunded_net,refunded_vat=excluded.refunded_vat;
  END LOOP;
  -- Cumulative values use exactly the same captured transactions, including deleted history.
  SELECT snapshot->'grand' INTO grand FROM public.shift_z_reports ORDER BY id DESC LIMIT 1;
  IF grand IS NULL THEN
    SELECT jsonb_build_object('sales',gross,'refunds',refunds) INTO grand FROM public.z_report_initialization;
  END IF;
  SELECT jsonb_build_object(
    'sales',(grand->>'sales')::numeric+coalesce(sum((t->>'gross')::numeric) FILTER(WHERE t->>'kind'='sale'),0),
    'refunds',(grand->>'refunds')::numeric+coalesce(sum((t->>'gross')::numeric) FILTER(WHERE t->>'kind'='refund'),0))
    INTO grand FROM jsonb_array_elements(transactions) t;
  SELECT jsonb_build_object('count',count(*),'gross',coalesce(sum(coalesce(total_gross,total_price)),0))
    INTO cancelled FROM public.orders WHERE order_channel='website' AND status::text='cancelled'
      AND paid_at IS NULL AND payment_status::text NOT IN ('paid','refunded')
      AND created_at >= OLD.opened_at AND created_at < NEW.closed_at;
  SELECT jsonb_build_object('count',count(*),'gross',coalesce(sum(coalesce(total_gross,total_price)),0))
    INTO unfinished FROM public.orders WHERE order_channel='website' AND status::text<>'cancelled'
      AND paid_at IS NULL AND payment_status::text NOT IN ('paid','refunded')
      AND created_at >= OLD.opened_at AND created_at < NEW.closed_at;
  INSERT INTO public.shift_z_reports(opened_at,closed_at,email,snapshot)
    VALUES(OLD.opened_at,NEW.closed_at,nullif(company->>'email',''),jsonb_build_object(
      'company',company-'email','transactions',transactions,'grand',grand,
      'cancelled',cancelled,'unfinished',unfinished));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_shift_z_report() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER restaurant_shift_z_report
  BEFORE UPDATE ON public.restaurant_shift_state
  FOR EACH ROW EXECUTE FUNCTION public.capture_shift_z_report();

CREATE OR REPLACE FUNCTION public.claim_shift_z_report()
RETURNS SETOF public.shift_z_reports LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  -- Provider idempotency expires after 24h. Stop ambiguous retries before expiry.
  UPDATE public.shift_z_reports SET status='failed',lease_until=null
    WHERE status='sending' AND first_attempt_at < now()-interval '23 hours';
  RETURN QUERY WITH candidate AS (
    SELECT r.id FROM public.shift_z_reports r
    WHERE (r.status='pending' OR (r.status='sending' AND r.lease_until < now()))
      AND (r.email IS NOT NULL OR EXISTS(SELECT 1 FROM public.z_report_settings WHERE id=1 AND email IS NOT NULL))
    ORDER BY r.id LIMIT 1 FOR UPDATE SKIP LOCKED
  ) UPDATE public.shift_z_reports r SET status='sending',attempts=r.attempts+1,
      email=coalesce(r.email,(SELECT email FROM public.z_report_settings WHERE id=1)),
      first_attempt_at=coalesce(r.first_attempt_at,now()),lease_until=now()+interval '2 minutes'
    FROM candidate WHERE r.id=candidate.id RETURNING r.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_shift_z_report() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_shift_z_report() TO service_role;
COMMIT;

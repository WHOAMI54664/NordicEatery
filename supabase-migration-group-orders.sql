-- Additive migration. Apply before enabling GROUP_ORDERS_ENABLED.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS public.group_orders (
  id uuid PRIMARY KEY,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  status text GENERATED ALWAYS AS (state->>'status') STORED
    CHECK (status IN ('open', 'locked', 'paying', 'submitted', 'cancelled')),
  next_check_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_orders_reconcile ON public.group_orders (next_check_at)
  WHERE status IN ('open', 'locked', 'paying', 'cancelled');
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_orders TO service_role;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS group_order_id uuid
  REFERENCES public.group_orders(id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_group_order_unique ON public.orders(group_order_id)
  WHERE group_order_id IS NOT NULL;

-- Commit both the kitchen order and the group's terminal state in one transaction.
-- All writers compare version; this row lock also serializes cancel vs fulfillment.
CREATE OR REPLACE FUNCTION public.finalize_group_order(p_id uuid, p_version integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  g public.group_orders%ROWTYPE;
  s jsonb;
  customer jsonb;
  items jsonb;
  total numeric;
  net numeric;
  paid numeric;
  unavailable boolean;
  method text;
  on_site boolean;
BEGIN
  SELECT * INTO g FROM public.group_orders WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF g.status = 'submitted' THEN RETURN true; END IF;
  IF g.version <> p_version OR g.status <> 'paying' THEN RETURN false; END IF;
  s := g.state;
  method := coalesce(s->>'paymentMethod', 'card');
  IF method NOT IN ('card', 'swish', 'cash') THEN RAISE EXCEPTION 'invalid_group_payment_method'; END IF;
  on_site := method = 'cash';
  IF jsonb_array_length(s->'payments') = 0 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(s->'payments') p WHERE p->>'status' IS DISTINCT FROM (CASE WHEN on_site THEN 'pay_on_site' ELSE 'paid' END)
  ) THEN RETURN false; END IF;

  -- Recheck the combined quantity at fulfillment, not only the last browser view.
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT l->>'productId' AS id, sum((l->>'quantity')::integer) AS quantity
      FROM jsonb_array_elements(s->'lines') l GROUP BY l->>'productId'
    ) demand LEFT JOIN public.products p ON p.id::text = demand.id
    WHERE p.id IS NULL OR p.is_available IS NOT TRUE
      OR (p.track_stock AND coalesce(p.stock_quantity, 0) < demand.quantity)
  ) INTO unavailable;

  -- A paid group that can no longer be fulfilled is cancelled and refunded by the worker.
  IF unavailable OR (s->>'paymentDeadline')::timestamptz <= now()
     OR NOT EXISTS (SELECT 1 FROM public.restaurant_shift_state WHERE id = 1 AND is_open)
     OR NOT EXISTS (SELECT 1 FROM public.business_settings WHERE (CASE method WHEN 'card' THEN card_enabled WHEN 'swish' THEN swish_enabled ELSE cash_enabled END) AND
       CASE WHEN s->'customer'->>'deliveryType' = 'delivery' THEN delivery_enabled ELSE pickup_enabled END)
  THEN
    UPDATE public.group_orders SET state = jsonb_set(s, '{status}', '"cancelled"'),
      version = version + 1, updated_at = now(), next_check_at = now() WHERE id = p_id;
    RETURN false;
  END IF;

  SELECT sum((l->>'unitAmount')::numeric * (l->>'quantity')::integer) / 100,
    jsonb_agg(jsonb_build_object(
      'id', l->>'productId', 'name', l->>'name', 'price', (l->>'unitAmount')::numeric / 100,
      'quantity', (l->>'quantity')::integer, 'member_id', l->>'memberId',
      'member_name', l->>'memberName', 'note', l->>'note', 'vat_rate', 6,
      'unit_price_gross', (l->>'unitAmount')::numeric / 100,
      'unit_price_net', round((l->>'unitAmount')::numeric / 106, 2),
      'unit_price_vat', (l->>'unitAmount')::numeric / 100 - round((l->>'unitAmount')::numeric / 106, 2),
      'line_total_gross', (l->>'unitAmount')::numeric * (l->>'quantity')::integer / 100,
      'line_total_net', round((l->>'unitAmount')::numeric * (l->>'quantity')::integer / 106, 2),
      'line_total_vat', (l->>'unitAmount')::numeric * (l->>'quantity')::integer / 100 - round((l->>'unitAmount')::numeric * (l->>'quantity')::integer / 106, 2)
    )) INTO total, items FROM jsonb_array_elements(s->'lines') l;
  SELECT sum((p->>'amount')::numeric) / 100 INTO paid FROM jsonb_array_elements(s->'payments') p;
  IF total IS NULL OR total < 3 OR paid IS DISTINCT FROM total THEN
    RAISE EXCEPTION 'group_payment_total_mismatch';
  END IF;
  net := round(total / 1.06, 2);
  customer := s->'customer';
  INSERT INTO public.orders (
    id, order_number, group_order_id, order_date, customer_name, customer_phone, customer_email,
    address, delivery_type, comment, items, total_price, status, payment_method, payment_status,
    order_channel, sale_type, currency, vat_rate, subtotal_gross, subtotal_net, subtotal_vat,
    delivery_fee_gross, delivery_fee_net, delivery_fee_vat, discount_gross, discount_net, discount_vat,
    loyalty_opt_in, loyalty_reward_used, total_gross, total_net, total_vat, paid_at,
    payment_reference, refund_status, refunded_gross, refunded_net, refunded_vat, updated_at
  ) VALUES (
    (s->>'orderId')::uuid, s->>'orderId', p_id, (now() AT TIME ZONE 'Europe/Stockholm')::date,
    customer->>'name', customer->>'phone', nullif(customer->>'email', ''),
    customer->>'address', (customer->>'deliveryType')::public.delivery_type, nullif(customer->>'comment', ''), items, total,
    'new', method, CASE WHEN on_site THEN 'unpaid' ELSE 'paid' END, 'website', CASE WHEN on_site THEN 'pay_on_site' ELSE 'distance_online' END, 'SEK', 6, total, net, total - net,
    0, 0, 0, 0, 0, 0, false, 0, total, net, total - net, CASE WHEN on_site THEN NULL ELSE now() END,
    'group:' || p_id::text, 'none', 0, 0, 0, now()
  );
  UPDATE public.group_orders SET state = jsonb_set(s, '{status}', '"submitted"'),
    version = version + 1, updated_at = now() WHERE id = p_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_group_order(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_group_order(uuid, integer) TO service_role;
COMMIT;

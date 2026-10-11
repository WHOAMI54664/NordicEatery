-- Apply after group-orders migration, before deploying option-aware checkout.
-- Additive: existing products remain valid and existing orders are untouched.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS modifier_groups jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE OR REPLACE FUNCTION public.valid_menu_modifiers(value jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE g jsonb; o jsonb; minimum integer; maximum integer;
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'array' OR octet_length(value::text) > 65536 THEN RETURN false; END IF;
  IF jsonb_array_length(value) > 8 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(value) x GROUP BY x->>'id' HAVING count(*) > 1) THEN RETURN false; END IF;
  FOR g IN SELECT * FROM jsonb_array_elements(value) LOOP
    IF jsonb_typeof(g) IS DISTINCT FROM 'object' OR coalesce(g->>'id', '') !~ '^[a-zA-Z0-9_-]{1,64}$'
      OR jsonb_typeof(g->'name') IS DISTINCT FROM 'string' OR length(trim(g->>'name')) NOT BETWEEN 1 AND 80
      OR jsonb_typeof(g->'options') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(g->'options') NOT BETWEEN 1 AND 20 THEN RETURN false; END IF;
    IF jsonb_typeof(g->'min') IS DISTINCT FROM 'number' OR jsonb_typeof(g->'max') IS DISTINCT FROM 'number'
      OR (g->>'min')::numeric <> trunc((g->>'min')::numeric) OR (g->>'max')::numeric <> trunc((g->>'max')::numeric) THEN RETURN false; END IF;
    minimum := (g->>'min')::integer; maximum := (g->>'max')::integer;
    IF minimum < 0 OR maximum < 1 OR minimum > maximum OR maximum > jsonb_array_length(g->'options') THEN RETURN false; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(g->'options') x GROUP BY x->>'id' HAVING count(*) > 1) THEN RETURN false; END IF;
    FOR o IN SELECT * FROM jsonb_array_elements(g->'options') LOOP
      IF jsonb_typeof(o) IS DISTINCT FROM 'object' OR coalesce(o->>'id', '') !~ '^[a-zA-Z0-9_-]{1,64}$'
        OR jsonb_typeof(o->'name') IS DISTINCT FROM 'string' OR length(trim(o->>'name')) NOT BETWEEN 1 AND 80
        OR jsonb_typeof(o->'price') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
      IF (o->>'price')::numeric < 0 OR (o->>'price')::numeric > 100000 OR (o->>'price')::numeric <> trunc((o->>'price')::numeric) THEN RETURN false; END IF;
    END LOOP;
  END LOOP;
  RETURN true;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END;
$$;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_modifier_groups_valid;
ALTER TABLE public.products ADD CONSTRAINT products_modifier_groups_valid CHECK (public.valid_menu_modifiers(modifier_groups));
-- Preserve structured selections alongside the immutable human-readable kitchen name.
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
      'selections', coalesce(l->'selections', '[]'::jsonb),
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

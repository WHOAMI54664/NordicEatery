-- Shared daily numbers are allocated only by confirmed payment transitions.
-- Existing paid orders and the existing counter are preserved.
BEGIN;

CREATE OR REPLACE FUNCTION public.generate_daily_order_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Europe/Stockholm')::date;
  next_number integer;
BEGIN
  INSERT INTO public.order_daily_counters (order_date, last_number, updated_at)
  VALUES (today, 1, now())
  ON CONFLICT (order_date) DO UPDATE
    SET last_number = public.order_daily_counters.last_number + 1,
        updated_at = now()
  RETURNING last_number INTO next_number;
  RETURN lpad(next_number::text, greatest(3, length(next_number::text)), '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_paid_order_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- A receipt number already issued for a paid order must never change.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.display_order_number IS NOT NULL
       AND (OLD.payment_status = 'paid' OR OLD.paid_at IS NOT NULL) THEN
      NEW.display_order_number := OLD.display_order_number;
      NEW.order_date := OLD.order_date;
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.payment_status = 'paid' THEN
    NEW.display_order_number := public.generate_daily_order_number();
    NEW.order_date := (now() AT TIME ZONE 'Europe/Stockholm')::date;
  ELSE
    NEW.display_order_number := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_paid_order_number() FROM PUBLIC;
CREATE OR REPLACE TRIGGER orders_assign_paid_number
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.assign_paid_order_number();

COMMIT;

-- Configure nordic_group_order_worker_url to this environment's HTTPS worker URL.
-- The dedicated authentication secret is created in Vault and stays there.
-- Apply only after the migration and worker are deployed.
-- Cancellation/refunds must keep running even while the kitchen is closed.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$
DECLARE worker_url text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'nordic_group_order_cron_secret') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
      'nordic_group_order_cron_secret', 'Group order reconciliation worker only');
  END IF;
  SELECT decrypted_secret INTO worker_url FROM vault.decrypted_secrets
    WHERE name = 'nordic_group_order_worker_url';
  IF worker_url IS NULL OR worker_url !~ '^https://[^/?#]+/api/cron/group-orders$' THEN
    RAISE EXCEPTION 'Configure nordic_group_order_worker_url in Vault for this environment first';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.authorize_group_order_worker(p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_token ~ '^[a-f0-9]{64}$' AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'nordic_group_order_cron_secret' AND decrypted_secret = p_token
  );
$$;
REVOKE ALL ON FUNCTION public.authorize_group_order_worker(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_group_order_worker(text) TO service_role;
SELECT cron.schedule('nordic-group-orders', '* * * * *', $job$
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets
      WHERE name = 'nordic_group_order_worker_url'),
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'nordic_group_order_cron_secret')),
    timeout_milliseconds := 60000
  ) WHERE EXISTS (
    SELECT 1 FROM public.group_orders
    WHERE status IN ('open', 'locked', 'paying', 'cancelled') AND next_check_at <= now()
  );
$job$);
CREATE OR REPLACE FUNCTION public.group_order_worker_ready()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nordic-group-orders' AND active)
    AND EXISTS (SELECT 1 FROM vault.decrypted_secrets
      WHERE name = 'nordic_group_order_cron_secret' AND decrypted_secret ~ '^[a-f0-9]{64}$')
    AND EXISTS (SELECT 1 FROM vault.decrypted_secrets
      WHERE name = 'nordic_group_order_worker_url'
        AND decrypted_secret ~ '^https://[^/?#]+/api/cron/group-orders$');
$$;
REVOKE ALL ON FUNCTION public.group_order_worker_ready() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.group_order_worker_ready() TO service_role;
COMMIT;
-- Do not unschedule while payments or refunds remain unresolved.

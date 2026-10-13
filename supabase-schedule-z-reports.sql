-- Apply after migration and deploy. No sender/customer credentials are exposed.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='nordic_z_report_cron_secret') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),
      'nordic_z_report_cron_secret','Z-report email worker only');
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.authorize_z_report_worker(p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM vault.decrypted_secrets
    WHERE name='nordic_z_report_cron_secret' AND decrypted_secret=p_token);
$$;
REVOKE ALL ON FUNCTION public.authorize_z_report_worker(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_z_report_worker(text) TO service_role;
SELECT cron.schedule('nordic-z-reports','* * * * *',$job$
  SELECT net.http_get(
    url:='https://www.nordiceatery.se/api/cron/z-reports',
    headers:=jsonb_build_object('Authorization','Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='nordic_z_report_cron_secret')),
    timeout_milliseconds:=60000
  ) WHERE EXISTS(SELECT 1 FROM public.shift_z_reports WHERE status='pending' OR
    (status='sending' AND lease_until<now()));
$job$);
COMMIT;
-- Rollback scheduler only: SELECT cron.unschedule('nordic-z-reports');

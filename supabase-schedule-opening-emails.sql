-- Run after deploying the notification API and storing the same CRON_SECRET
-- in Supabase Vault as `nordic_opening_email_cron_secret`.
-- This only calls the worker while the kitchen is open and work is due.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('nordic-opening-emails', '* * * * *', $job$
 select net.http_get(
   url := 'https://www.nordiceatery.se/api/cron/opening-emails',
   headers := jsonb_build_object('Authorization', 'Bearer ' ||
     (select decrypted_secret from vault.decrypted_secrets where name='nordic_opening_email_cron_secret')),
   timeout_milliseconds := 60000
 )
 where exists(select 1 from public.restaurant_shift_state where id=1 and is_open=true)
 and exists(select 1 from public.opening_email_queue where status='pending' or (status='sending' and lease_until < now()))
 and exists(select 1 from vault.decrypted_secrets where name='nordic_opening_email_cron_secret');
$job$);
commit;
-- Rollback: select cron.unschedule('nordic-opening-emails');

-- Run before deploying the notification API. The scoped key stays inside Vault.
-- This only calls the worker while the kitchen is open and work is due.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.secrets where name='nordic_opening_email_cron_secret') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'nordic_opening_email_cron_secret', 'Opening email worker only');
 end if;
end $$;
create or replace function public.authorize_opening_email_worker(p_token text)
returns boolean language sql security definer set search_path=public as $$
 select exists(select 1 from vault.decrypted_secrets where name='nordic_opening_email_cron_secret' and decrypted_secret=p_token);
$$;
revoke all on function public.authorize_opening_email_worker(text) from public,anon,authenticated;
grant execute on function public.authorize_opening_email_worker(text) to service_role;
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

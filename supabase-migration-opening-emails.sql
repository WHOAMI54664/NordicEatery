-- Apply before deploying the email-only notification flow. No emails are sent by this migration.
begin;
create table if not exists public.opening_email_contacts (
 email text primary key,
 locale text not null default 'sv',
 unsubscribe_token uuid not null default gen_random_uuid() unique,
 marketing_consent_at timestamptz,
 consent_version text,
 unsubscribed_at timestamptz
);
create table if not exists public.opening_email_queue (
 id uuid primary key default gen_random_uuid(),
 email text not null references public.opening_email_contacts(email),
 locale text not null default 'sv',
 created_at timestamptz not null default now(),
 status text not null default 'pending' check (status in ('pending','sending','sent','cancelled','failed')),
 first_attempt_at timestamptz,
 lease_until timestamptz,
 sent_at timestamptz
);
create unique index if not exists opening_email_one_pending on public.opening_email_queue(email)
 where status in ('pending','sending');
alter table public.opening_email_contacts enable row level security;
alter table public.opening_email_queue enable row level security;
revoke all on public.opening_email_contacts, public.opening_email_queue from anon, authenticated;
grant all on public.opening_email_contacts, public.opening_email_queue to service_role;

create or replace function public.subscribe_opening_email(p_email text, p_locale text, p_marketing boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
 insert into opening_email_contacts(email,locale,marketing_consent_at,consent_version)
 values(p_email,p_locale,case when p_marketing then now() end,case when p_marketing then 'email-news-v1' end)
 on conflict(email) do update set locale=excluded.locale, unsubscribed_at=null,
 marketing_consent_at=case when p_marketing then now() else opening_email_contacts.marketing_consent_at end,
 consent_version=case when p_marketing then 'email-news-v1' else opening_email_contacts.consent_version end;
 insert into opening_email_queue(email,locale) values(p_email,p_locale) on conflict do nothing;
end $$;

create or replace function public.claim_opening_emails()
returns table(id uuid,email text,locale text,unsubscribe_token uuid)
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from restaurant_shift_state r where r.is_open=true and r.id=1) then return; end if;
 -- Resend idempotency lasts 24 hours. Never automatically retry an ambiguous send beyond that window.
 update opening_email_queue set status='failed' where status='sending' and first_attempt_at < now()-interval '23 hours';
 return query
 with candidates as (
  select q.id from opening_email_queue q
  where q.status='pending' or (q.status='sending' and q.lease_until < now())
  order by q.created_at limit 20 for update skip locked
 ), claimed as (
  update opening_email_queue q set status='sending',lease_until=now()+interval '5 minutes',
   first_attempt_at=coalesce(q.first_attempt_at,now())
  from candidates where q.id=candidates.id returning q.id,q.email,q.locale
 ) select c.id,c.email,c.locale,p.unsubscribe_token from claimed c join opening_email_contacts p on p.email=c.email;
end $$;

create or replace function public.unsubscribe_opening_email(p_token uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 update opening_email_contacts set marketing_consent_at=null,consent_version=null,unsubscribed_at=now() where unsubscribe_token=p_token;
 update opening_email_queue set status='cancelled' where email in
 (select email from opening_email_contacts where unsubscribe_token=p_token) and status in ('pending','sending');
end $$;
revoke all on function public.subscribe_opening_email(text,text,boolean), public.claim_opening_emails(), public.unsubscribe_opening_email(uuid) from public,anon,authenticated;
grant execute on function public.subscribe_opening_email(text,text,boolean), public.claim_opening_emails(), public.unsubscribe_opening_email(uuid) to service_role;
commit;

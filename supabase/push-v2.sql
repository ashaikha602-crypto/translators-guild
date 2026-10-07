-- ═══════════ PHONE NOTIFICATIONS, PART 2 ═══════════
-- Run after push.sql. The sender now runs with the website on Vercel
-- (api/push.js) instead of a Supabase Edge Function, so nothing has to
-- be deployed in Supabase. Safe to run again.

-- the public half of the key pair, for browsers to subscribe with
create or replace function public.push_public_key() returns text
language sql stable security definer set search_path = public as $$
  select vapid_public from push_config where id = 1;
$$;
grant execute on function public.push_public_key() to anon, authenticated;

-- the first key pair the sender makes is kept; later calls change nothing
create or replace function public.push_init_keys(p_public text, p_private jsonb) returns text
language sql security definer set search_path = public as $$
  update push_config set vapid_public = p_public, vapid_private = p_private
   where id = 1 and vapid_public is null;
  select vapid_public from push_config where id = 1;
$$;
grant execute on function public.push_init_keys(text, jsonb) to anon;

-- what to send, only for a caller holding the database's secret
create or replace function public.push_payload_s(p_secret text, n jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cfg push_config; p jsonb;
begin
  select * into cfg from push_config where id = 1;
  if p_secret is null or p_secret <> cfg.hook_secret then raise exception 'forbidden'; end if;
  p := push_payload(n);
  if p is null then return null; end if;
  return p || jsonb_build_object('keys', jsonb_build_object('public', cfg.vapid_public, 'private', cfg.vapid_private));
end $$;
revoke all on function public.push_payload_s(text, jsonb) from public;
grant execute on function public.push_payload_s(text, jsonb) to anon;

-- a device that has gone away
create or replace function public.push_gone(p_secret text, p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is distinct from (select hook_secret from push_config where id = 1) then raise exception 'forbidden'; end if;
  delete from push_subscriptions where endpoint = p_endpoint;
end $$;
revoke all on function public.push_gone(text, text) from public;
grant execute on function public.push_gone(text, text) to anon;

-- send each new notification to the website's sender
create or replace function public.push_on_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare s text;
begin
  select hook_secret into s from push_config where id = 1;
  perform net.http_post(
    url     := 'https://translators-guild-web.vercel.app/api/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', s),
    body    := jsonb_build_object('record', to_jsonb(new)));
  return new;
exception when others then
  return new;
end $$;

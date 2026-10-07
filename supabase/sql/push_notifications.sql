-- Push notifications: run once in the Supabase SQL Editor.
-- Replace PASTE_HOOK_SECRET_HERE with the same value you saved as the
-- PUSH_HOOK_SECRET secret of the send-push function.

-- 1. The devices that have turned notifications on.
create table if not exists public.push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own devices: read" on public.push_subscriptions;
create policy "own devices: read" on public.push_subscriptions
  for select using (user_id = auth.uid());
drop policy if exists "own devices: delete" on public.push_subscriptions;
create policy "own devices: delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- 2. Saving a device. A phone that was used by someone else before
--    belongs to whoever turns notifications on now.
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_ua);
end $$;

create or replace function public.forget_push_subscription(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_subscriptions
   where endpoint = p_endpoint and user_id = auth.uid();
end $$;

revoke all on function public.save_push_subscription(text,text,text,text) from public, anon;
revoke all on function public.forget_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text,text,text,text) to authenticated;
grant execute on function public.forget_push_subscription(text) to authenticated;

-- 3. Every new notification is handed to the send-push function.
create extension if not exists pg_net;

create or replace function public.push_on_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url     := 'https://bldqausimrsusdzfbubk.supabase.co/functions/v1/send-push',
    body    := jsonb_build_object('record', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-push-secret', 'PASTE_HOOK_SECRET_HERE')
  );
  return new;
end $$;

drop trigger if exists push_on_notification on public.notifications;
create trigger push_on_notification
  after insert on public.notifications
  for each row execute function public.push_on_notification();

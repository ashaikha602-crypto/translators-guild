-- Push notifications: run once in the Supabase SQL Editor.
-- PASTE_HOOK_SECRET_HERE must match PUSH_HOOK_SECRET in Vercel's
-- environment variables. It appears once, below.

-- 0. The shared secret, readable only by the functions in this file.
create or replace function public.push_hook_secret()
returns text language sql immutable security definer set search_path = public as $$
  select 'PASTE_HOOK_SECRET_HERE'::text
$$;
revoke all on function public.push_hook_secret() from public, anon, authenticated;

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

-- 2. Saving and forgetting a device. A phone that someone else used
--    before belongs to whoever turns notifications on now.
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
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end $$;

-- Called by the Vercel function when a push service says a device is gone.
create or replace function public.prune_push_subscription(p_endpoint text, p_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_secret is distinct from public.push_hook_secret() then return; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end $$;

revoke all on function public.save_push_subscription(text,text,text,text) from public, anon;
revoke all on function public.forget_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text,text,text,text) to authenticated;
grant execute on function public.forget_push_subscription(text) to authenticated;
grant execute on function public.prune_push_subscription(text,text) to anon, authenticated;

-- 3. Every new notification is sent to Vercel with what it needs.
create extension if not exists pg_net;

create or replace function public.push_on_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec   jsonb := to_jsonb(new);
  subs  jsonb;
  who   record;
  about text;
begin
  if new.actor_id is not distinct from new.user_id then return new; end if;

  select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth))
    into subs from public.push_subscriptions where user_id = new.user_id;
  if subs is null then return new; end if;

  select display_name, title into who from public.profiles where id = new.actor_id;

  begin
    if rec ? 'comment_id' and rec->>'comment_id' is not null then
      select content into about from public.comments where id::text = rec->>'comment_id';
    end if;
    if about is null and rec->>'post_id' is not null then
      select coalesce(title, content) into about from public.posts where id::text = rec->>'post_id';
    end if;
  exception when others then about := null;
  end;

  perform net.http_post(
    url     := 'https://translators-guild.vercel.app/api/send-push',
    body    := jsonb_build_object(
                 'kind', rec->>'kind', 'actor_id', rec->>'actor_id', 'post_id', rec->>'post_id',
                 'actor_name', who.display_name, 'actor_title', who.title,
                 'about', left(about, 200), 'subs', subs),
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-push-secret', public.push_hook_secret())
  );
  return new;
exception when others then
  -- A push must never stop a like, comment or message from being saved.
  return new;
end $$;

drop trigger if exists push_on_notification on public.notifications;
create trigger push_on_notification
  after insert on public.notifications
  for each row execute function public.push_on_notification();

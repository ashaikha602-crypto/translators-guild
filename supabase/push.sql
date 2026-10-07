-- ═══════════ PHONE NOTIFICATIONS (WEB PUSH) ═══════════
-- Every row added to public.notifications (a like, comment, reply,
-- follow, repost or message) is also sent to the member's phone or
-- computer, if they turned notifications on there.
-- Run once in the Supabase SQL Editor, after the "push" Edge Function
-- is deployed. Safe to run again.

create extension if not exists pgcrypto;
create extension if not exists pg_net;

-- the server's own settings: the VAPID key pair (made by the Edge
-- Function the first time it runs) and the secret the database uses to
-- prove a request came from here. No policies: only the service role
-- can read it.
create table if not exists public.push_config (
  id            integer primary key default 1 check (id = 1),
  vapid_public  text,
  vapid_private jsonb,
  hook_secret   text not null default encode(gen_random_bytes(24), 'hex')
);
insert into public.push_config (id) values (1) on conflict (id) do nothing;
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

-- one row per device that said yes
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  device     text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists ps_read   on public.push_subscriptions;
drop policy if exists ps_delete on public.push_subscriptions;
create policy ps_read   on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy ps_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.push_subscriptions to authenticated;

-- a device belongs to whoever signed in on it last
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_device text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into push_subscriptions (endpoint, user_id, p256dh, auth, device)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_device, 120))
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth,
        device = excluded.device, created_at = now();
end $$;
revoke all on function public.push_subscribe(text, text, text, text) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text) to authenticated;

-- which kinds a member does NOT want on their phone
create table if not exists public.push_prefs (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  muted   text[] not null default '{}'
);
alter table public.push_prefs enable row level security;
drop policy if exists pp_all on public.push_prefs;
create policy pp_all on public.push_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.push_prefs to authenticated;

-- Everything the Edge Function needs to word one notification. Read
-- from the notification row as json, so it does not depend on columns
-- this file did not create.
create or replace function public.push_payload(n jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid   uuid := (n->>'user_id')::uuid;
  actor uuid := nullif(n->>'actor_id', '')::uuid;
  kind  text := n->>'kind';
  who   record;
  txt   text;
  post  text;
begin
  if uid is null or uid = actor then return null; end if;
  if exists (select 1 from push_prefs where user_id = uid and kind = any(muted)) then return null; end if;
  if not exists (select 1 from push_subscriptions where user_id = uid) then return null; end if;

  select display_name, title, username into who from profiles where id = actor;

  if n ? 'post_id' and nullif(n->>'post_id', '') is not null then
    select coalesce(nullif(p.title, ''), left(p.content, 80)) into post
      from posts p where p.id::text = n->>'post_id';
  end if;

  if kind = 'message' then
    select m.body into txt from messages m
      join conversations c on c.id = m.conversation_id
     where m.sender_id = actor and (c.member_a = uid or c.member_b = uid)
     order by m.created_at desc limit 1;
  elsif kind in ('comment', 'reply') then
    txt := n->>'comment_text';
    if txt is null then
      select c.content into txt from comments c
       where c.author_id = actor and c.post_id::text = n->>'post_id'
       order by c.created_at desc limit 1;
    end if;
  end if;

  return jsonb_build_object(
    'kind', kind, 'actor_id', actor, 'post_id', n->>'post_id',
    'name', coalesce(who.display_name, 'A member'), 'title', who.title, 'username', who.username,
    'text', left(txt, 300), 'post', post,
    'unread', (select count(*) from notifications where user_id = uid and read_at is null),
    'subs', coalesce((select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth))
                        from push_subscriptions where user_id = uid), '[]'::jsonb));
end $$;
revoke all on function public.push_payload(jsonb) from public, anon, authenticated;
grant execute on function public.push_payload(jsonb) to service_role;

-- hand each new notification to the Edge Function, without ever
-- holding up the like or message that caused it
create or replace function public.push_on_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare s text;
begin
  select hook_secret into s from push_config where id = 1;
  perform net.http_post(
    url     := 'https://bldqausimrsusdzfbubk.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', s),
    body    := jsonb_build_object('record', to_jsonb(new)));
  return new;
exception when others then
  return new;
end $$;
drop trigger if exists push_after_notification on public.notifications;
create trigger push_after_notification after insert on public.notifications
  for each row execute function public.push_on_notification();

-- a member choosing which kinds stay off their phone
create or replace function public.push_set_muted(p_muted text[])
returns void language sql security definer set search_path = public as $$
  insert into push_prefs (user_id, muted) values (auth.uid(), coalesce(p_muted, '{}'))
  on conflict (user_id) do update set muted = excluded.muted;
$$;
revoke all on function public.push_set_muted(text[]) from public, anon;
grant execute on function public.push_set_muted(text[]) to authenticated;

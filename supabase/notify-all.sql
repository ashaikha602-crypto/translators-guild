-- ═══════════ NOTIFY FOLLOWERS OF NEW STORIES AND POSTS ═══════════
-- When a member posts a story or a new post, everyone who follows them
-- gets a notification (and a phone notification, through push.sql).
-- Safe to run again.

-- 1. let the notifications table accept the two new kinds
do $$
declare c record; kinds text[];
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.notifications'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;
  select array_agg(distinct k) into kinds from (
    select kind as k from public.notifications
    union select unnest(array['like','comment','reply','follow','repost','message','story','post'])
  ) s;
  execute format('alter table public.notifications add constraint notifications_kind_chk check (kind = any (%L::text[]))', kinds);
end $$;

-- 2. a story: tell every follower
create or replace function public.notify_followers_story()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, actor_id, kind)
  select f.follower_id, new.author_id, 'story'
    from follows f
   where f.following_id = new.author_id and f.follower_id <> new.author_id;
  return new;
exception when others then
  return new;
end $$;
drop trigger if exists notify_story on public.stories;
create trigger notify_story after insert on public.stories
  for each row execute function public.notify_followers_story();

-- 3. a new post (not a repost): tell every follower
create or replace function public.notify_followers_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if nullif(to_jsonb(new)->>'repost_of', '') is not null then return new; end if;
  insert into notifications (user_id, actor_id, kind, post_id)
  select f.follower_id, new.author_id, 'post', new.id
    from follows f
   where f.following_id = new.author_id and f.follower_id <> new.author_id;
  return new;
exception when others then
  return new;
end $$;
drop trigger if exists notify_post on public.posts;
create trigger notify_post after insert on public.posts
  for each row execute function public.notify_followers_post();

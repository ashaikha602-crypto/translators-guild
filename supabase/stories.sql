-- ═══════════ STORIES ═══════════
-- Photo, short-video and text stories that disappear after 24 hours,
-- with views, highlights kept on the profile, and reports.
-- Run once in the Supabase SQL Editor. Safe to run again.

create extension if not exists pgcrypto;

-- one story
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('photo','video','text')),
  media_path  text,
  body        text check (body is null or char_length(body) <= 500),
  bg          text,
  duration_ms integer not null default 5000 check (duration_ms between 1000 and 16000),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '24 hours'),
  deleted_at  timestamptz,
  check ((kind = 'text' and body is not null) or (kind <> 'text' and media_path is not null))
);
create index if not exists stories_author_idx  on public.stories (author_id, created_at desc);
create index if not exists stories_expires_idx on public.stories (expires_at);

-- a story kept on the owner's profile after its 24 hours
create table if not exists public.story_highlights (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  story_id   uuid not null references public.stories(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 30),
  created_at timestamptz not null default now(),
  unique (story_id, title)
);
create index if not exists story_highlights_owner_idx on public.story_highlights (owner_id, created_at);

-- who has seen which story
create table if not exists public.story_views (
  story_id  uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

-- a member flagging a story
create table if not exists public.story_reports (
  id          bigint generated always as identity primary key,
  story_id    uuid not null references public.stories(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason      text check (reason is null or char_length(reason) <= 500),
  status      text not null default 'open' check (status in ('open','removed','dismissed')),
  created_at  timestamptz not null default now()
);

-- is the signed-in member an administrator? (security definer, so the
-- admins table's own rules do not get in the way of the check)
create or replace function public.is_guild_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.stories          enable row level security;
alter table public.story_highlights enable row level security;
alter table public.story_views      enable row level security;
alter table public.story_reports    enable row level security;

-- stories: members see live stories, highlighted ones, and their own
drop policy if exists stories_read   on public.stories;
drop policy if exists stories_insert on public.stories;
drop policy if exists stories_update on public.stories;
create policy stories_read on public.stories for select to authenticated
  using (deleted_at is null and (
           expires_at > now()
        or author_id = auth.uid()
        or exists (select 1 from public.story_highlights h where h.story_id = stories.id)));
create policy stories_insert on public.stories for insert to authenticated
  with check (author_id = auth.uid());
create policy stories_update on public.stories for update to authenticated
  using (author_id = auth.uid() or public.is_guild_admin())
  with check (author_id = auth.uid() or public.is_guild_admin());

-- highlights: anyone signed in can see them; only the owner, and only
-- with their own stories, can add or remove them
drop policy if exists hl_read   on public.story_highlights;
drop policy if exists hl_insert on public.story_highlights;
drop policy if exists hl_delete on public.story_highlights;
create policy hl_read on public.story_highlights for select to authenticated using (true);
create policy hl_insert on public.story_highlights for insert to authenticated
  with check (owner_id = auth.uid() and exists (
    select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid()));
create policy hl_delete on public.story_highlights for delete to authenticated
  using (owner_id = auth.uid());

-- views: you record your own; you see your own, and who saw your stories
drop policy if exists sv_insert on public.story_views;
drop policy if exists sv_read   on public.story_views;
create policy sv_insert on public.story_views for insert to authenticated
  with check (viewer_id = auth.uid());
create policy sv_read on public.story_views for select to authenticated
  using (viewer_id = auth.uid() or exists (
    select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid()));

-- reports: anyone signed in can report; only administrators read and act
drop policy if exists sr_insert on public.story_reports;
drop policy if exists sr_read   on public.story_reports;
drop policy if exists sr_update on public.story_reports;
create policy sr_insert on public.story_reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy sr_read on public.story_reports for select to authenticated
  using (public.is_guild_admin());
create policy sr_update on public.story_reports for update to authenticated
  using (public.is_guild_admin()) with check (public.is_guild_admin());

grant select, insert, update on public.stories          to authenticated;
grant select, insert, delete on public.story_highlights to authenticated;
grant select, insert         on public.story_views      to authenticated;
grant select, insert, update on public.story_reports    to authenticated;

-- private storage for story pictures and videos (30 MB each)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stories', 'stories', false, 31457280,
        array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists stories_media_insert on storage.objects;
drop policy if exists stories_media_read   on storage.objects;
drop policy if exists stories_media_delete on storage.objects;
create policy stories_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
-- a file can be read only while its story can be read
create policy stories_media_read on storage.objects for select to authenticated
  using (bucket_id = 'stories' and exists (
    select 1 from public.stories s where s.media_path = storage.objects.name));
create policy stories_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

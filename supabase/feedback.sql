-- Messages from the Contact page (questions, suggestions, thanks and
-- problem reports). Applied on 30 October 2026; kept here so it can be
-- run again on a fresh database.
-- Read them in the Supabase dashboard: Table Editor -> public.feedback
-- (sort by created_at, newest first).

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  member_id   uuid references auth.users(id) on delete set null default auth.uid(),
  kind        text not null check (kind in ('note','suggestion','thanks','problem')),
  name        text check (char_length(name) <= 120),
  email       text check (char_length(email) <= 200),
  message     text not null check (char_length(message) between 1 and 2000),
  page        text check (char_length(page) <= 200),
  status      text not null default 'new' check (status in ('new','read','replied','closed')),
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- A signed-in member can send a message in their own name, and nothing
-- else: nobody can read messages through the site. The owner reads them
-- in the Supabase dashboard.
drop policy if exists "members send feedback" on public.feedback;
create policy "members send feedback" on public.feedback
  for insert to authenticated
  with check (member_id = auth.uid());

grant insert on public.feedback to authenticated;

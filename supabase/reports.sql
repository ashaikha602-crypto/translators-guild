-- Reports for the Compass Moderation Team.
-- Run once in the Supabase SQL editor. Reports are then visible in the
-- Table Editor under public.reports (newest first: sort by created_at).

create table if not exists public.reports (
  id               bigint generated always as identity primary key,
  reporter_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  post_id          text,
  comment_id       text,
  reported_user_id uuid,
  reason           text not null check (reason in (
                     'spam','harassment','hate','violence','sexual','child_safety',
                     'self_harm','graphic','privacy','impersonation','ip','illegal','other')),
  details          text check (char_length(details) <= 1000),
  status           text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at       timestamptz not null default now()
);

alter table public.reports enable row level security;

-- A member can file a report in their own name, and nothing else:
-- nobody can read reports through the site, so the person reported
-- never learns who reported them. The Moderation Team reads them in the
-- Supabase dashboard.
drop policy if exists "members file reports" on public.reports;
create policy "members file reports" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

grant insert on public.reports to authenticated;

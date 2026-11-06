-- Each member's glossary. Shown on their profile unless they hide it.
-- Only its owner can change it; the guild admin can read and change any.
create table if not exists public.glossaries (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name text check (name is null or char_length(name) <= 60),
  terms jsonb not null default '[]'::jsonb check (jsonb_typeof(terms) = 'array' and pg_column_size(terms) < 300000),
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.glossaries add column if not exists hidden boolean not null default false;
alter table public.glossaries enable row level security;

drop policy if exists glossaries_read on public.glossaries;
create policy glossaries_read on public.glossaries for select
  using (not hidden or user_id = auth.uid() or public.is_guild_admin());
drop policy if exists glossaries_insert_own on public.glossaries;
create policy glossaries_insert_own on public.glossaries for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists glossaries_update_own on public.glossaries;
create policy glossaries_update_own on public.glossaries for update to authenticated
  using (user_id = auth.uid() or public.is_guild_admin())
  with check (user_id = auth.uid() or public.is_guild_admin());
drop policy if exists glossaries_delete_own on public.glossaries;
create policy glossaries_delete_own on public.glossaries for delete to authenticated
  using (user_id = auth.uid() or public.is_guild_admin());
grant select on public.glossaries to anon, authenticated;
grant insert, update, delete on public.glossaries to authenticated;

-- Whether a member's glossary is hidden, without revealing its terms:
-- 'none' (not saved yet), 'hidden' or 'shown'.
create or replace function public.glossary_state(target uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select case when hidden then 'hidden' else 'shown' end from public.glossaries where user_id = target), 'none');
$$;
grant execute on function public.glossary_state(uuid) to anon, authenticated;

-- Each member's glossary, readable on their profile, written only by them.
create table if not exists public.glossaries (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name text check (name is null or char_length(name) <= 60),
  terms jsonb not null default '[]'::jsonb check (jsonb_typeof(terms) = 'array' and pg_column_size(terms) < 300000),
  updated_at timestamptz not null default now()
);
alter table public.glossaries enable row level security;
drop policy if exists glossaries_read on public.glossaries;
create policy glossaries_read on public.glossaries for select using (true);
drop policy if exists glossaries_insert_own on public.glossaries;
create policy glossaries_insert_own on public.glossaries for insert to authenticated with check (user_id = auth.uid());
drop policy if exists glossaries_update_own on public.glossaries;
create policy glossaries_update_own on public.glossaries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists glossaries_delete_own on public.glossaries;
create policy glossaries_delete_own on public.glossaries for delete to authenticated using (user_id = auth.uid());
grant select on public.glossaries to anon, authenticated;
grant insert, update, delete on public.glossaries to authenticated;

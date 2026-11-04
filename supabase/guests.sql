-- Who continued as a guest: one row per device, written only through
-- guest_ping, read only by admins.
create table if not exists public.guest_visits (
  device_id uuid primary key,
  name text not null check (char_length(name) between 1 and 60),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visits integer not null default 1
);
alter table public.guest_visits enable row level security;
drop policy if exists guest_visits_admin_read on public.guest_visits;
create policy guest_visits_admin_read on public.guest_visits for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
revoke all on public.guest_visits from anon, authenticated;
grant select on public.guest_visits to authenticated;

create or replace function public.guest_ping(p_device uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare n text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 60);
begin
  if p_device is null or char_length(n) < 1 then return; end if;
  insert into public.guest_visits (device_id, name) values (p_device, n)
  on conflict (device_id) do update
    set name = excluded.name,
        visits = guest_visits.visits + case when guest_visits.last_seen < now() - interval '30 minutes' then 1 else 0 end,
        last_seen = now();
end $$;
revoke all on function public.guest_ping(uuid, text) from public;
grant execute on function public.guest_ping(uuid, text) to anon, authenticated;

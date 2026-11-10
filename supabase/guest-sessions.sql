-- Guest sessions: when each guest arrived, whether they are on the site now,
-- and when they left. One row per visit. Written only through guest_beat,
-- read only by the site owner (admins).
create table if not exists public.guest_sessions (
  id bigserial primary key,
  device_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  started_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  left_at timestamptz
);
create index if not exists guest_sessions_device on public.guest_sessions (device_id, last_seen desc);
create index if not exists guest_sessions_recent on public.guest_sessions (last_seen desc);
alter table public.guest_sessions enable row level security;
drop policy if exists guest_sessions_admin_read on public.guest_sessions;
create policy guest_sessions_admin_read on public.guest_sessions for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
revoke all on public.guest_sessions from anon, authenticated;
grant select on public.guest_sessions to authenticated;

-- Called every minute while a guest has the site open, and once as they
-- leave (p_leaving). A visit continues if the last beat was under 5 minutes
-- ago; otherwise a new visit starts. Also keeps guest_visits up to date.
create or replace function public.guest_beat(p_device uuid, p_name text, p_leaving boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  n text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 60);
  sid bigint;
begin
  if p_device is null or char_length(n) < 1 then return; end if;
  perform public.guest_ping(p_device, n);
  select id into sid from public.guest_sessions
    where device_id = p_device and last_seen > now() - interval '5 minutes'
    order by last_seen desc limit 1;
  if sid is null then
    if p_leaving then return; end if;
    insert into public.guest_sessions (device_id, name) values (p_device, n);
  else
    update public.guest_sessions
      set last_seen = now(), name = n,
          left_at = case when p_leaving then now() else null end
      where id = sid;
  end if;
end $$;
revoke all on function public.guest_beat(uuid, text, boolean) from public;
grant execute on function public.guest_beat(uuid, text, boolean) to anon, authenticated;

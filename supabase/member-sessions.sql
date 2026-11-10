-- Member sessions: when each signed-in member arrived, whether they are on the
-- site now, and when they left. One row per visit. Written only through
-- member_beat (for the signed-in user), read only by the site owner (admins).
create table if not exists public.member_sessions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  left_at timestamptz
);
create index if not exists member_sessions_user on public.member_sessions (user_id, last_seen desc);
create index if not exists member_sessions_recent on public.member_sessions (started_at desc);
alter table public.member_sessions enable row level security;
drop policy if exists member_sessions_admin_read on public.member_sessions;
create policy member_sessions_admin_read on public.member_sessions for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
revoke all on public.member_sessions from anon, authenticated;
grant select on public.member_sessions to authenticated;

create or replace function public.member_beat(p_leaving boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare sid bigint; uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  select id into sid from public.member_sessions
    where user_id = uid and last_seen > now() - interval '5 minutes'
    order by last_seen desc limit 1;
  if sid is null then
    if p_leaving then return; end if;
    insert into public.member_sessions (user_id) values (uid);
  else
    update public.member_sessions
      set last_seen = now(), left_at = case when p_leaving then now() else null end
      where id = sid;
  end if;
end $$;
revoke all on function public.member_beat(boolean) from public;
grant execute on function public.member_beat(boolean) to authenticated;

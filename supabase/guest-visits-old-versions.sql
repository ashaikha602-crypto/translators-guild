-- Visit times for guests whose phone still runs an older version of the site.
-- The old version only calls guest_ping (about every 10 minutes while in use),
-- so its visits are timed to the nearest ping: a visit continues while pings
-- arrive within 20 minutes of each other. The new version (guest_beat, every
-- minute) is unchanged and stays exact.
create or replace function public.guest_touch(p_device uuid, n text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.guest_visits (device_id, name) values (p_device, n)
  on conflict (device_id) do update
    set name = excluded.name,
        visits = guest_visits.visits + case when guest_visits.last_seen < now() - interval '30 minutes' then 1 else 0 end,
        last_seen = now();
end $$;
revoke all on function public.guest_touch(uuid, text) from public, anon, authenticated;

create or replace function public.guest_ping(p_device uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare n text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 60); sid bigint;
begin
  if p_device is null or char_length(n) < 1 then return; end if;
  perform public.guest_touch(p_device, n);
  select id into sid from public.guest_sessions
    where device_id = p_device and last_seen > now() - interval '20 minutes'
    order by last_seen desc limit 1;
  if sid is null then insert into public.guest_sessions (device_id, name, left_at) values (p_device, n, now());
  else update public.guest_sessions set last_seen = now(), left_at = now(), name = n where id = sid;
  end if;
end $$;

create or replace function public.guest_beat(p_device uuid, p_name text, p_leaving boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare n text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 60); sid bigint;
begin
  if p_device is null or char_length(n) < 1 then return; end if;
  perform public.guest_touch(p_device, n);
  select id into sid from public.guest_sessions
    where device_id = p_device and last_seen > now() - interval '5 minutes'
    order by last_seen desc limit 1;
  if sid is null then
    if p_leaving then return; end if;
    insert into public.guest_sessions (device_id, name) values (p_device, n);
  else
    update public.guest_sessions set last_seen = now(), name = n,
      left_at = case when p_leaving then now() else null end where id = sid;
  end if;
end $$;
grant execute on function public.guest_ping(uuid, text) to anon, authenticated;
grant execute on function public.guest_beat(uuid, text, boolean) to anon, authenticated;

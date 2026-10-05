-- ═══════════ VERIFIED TICK ═══════════
-- Lets an administrator give or take away the verified tick from the
-- Members tab in Content Admin. Run once in the Supabase SQL Editor.
create or replace function public.is_guild_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.set_member_verified(target uuid, on_off boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_guild_admin() then
    raise exception 'Only an administrator can verify members.';
  end if;
  update public.profiles set verified = on_off where id = target;
end;
$$;
revoke all on function public.set_member_verified(uuid, boolean) from public, anon;
grant execute on function public.set_member_verified(uuid, boolean) to authenticated;

-- the two members verified today
update public.profiles set verified = true where username in ('lulu', 'samiuallah');

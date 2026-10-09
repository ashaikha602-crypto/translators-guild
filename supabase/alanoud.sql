-- 1. Give @alanoud the title "Dr."
update public.profiles set title = 'Dr.' where username = 'alanoud';

-- 2. Make sure her account can follow and be followed
update public.profiles set allow_follows = true where username = 'alanoud';

-- 3. Check: her profile, who she follows, and anything on the follows table
--    that could slow a follow down (the results show at the bottom)
select 'profile' as what, username, title, display_name, allow_follows::text as detail
  from public.profiles where username = 'alanoud'
union all
select 'follows', p.username, null, null, count(f.*)::text
  from public.profiles p left join public.follows f on f.follower_id = p.id
 where p.username = 'alanoud' group by p.username
union all
select 'trigger', tgname, null, null, pg_get_triggerdef(t.oid)
  from pg_trigger t where tgrelid = 'public.follows'::regclass and not tgisinternal
union all
select 'policy', policyname, cmd, null, coalesce(with_check, qual)
  from pg_policies where schemaname = 'public' and tablename = 'follows';

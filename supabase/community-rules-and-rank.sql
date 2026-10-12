-- Community Rules acceptance and rank visibility.
-- Run once in the Supabase SQL editor.

-- 1. Remember on the profile which version of the Community Rules a member
--    accepted, and when, so the pop-up does not return on a new phone.
alter table public.profiles add column if not exists rules_version text;
alter table public.profiles add column if not exists rules_accepted_at timestamptz;

-- 2. "Show my rank": the members who have hidden their rank. The site
--    leaves their rank out of profiles, posts and member lists.
create or replace function public.rank_hidden_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where show_progress = false
$$;
revoke all on function public.rank_hidden_ids() from public;
grant execute on function public.rank_hidden_ids() to anon, authenticated;

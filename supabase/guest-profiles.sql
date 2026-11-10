-- Guests may open members' profiles (read only). The directory hid every row from
-- a visitor with no account ("id <> nobody" is never true), so it now uses
-- "is distinct from", which behaves exactly the same for signed-in members.
create or replace view public.member_directory as
 SELECT pp.id, pp.username, pp.title, pp.display_name, pp.avatar_path, pp.bio, pp.field_of_study,
    pp.marks, pp.rank_slug, pp.allow_follows, pp.verified, pp.verified_note,
    c.followers, c.following,
    ( SELECT i.interest FROM member_interests i
       WHERE i.user_id = pp.id AND i.category = 'translation'::text ORDER BY i.interest LIMIT 1) AS main_interest,
    (EXISTS ( SELECT 1 FROM follows f WHERE f.follower_id = auth.uid() AND f.following_id = pp.id)) AS i_follow,
    (EXISTS ( SELECT 1 FROM follows f WHERE f.follower_id = pp.id AND f.following_id = auth.uid())) AS follows_me,
    p.featured
   FROM profiles_public pp
     JOIN member_counts c ON c.id = pp.id
     JOIN profiles p ON p.id = pp.id
  WHERE pp.id IS DISTINCT FROM auth.uid() AND pp.discoverable;
grant select on public.member_directory to anon;

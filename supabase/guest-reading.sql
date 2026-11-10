-- Guests (no account) may READ what is posted for "Everyone in the Compass":
-- the feed, posts, research, comments, likes counts, attachments and profiles.
-- They can never write: every insert/update/delete policy stays for members only.
-- Posts for "My followers", "People I follow" or "Only me" stay hidden from guests.
grant select on public.feed to anon;

drop policy if exists posts_read_guest on public.posts;
create policy posts_read_guest on public.posts for select to anon
  using (deleted_at is null and visibility = 'members');

drop policy if exists comments_read_guest on public.comments;
create policy comments_read_guest on public.comments for select to anon
  using (exists (select 1 from public.posts p where p.id = comments.post_id and p.deleted_at is null and p.visibility = 'members'));

drop policy if exists attach_read_guest on public.post_attachments;
create policy attach_read_guest on public.post_attachments for select to anon
  using (exists (select 1 from public.posts p where p.id = post_attachments.post_id and p.deleted_at is null and p.visibility = 'members'));

drop policy if exists likes_read_guest on public.post_likes;
create policy likes_read_guest on public.post_likes for select to anon
  using (exists (select 1 from public.posts p where p.id = post_likes.post_id and p.deleted_at is null and p.visibility = 'members'));

-- profiles: who follows whom (for the counts), languages and interests
drop policy if exists follows_read_guest on public.follows;
create policy follows_read_guest on public.follows for select to anon using (true);
drop policy if exists langs_read_guest on public.member_languages;
create policy langs_read_guest on public.member_languages for select to anon using (true);
drop policy if exists interests_read_guest on public.member_interests;
create policy interests_read_guest on public.member_interests for select to anon using (true);

-- the pictures, videos and files attached to those posts
drop policy if exists attach_obj_read_guest on storage.objects;
create policy attach_obj_read_guest on storage.objects for select to anon
  using (bucket_id = 'attachments' and exists (
    select 1 from public.post_attachments a join public.posts p on p.id = a.post_id
     where a.file_path = storage.objects.name and p.deleted_at is null and p.visibility = 'members'));

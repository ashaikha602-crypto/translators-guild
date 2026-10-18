-- Files and photos sent in chats.
-- A private bucket. A file's path is  <conversation id>/<sender id>/<time>-<name>,
-- so only the two members of that conversation can upload into it or read it.
-- Run once in the Supabase SQL editor.

insert into storage.buckets (id, name, public, file_size_limit)
values ('dm-files', 'dm-files', false, 26214400)   -- 25 MB
on conflict (id) do update set public = false, file_size_limit = 26214400;

drop policy if exists dm_files_insert on storage.objects;
drop policy if exists dm_files_read   on storage.objects;
drop policy if exists dm_files_delete on storage.objects;

create policy dm_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dm-files'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.conversations c
                where c.id::text = (storage.foldername(name))[1]
                  and auth.uid() in (c.member_a, c.member_b)));

create policy dm_files_read on storage.objects for select to authenticated
  using (
    bucket_id = 'dm-files'
    and exists (select 1 from public.conversations c
                where c.id::text = (storage.foldername(name))[1]
                  and auth.uid() in (c.member_a, c.member_b)));

create policy dm_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'dm-files' and (storage.foldername(name))[2] = auth.uid()::text);

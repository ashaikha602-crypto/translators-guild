-- Let post attachments carry video (AVT posts) up to 50 MB, the most a
-- file can be on the current Supabase plan.
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp','text/plain',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/x-subrip','text/vtt',
         'video/mp4','video/quicktime','video/webm']
 where id = 'attachments';

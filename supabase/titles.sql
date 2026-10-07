-- Titles: any short title, so the list on the site can change and
-- "Other" can be typed. Replaces the old fixed list. Safe to run again.
alter table public.profiles drop constraint if exists profiles_title_chk;
alter table public.profiles add constraint profiles_title_chk
  check (title is null or char_length(btrim(title)) between 1 and 30);

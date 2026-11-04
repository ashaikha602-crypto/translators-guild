-- 4 November 2026. Chat: unsend, archive, typing; and a guard so that a
-- message's text can only ever be what its sender wrote. Contact page:
-- the feedback inbox, read by admins, with a notification to each admin.

-- ── unsend ──
alter table public.messages add column if not exists deleted_at timestamptz;

drop policy if exists messages_unsend on public.messages;
create policy messages_unsend on public.messages for update to authenticated
  using (sender_id = auth.uid() and in_conversation(conversation_id))
  with check (sender_id = auth.uid() and in_conversation(conversation_id));

-- the recipient may only mark a message read; the sender may only unsend it
create or replace function public.messages_guard() returns trigger
language plpgsql as $$
begin
  if new.body is distinct from old.body or new.sender_id is distinct from old.sender_id
     or new.conversation_id is distinct from old.conversation_id or new.created_at is distinct from old.created_at then
    raise exception 'a message cannot be changed';
  end if;
  if auth.uid() = old.sender_id then
    if new.read_at is distinct from old.read_at then raise exception 'only the recipient marks a message read'; end if;
  else
    if new.deleted_at is distinct from old.deleted_at then raise exception 'only the sender unsends a message'; end if;
  end if;
  return new;
end $$;
drop trigger if exists messages_guard on public.messages;
create trigger messages_guard before update on public.messages
  for each row execute function public.messages_guard();

-- ── archive: each member's own list ──
create table if not exists public.dm_archive (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  archived_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);
alter table public.dm_archive enable row level security;
drop policy if exists dm_archive_own on public.dm_archive;
create policy dm_archive_own on public.dm_archive for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and in_conversation(conversation_id));
grant select, insert, update, delete on public.dm_archive to authenticated;

-- ── typing ──
create table if not exists public.dm_typing (
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
alter table public.dm_typing enable row level security;
drop policy if exists dm_typing_read on public.dm_typing;
create policy dm_typing_read on public.dm_typing for select to authenticated using (in_conversation(conversation_id));
drop policy if exists dm_typing_write on public.dm_typing;
create policy dm_typing_write on public.dm_typing for insert to authenticated
  with check (user_id = auth.uid() and in_conversation(conversation_id));
drop policy if exists dm_typing_touch on public.dm_typing;
create policy dm_typing_touch on public.dm_typing for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and in_conversation(conversation_id));
grant select, insert, update on public.dm_typing to authenticated;

-- ── contact page inbox ──
create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  member_id   uuid references auth.users(id) on delete set null default auth.uid(),
  kind        text not null check (kind in ('note','suggestion','thanks','problem')),
  name        text check (char_length(name) <= 120),
  email       text check (char_length(email) <= 200),
  message     text not null check (char_length(message) between 1 and 2000),
  page        text check (char_length(page) <= 200),
  status      text not null default 'new' check (status in ('new','read','replied','closed')),
  created_at  timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "members send feedback" on public.feedback;
create policy "members send feedback" on public.feedback for insert to authenticated with check (member_id = auth.uid());
drop policy if exists "admins read feedback" on public.feedback;
create policy "admins read feedback" on public.feedback for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
drop policy if exists "admins mark feedback" on public.feedback;
create policy "admins mark feedback" on public.feedback for update to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));
grant insert, select, update on public.feedback to authenticated;

alter table public.notifications drop constraint if exists notifications_kind_chk;
alter table public.notifications add constraint notifications_kind_chk
  check (kind = any ('{comment,follow,like,message,post,reply,repost,story,update,feedback}'::text[]));

create or replace function public.feedback_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, kind)
  select a.user_id, new.member_id, 'feedback' from public.admins a
  where a.user_id is distinct from new.member_id;
  return new;
end $$;
drop trigger if exists feedback_notify on public.feedback;
create trigger feedback_notify after insert on public.feedback
  for each row execute function public.feedback_notify();

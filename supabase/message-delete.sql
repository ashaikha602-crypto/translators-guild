-- Messages: a member can delete (unsend) a message they sent, for both people,
-- and can delete a whole chat from their own inbox. A deleted chat comes back
-- only if a new message arrives, and then shows only the new messages.

drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own on public.messages for delete to authenticated
  using (sender_id = auth.uid() and public.in_conversation(conversation_id));
grant delete on public.messages to authenticated;

create table if not exists public.conversation_clears (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  cleared_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);
alter table public.conversation_clears enable row level security;
drop policy if exists clears_own on public.conversation_clears;
create policy clears_own on public.conversation_clears for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.in_conversation(conversation_id));
revoke all on public.conversation_clears from anon;
grant select, insert, update, delete on public.conversation_clears to authenticated;

create or replace view public.inbox with (security_invoker = true) as
 SELECT c.id, c.last_at,
    CASE WHEN c.member_a = auth.uid() THEN c.member_b ELSE c.member_a END AS other_id,
    pp.username, pp.title, pp.display_name, pp.avatar_path,
    ( SELECT m.body FROM messages m
       WHERE m.conversation_id = c.id AND m.created_at > coalesce(cl.cleared_at, '-infinity')
       ORDER BY m.created_at DESC LIMIT 1) AS last_body,
    ( SELECT m.sender_id FROM messages m
       WHERE m.conversation_id = c.id AND m.created_at > coalesce(cl.cleared_at, '-infinity')
       ORDER BY m.created_at DESC LIMIT 1) AS last_sender,
    ( SELECT count(*) FROM messages m
       WHERE m.conversation_id = c.id AND m.sender_id <> auth.uid() AND m.read_at IS NULL
         AND m.created_at > coalesce(cl.cleared_at, '-infinity')) AS unread
   FROM conversations c
     LEFT JOIN conversation_clears cl ON cl.conversation_id = c.id AND cl.user_id = auth.uid()
     LEFT JOIN profiles_public pp ON pp.id = CASE WHEN c.member_a = auth.uid() THEN c.member_b ELSE c.member_a END
  WHERE cl.cleared_at IS NULL
     OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.created_at > cl.cleared_at);

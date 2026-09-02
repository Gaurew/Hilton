-- Preserve one chronological User/Assistant timeline for every Event Plan.
alter table public.conversation_messages
  drop constraint if exists conversation_messages_role_check;
update public.conversation_messages
set role = case role when 'visitor' then 'user' when 'agent' then 'assistant' else role end;
alter table public.conversation_messages
  add constraint conversation_messages_role_check
  check (role in ('user', 'assistant', 'visitor', 'agent', 'system'));
create index conversation_messages_event_history_idx
  on public.event_conversations(event_id, created_at);

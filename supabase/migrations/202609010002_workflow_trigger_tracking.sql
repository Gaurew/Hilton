alter table public.event_conversations
  add column last_trigger_id uuid,
  add column last_triggered_at timestamptz;

create index event_conversations_last_trigger_id_idx
  on public.event_conversations(last_trigger_id);

create table public.yoxa_webhook_events (
  event_id uuid primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

create table public.yoxa_approval_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.yoxa_webhook_events(event_id) on delete cascade,
  request_id uuid not null unique,
  workflow_run_id text not null,
  conversation_id uuid references public.event_conversations(id) on delete set null,
  title text not null,
  description text not null,
  options jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'answered')),
  selected_option_id text,
  override_message text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index yoxa_approval_tasks_conversation_idx on public.yoxa_approval_tasks(conversation_id, created_at);
create index yoxa_approval_tasks_workflow_run_idx on public.yoxa_approval_tasks(workflow_run_id);

alter table public.yoxa_webhook_events enable row level security;
alter table public.yoxa_approval_tasks enable row level security;

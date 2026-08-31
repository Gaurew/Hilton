create extension if not exists pgcrypto;

create table public.hilton_visitors (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table public.hilton_events (
  id uuid primary key default gen_random_uuid(), visitor_id uuid not null references public.hilton_visitors(id) on delete cascade,
  event_name text not null, property_name text not null, event_date date,
  status text not null default 'approved' check (status in ('draft', 'approved', 'completed', 'cancelled')), created_at timestamptz not null default now()
);
create table public.event_contexts (id uuid primary key default gen_random_uuid(), event_id uuid not null unique references public.hilton_events(id) on delete cascade, approved_context jsonb not null, updated_at timestamptz not null default now());
create table public.event_conversations (id uuid primary key default gen_random_uuid(), visitor_id uuid not null references public.hilton_visitors(id) on delete cascade, event_id uuid references public.hilton_events(id) on delete set null, workflow_run_id text unique, title text, created_at timestamptz not null default now());
create table public.conversation_messages (id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.event_conversations(id) on delete cascade, role text not null check (role in ('visitor', 'agent', 'system')), category text not null, content_markdown text not null, created_at timestamptz not null default now());
create table public.conversation_assets (id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.event_conversations(id) on delete cascade, storage_path text not null unique, file_name text not null, content_type text not null, created_at timestamptz not null default now());

create index hilton_events_visitor_id_idx on public.hilton_events(visitor_id);
create index event_conversations_visitor_id_idx on public.event_conversations(visitor_id);
create index conversation_messages_conversation_id_idx on public.conversation_messages(conversation_id, created_at);
create index conversation_assets_conversation_id_idx on public.conversation_assets(conversation_id);

alter table public.hilton_visitors enable row level security;
alter table public.hilton_events enable row level security;
alter table public.event_contexts enable row level security;
alter table public.event_conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.conversation_assets enable row level security;

insert into storage.buckets (id, name, public) values ('hilton-event-assets', 'hilton-event-assets', false) on conflict (id) do nothing;

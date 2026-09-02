create table public.event_plan_revisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.hilton_events(id) on delete cascade,
  revision_number integer not null,
  status text not null check (status in ('baseline', 'approved')),
  effective_at timestamptz not null default now(),
  summary text not null,
  plan_snapshot jsonb not null,
  event_conversation_id uuid references public.event_conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, revision_number)
);

create index event_plan_revisions_event_id_effective_at_idx on public.event_plan_revisions(event_id, effective_at desc);
alter table public.event_plan_revisions enable row level security;

insert into public.event_plan_revisions (event_id, revision_number, status, effective_at, summary, plan_snapshot)
values
  ('22222222-2222-4222-8222-222222222222', 1, 'baseline', '2026-01-18T15:30:00+05:30', 'Original approved mithai plan.', '{"mithai_boxes":150,"delivery_required_by":"16:00","packaging":"gold presentation packaging","menu":"existing assortment"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 2, 'approved', '2026-01-18T15:48:00+05:30', 'Mithai increase approved; delivery, packaging, and menu preserved.', '{"mithai_boxes":230,"delivery_required_by":"16:00","packaging":"gold presentation packaging","menu":"existing assortment","delta":{"mithai_boxes":80}}'::jsonb),
  ('44444444-4444-4444-8444-444444444444', 1, 'baseline', '2025-10-18T15:30:00+05:30', 'Original approved cocktail layout.', '{"cocktail_tables":20,"bar_seats":60,"guest_count":180}'::jsonb),
  ('55555555-5555-4555-8555-555555555555', 1, 'baseline', '2025-10-18T15:30:00+05:30', 'Original wedding rooming plan.', '{"guest_rooms":150,"welcome_hampers":0}'::jsonb)
on conflict (event_id, revision_number) do update set summary = excluded.summary, plan_snapshot = excluded.plan_snapshot, effective_at = excluded.effective_at;

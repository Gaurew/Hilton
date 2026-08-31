-- Stable, repeatable connector-check data for Hilton Events.
-- These IDs are safe to use only in the non-production demonstration project.
insert into public.hilton_visitors (id)
values ('11111111-1111-4111-8111-111111111111')
on conflict (id) do nothing;

insert into public.hilton_events (id, visitor_id, event_name, property_name, event_date, status)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'The Big Fat Indian Wedding',
  'Hilton Mumbai International Airport, Grand Ballroom',
  '2025-12-14',
  'approved'
)
on conflict (id) do update set
  event_name = excluded.event_name,
  property_name = excluded.property_name,
  event_date = excluded.event_date,
  status = excluded.status;

insert into public.event_contexts (event_id, approved_context)
values (
  '22222222-2222-4222-8222-222222222222',
  '{
    "event_reference": "EVT-HIL-MUM-121425",
    "contract_reference": "CTR-HIL-MUM-8841",
    "banquet_order_reference": "BEO-2025-771",
    "dinner_service": { "start": "20:30", "end": "22:30", "timezone": "IST" },
    "approved_baseline": {
      "dinner_covers": 450,
      "menu_package": "Indian wedding menu package",
      "staffing": "existing service staffing",
      "ballroom_setup": "existing ballroom setup",
      "price_per_dinner_cover_inr": 1800,
      "taxes": "excluded",
      "approved_change_charges": "excluded"
    },
    "dietary_constraints": {
      "vegetarian_meals_identified": true,
      "jain_meals_identified": true,
      "jain_exclusions": ["onion", "garlic", "root vegetables", "cross-contamination"]
    },
    "preserved_constraints": ["event date", "venue", "dinner service window", "service standards"]
  }'::jsonb
)
on conflict (event_id) do update set approved_context = excluded.approved_context, updated_at = now();

insert into public.event_conversations (id, visitor_id, event_id, title)
values (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'Dinner service adjustment'
)
on conflict (id) do update set title = excluded.title;

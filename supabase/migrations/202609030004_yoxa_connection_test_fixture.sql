-- Safe, isolated data for YOXA API Connection Checks. Never use these IDs for a live event change.
insert into public.hilton_visitors (id)
values ('88888888-8888-4888-8888-888888888888')
on conflict (id) do nothing;

insert into public.hilton_events (id, visitor_id, event_name, property_name, event_date, status, slug)
values (
  '99999999-9999-4999-8999-999999999999',
  '88888888-8888-4888-8888-888888888888',
  'YOXA API Connection Test — Wedding',
  'Hilton Lakeside Chicago (Test Only)',
  '2026-09-19',
  'approved',
  'yoxa-api-connection-test'
)
on conflict (id) do update set event_name = excluded.event_name, property_name = excluded.property_name, event_date = excluded.event_date, status = excluded.status, slug = excluded.slug;

insert into public.event_contexts (event_id, approved_context)
values (
  '99999999-9999-4999-8999-999999999999',
  '{"scenario_key":"yoxa_api_connection_test","event_reference":"YOXA-TEST-001","summary":"Safe connection-check fixture. It is not a live event plan.","event_baseline":{"guest_count":160,"rooms":48,"room_nights":96,"dinner_tables":16,"guest_count_with_buffer":168,"meals":178,"total_estimated_cost_usd":125614.00},"source":"YOXA API connection test fixture"}'::jsonb
)
on conflict (event_id) do update set approved_context = excluded.approved_context, updated_at = now();

insert into public.event_conversations (id, visitor_id, event_id, title)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '88888888-8888-4888-8888-888888888888',
  '99999999-9999-4999-8999-999999999999',
  'YOXA API connection test conversation'
)
on conflict (id) do update set visitor_id = excluded.visitor_id, event_id = excluded.event_id, title = excluded.title;

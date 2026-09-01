-- Three repeatable event contexts used by the Hilton Events client demo.
-- They remain template records; start-event-change copies them into each browser workspace.
insert into public.hilton_visitors (id)
values ('11111111-1111-4111-8111-111111111111')
on conflict (id) do nothing;

insert into public.hilton_events (id, visitor_id, event_name, property_name, event_date, status)
values
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'Cocktail Event Table Rearrangements', 'Hilton Grand Ballroom pre-function area', '2025-10-18', 'approved'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'The Big Fat Indian Wedding', 'Hilton Grand Ballroom', '2026-01-18', 'approved'),
  ('55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', 'Hilton Wedding Welcome Hampers', 'Hilton wedding event', '2025-10-18', 'approved')
on conflict (id) do update set
  visitor_id = excluded.visitor_id,
  event_name = excluded.event_name,
  property_name = excluded.property_name,
  event_date = excluded.event_date,
  status = excluded.status;

insert into public.event_contexts (event_id, approved_context)
values
  ('44444444-4444-4444-8444-444444444444', $json${"scenario_key":"cocktail_tables","change_request_id":"CR-CHI-1018-047","event_reference":"HWE-CHI-2025-1018","summary":"Add 10 cocktail tables and 20 bar seats to the cocktail event. The 20 bar seats are a planning assumption of two seats per new table until confirmed by the customer.","event_baseline":{"event_type":"Hilton wedding reception","guest_count":180,"event_date":"2025-10-18","cocktail_service":"18:00–20:00","venue":"Grand Ballroom pre-function area","cocktail_tables":20,"bar_seats":60,"package":"beverage service package","contracted_package_value_usd":52000},"floor_plan_controls":{"service_aisles":"8-foot","fire_egress_corridor":"12-foot","placement":"west and south perimeter","must_not_conflict_with":["existing bar","buffet","DJ","guest-flow zones"]},"preserved_constraints":["guest count","menu","event timing","contracted ballroom"],"vendor_commitment_displaced":false,"planning_assumption_requiring_confirmation":"20 additional bar seats, two per new cocktail table"}$json$::jsonb),
  ('22222222-2222-4222-8222-222222222222', $json${"scenario_key":"mithai_boxes","event_reference":"HIL-WED-2026-0118","summary":"Increase mithai boxes from 150 to 230, a net increase of 80 boxes.","event_baseline":{"event_type":"wedding reception","event_date":"2026-01-18","venue":"Hilton Grand Ballroom","guest_count":300,"mithai_boxes":150,"delivery_required_by":"16:00","assortment":"existing assortment","packaging":"gold presentation packaging","contracted_rate_inr_per_box":400},"preserved_constraints":["event date","venue","menu","dietary requirements","schedule","delivery window","packaging style"],"requested_change":{"mithai_boxes":230,"net_increase":80,"delivery_window":"16:00 on event day"}}$json$::jsonb),
  ('55555555-5555-4555-8555-555555555555', $json${"scenario_key":"welcome_hampers","summary":"Add 25 welcome hampers, one for each newly added room, for a late-stage Hilton wedding event.","event_baseline":{"event_type":"Hilton wedding event","guest_rooms":150,"contracted_welcome_hampers":0,"newly_added_rooms":25,"delivery":"guest-room placement before check-in on 2025-10-18"},"required_assessments":["vendor feasibility","incremental commercial calculation","approval before operational record updates"],"operational_owner":"Hilton property coordination","restrictions":{"dietary":null,"allergy":null,"branding":null},"reconciliation":"Reconcile separately from the original room and catering package"}$json$::jsonb)
on conflict (event_id) do update set approved_context = excluded.approved_context, updated_at = now();

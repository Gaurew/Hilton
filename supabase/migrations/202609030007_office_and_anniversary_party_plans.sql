-- Adds two fully configured party plans after the intentional one-event cleanup.
-- The shared normalized event-plan tables retain consistent YOXA/UI behaviour.

-- ---------------------------------------------------------------------------
-- 1. Event master records
-- ---------------------------------------------------------------------------
insert into public.hilton_events (id, visitor_id, event_name, property_name, event_date, status, slug)
values
  (
    '88888888-8888-4888-8888-888888888888',
    (select visitor_id from public.hilton_events where id = '22222222-2222-4222-8222-222222222222'),
    'Hilton Office Milestone Party',
    'Hilton Lakeside Chicago',
    '2026-11-14',
    'approved',
    'office-milestone-party'
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    (select visitor_id from public.hilton_events where id = '22222222-2222-4222-8222-222222222222'),
    '18th Anniversary Party',
    'Hilton Lakeside Chicago',
    '2027-01-18',
    'approved',
    'eighteenth-anniversary-party'
  )
on conflict (id) do update set
  visitor_id = excluded.visitor_id,
  event_name = excluded.event_name,
  property_name = excluded.property_name,
  event_date = excluded.event_date,
  status = excluded.status,
  slug = excluded.slug;

-- ---------------------------------------------------------------------------
-- 2. YOXA context and approved-plan snapshots
-- ---------------------------------------------------------------------------
insert into public.event_contexts (event_id, approved_context)
values
  ('88888888-8888-4888-8888-888888888888', $json${
    "scenario_key": "office_milestone_party",
    "event_reference": "HIL-OFF-261114",
    "event_type": "office_party",
    "purpose": "Celebrate the organisation's milestone achievement.",
    "host": "Hilton Corporate Operations",
    "venue": "Hilton Lakeside Chicago - Lake Room & Grand Foyer",
    "booking_dates": "2026-11-14",
    "event_date": "2026-11-14",
    "summary": "Approved office milestone party baseline: 80 attendees, 10 banquet tables, 88 catered meals including 8 crew meals, 84 place settings with buffer, and $27,044 before taxes and gratuities.",
    "event_baseline": {
      "guest_count": 80,
      "purpose": "milestone achievement",
      "table_size": 8,
      "dinner_tables": 10,
      "guest_count_with_buffer": 84,
      "rooms": 0,
      "room_nights": 0,
      "vendor_crew_meals": 8,
      "meals": 88,
      "brunch_guests": 0,
      "shuttle_capacity_per_coach": 40,
      "required_shuttles": 0,
      "styling_headcount": 0,
      "total_estimated_cost_usd": 27044.00
    },
    "preserved_constraints": ["Lake Room footprint", "corporate awards programme", "approved catering service model"],
    "source": "CONFIRMED OFFICE MILESTONE PARTY PLAN | Hilton + YOXA Demo"
  }$json$::jsonb),
  ('99999999-9999-4999-8999-999999999999', $json${
    "scenario_key": "eighteenth_anniversary_party",
    "event_reference": "HIL-ANN-270118",
    "event_type": "anniversary_party",
    "purpose": "Celebrate 18 years together.",
    "host": "Priya & Rohan Mehta",
    "venue": "Hilton Lakeside Chicago - Grand Ballroom & Garden Terrace",
    "booking_dates": "2027-01-17 to 2027-01-18",
    "event_date": "2027-01-18",
    "summary": "Approved 18th-anniversary party baseline: 90 attendees, 9 dinner tables, 100 catered meals including 10 crew meals, 95 place settings with buffer, 12 guest rooms, and $44,034 before taxes and gratuities.",
    "event_baseline": {
      "guest_count": 90,
      "purpose": "18th anniversary celebration",
      "table_size": 10,
      "dinner_tables": 9,
      "guest_count_with_buffer": 95,
      "rooms": 12,
      "room_nights": 24,
      "vendor_crew_meals": 10,
      "meals": 100,
      "brunch_guests": 0,
      "shuttle_capacity_per_coach": 40,
      "required_shuttles": 1,
      "styling_headcount": 2,
      "total_estimated_cost_usd": 44034.00
    },
    "preserved_constraints": ["Grand Ballroom availability", "anniversary recommitment ceremony", "approved plated dinner service"],
    "source": "CONFIRMED 18TH ANNIVERSARY PARTY PLAN | Hilton + YOXA Demo"
  }$json$::jsonb)
on conflict (event_id) do update set approved_context = excluded.approved_context, updated_at = now();

insert into public.event_plan_revisions (event_id, revision_number, status, effective_at, summary, plan_snapshot)
values
  ('88888888-8888-4888-8888-888888888888', 1, 'baseline', '2026-09-02T10:00:00+05:30', 'Confirmed office milestone party baseline — 80 attendees, $27,044.', $json${
    "event_reference": "HIL-OFF-261114", "event_type": "office_party", "purpose": "milestone achievement",
    "guest_count": 80, "rooms": 0, "room_nights": 0, "dinner_tables": 10,
    "guest_count_with_buffer": 84, "meals": 88, "total_estimated_cost_usd": 27044.00
  }$json$::jsonb),
  ('99999999-9999-4999-8999-999999999999', 1, 'baseline', '2026-09-02T10:00:00+05:30', 'Confirmed 18th-anniversary party baseline — 90 attendees, $44,034.', $json${
    "event_reference": "HIL-ANN-270118", "event_type": "anniversary_party", "purpose": "18 years",
    "guest_count": 90, "rooms": 12, "room_nights": 24, "dinner_tables": 9,
    "guest_count_with_buffer": 95, "meals": 100, "total_estimated_cost_usd": 44034.00
  }$json$::jsonb)
on conflict (event_id, revision_number) do update set
  status = excluded.status,
  effective_at = excluded.effective_at,
  summary = excluded.summary,
  plan_snapshot = excluded.plan_snapshot;

-- ---------------------------------------------------------------------------
-- 3. Normalized approved plan profiles
-- ---------------------------------------------------------------------------
insert into public.event_wedding_profiles (
  event_id, event_code, couple_name, venue_name, venue_display_name,
  booking_start_date, booking_end_date, wedding_date,
  guest_count, table_size, shuttle_capacity_per_coach, vendor_crew_meals, styling_headcount,
  rooms, room_nights, dinner_tables, guest_count_with_buffer, meals, brunch_guests, required_shuttles, required_security_officer_hours,
  total_estimated_cost, raw_source
) values
  ('88888888-8888-4888-8888-888888888888', 'HIL-OFF-261114', 'Hilton Corporate Operations', 'Hilton Lakeside Chicago', 'Hilton Lakeside Chicago - Lake Room & Grand Foyer',
   '2026-11-14', '2026-11-14', '2026-11-14',
   80, 8, 40, 8, 0, 0, 0, 10, 84, 88, 0, 0, 12, 27044.00,
   $json${"event_type":"office_party","purpose":"milestone achievement","source":"CONFIRMED OFFICE MILESTONE PARTY PLAN | Hilton + YOXA Demo","notes":"Approved baseline before taxes, gratuities, and unlisted incidentals."}$json$::jsonb),
  ('99999999-9999-4999-8999-999999999999', 'HIL-ANN-270118', 'Priya & Rohan Mehta', 'Hilton Lakeside Chicago', 'Hilton Lakeside Chicago - Grand Ballroom & Garden Terrace',
   '2027-01-17', '2027-01-18', '2027-01-18',
   90, 10, 40, 10, 2, 12, 24, 9, 95, 100, 0, 1, 12, 44034.00,
   $json${"event_type":"anniversary_party","purpose":"18 years together","source":"CONFIRMED 18TH ANNIVERSARY PARTY PLAN | Hilton + YOXA Demo","notes":"Approved baseline before taxes, gratuities, and unlisted incidentals."}$json$::jsonb)
on conflict (event_id) do update set
  event_code = excluded.event_code,
  couple_name = excluded.couple_name,
  venue_name = excluded.venue_name,
  venue_display_name = excluded.venue_display_name,
  booking_start_date = excluded.booking_start_date,
  booking_end_date = excluded.booking_end_date,
  wedding_date = excluded.wedding_date,
  guest_count = excluded.guest_count,
  table_size = excluded.table_size,
  shuttle_capacity_per_coach = excluded.shuttle_capacity_per_coach,
  vendor_crew_meals = excluded.vendor_crew_meals,
  styling_headcount = excluded.styling_headcount,
  rooms = excluded.rooms,
  room_nights = excluded.room_nights,
  dinner_tables = excluded.dinner_tables,
  guest_count_with_buffer = excluded.guest_count_with_buffer,
  meals = excluded.meals,
  brunch_guests = excluded.brunch_guests,
  required_shuttles = excluded.required_shuttles,
  required_security_officer_hours = excluded.required_security_officer_hours,
  total_estimated_cost = excluded.total_estimated_cost,
  raw_source = excluded.raw_source,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. Run-of-show
-- ---------------------------------------------------------------------------
delete from public.event_schedule_items
where event_id in ('88888888-8888-4888-8888-888888888888', '99999999-9999-4999-8999-999999999999');

insert into public.event_schedule_items (event_id, sort_order, schedule_date, start_time, end_time, display_time, event_name, space, attendees, dependencies) values
  ('88888888-8888-4888-8888-888888888888', 1, '2026-11-14', '15:00', '17:30', '3:00-5:30 PM', 'Production & banquet set-up', 'Lake Room', 18, 'AV, décor, banquet operations'),
  ('88888888-8888-4888-8888-888888888888', 2, '2026-11-14', '18:00', '18:30', '6:00-6:30 PM', 'Guest arrival and welcome reception', 'Grand Foyer', 80, 'Registration, signage, bar service'),
  ('88888888-8888-4888-8888-888888888888', 3, '2026-11-14', '18:30', '19:15', '6:30-7:15 PM', 'Milestone achievement awards', 'Lake Room', 80, 'Stage, AV, presentation content'),
  ('88888888-8888-4888-8888-888888888888', 4, '2026-11-14', '19:15', '21:00', '7:15-9:00 PM', 'Celebration dinner and entertainment', 'Lake Room', 80, 'Catering, music, lighting'),
  ('88888888-8888-4888-8888-888888888888', 5, '2026-11-14', '21:00', '22:00', '9:00-10:00 PM', 'Close and breakdown', 'Lake Room', 18, 'Security, loading, banquet operations'),
  ('99999999-9999-4999-8999-999999999999', 1, '2027-01-17', '15:00', '21:00', '3:00-9:00 PM', 'Guest check-in', 'Hotel Guest Rooms', 24, 'Room block, welcome amenities'),
  ('99999999-9999-4999-8999-999999999999', 2, '2027-01-18', '16:30', '17:00', '4:30-5:00 PM', '18th-anniversary recommitment', 'Garden Terrace', 90, 'Officiant, décor, ceremony audio'),
  ('99999999-9999-4999-8999-999999999999', 3, '2027-01-18', '17:00', '18:00', '5:00-6:00 PM', 'Cocktail reception', 'Grand Foyer', 90, 'Bar, canapés, photography'),
  ('99999999-9999-4999-8999-999999999999', 4, '2027-01-18', '18:00', '22:00', '6:00-10:00 PM', 'Anniversary dinner and celebration', 'Grand Ballroom', 90, 'Catering, tables, entertainment, cake'),
  ('99999999-9999-4999-8999-999999999999', 5, '2027-01-18', '22:00', '23:00', '10:00-11:00 PM', 'Farewell and breakdown', 'Hotel Main Entrance', 18, 'Transport, security, loading');

-- ---------------------------------------------------------------------------
-- 5. Confirmed vendors and commercial baseline
-- ---------------------------------------------------------------------------
delete from public.event_vendor_services
where event_id in ('88888888-8888-4888-8888-888888888888', '99999999-9999-4999-8999-999999999999');

insert into public.event_vendor_services (event_id, sort_order, category, confirmed_vendor, confirmed_scope, pricing_basis, unit_rate, confirmed_qty, estimated_cost, dependency_formula_driver, latest_change_cutoff, change_ripple) values
  ('88888888-8888-4888-8888-888888888888', 1, 'Venue', 'Hilton Lakeside Chicago', 'Lake Room and Grand Foyer rental, banquet setup, service charge', 'per event', 7500.00, 1, 7500.00, 'Fixed approved event footprint', 'Subject to hotel contract', 'Room, AV, catering and staffing'),
  ('88888888-8888-4888-8888-888888888888', 2, 'Catering', 'Harvest & Hearth Catering', 'Dinner, canapés and 8 crew meals', 'per meal', 85.00, 88, 7480.00, '80 guests plus 8 crew meals', '72h before event', 'Meals, staffing and tabletop'),
  ('88888888-8888-4888-8888-888888888888', 3, 'AV / Production', 'Signal House Productions', 'Awards stage, projection, microphones and lighting', 'per event', 2800.00, 1, 2800.00, 'Awards programme and room layout', '24h', 'Power, staging and run-of-show'),
  ('88888888-8888-4888-8888-888888888888', 4, 'Entertainment', 'Blue Note Events', 'Celebration DJ and background music', 'per event', 2200.00, 1, 2200.00, 'Dinner programme duration', '24h', 'AV and schedule'),
  ('88888888-8888-4888-8888-888888888888', 5, 'Décor', 'Evergreen & Rose Studio', 'Milestone backdrop, table décor and branded moments', 'per event', 2000.00, 1, 2000.00, 'Corporate theme and branding', '48h', 'Signage and room layout'),
  ('88888888-8888-4888-8888-888888888888', 6, 'Furniture', 'Foundry Event Rentals', '84 banquet chairs including operational buffer', 'per item/day', 10.00, 84, 840.00, '80 guests with 5% buffer', '8h', 'Capacity and seating plan'),
  ('88888888-8888-4888-8888-888888888888', 7, 'Furniture', 'Foundry Event Rentals', '10 banquet tables', 'per item/day', 14.00, 10, 140.00, '80 guests at 8 per table', '8h', 'Room layout'),
  ('88888888-8888-4888-8888-888888888888', 8, 'Tabletop', 'Tabletop Society', 'Place settings, glassware and linens', 'per place setting', 12.00, 84, 1008.00, '80 guests with 5% buffer', '6h', 'Catering and set-up'),
  ('88888888-8888-4888-8888-888888888888', 9, 'Security', 'Premier Event Security', 'Guest arrival and event-floor coverage', 'per officer-hour', 48.00, 12, 576.00, 'Minimum two officers for six hours', '4h', 'Guest flow and venue access'),
  ('88888888-8888-4888-8888-888888888888', 10, 'Photography', 'Northstar Event Co.', 'Awards and celebration photography', 'per event', 1900.00, 1, 1900.00, 'Awards programme', '24h', 'Run-of-show'),
  ('88888888-8888-4888-8888-888888888888', 11, 'Signage', 'Signpost Studio', 'Welcome, agenda and awards signage', 'per event', 600.00, 1, 600.00, 'Guest count and programme', '6h', 'Room layout and communications'),
  ('99999999-9999-4999-8999-999999999999', 1, 'Venue', 'Hilton Lakeside Chicago', 'Grand Ballroom, Garden Terrace and Grand Foyer rental', 'per event', 9000.00, 1, 9000.00, 'Fixed approved venue footprint', 'Subject to hotel contract', 'AV, catering, décor and staffing'),
  ('99999999-9999-4999-8999-999999999999', 2, 'Hotel Rooms', 'Hilton Lakeside Chicago', '12-room, two-night guest room block', 'per room-night', 279.00, 24, 6696.00, '12 rooms times two nights', '72h before arrival', 'Amenities and guest transport'),
  ('99999999-9999-4999-8999-999999999999', 3, 'Catering', 'Harvest & Hearth Catering', 'Plated dinner, cocktail canapés and 10 crew meals', 'per meal', 105.00, 100, 10500.00, '90 guests plus 10 crew meals', '72h before event', 'Meals, staffing and tabletop'),
  ('99999999-9999-4999-8999-999999999999', 4, 'Décor', 'Evergreen & Rose Studio', 'Anniversary floral, candles, backdrop and tablescapes', 'per event', 3800.00, 1, 3800.00, '18th-anniversary design package', '48h', 'Signage and room layout'),
  ('99999999-9999-4999-8999-999999999999', 5, 'Photography', 'Northstar Event Co.', 'Six-hour anniversary photo coverage', 'per event', 2600.00, 1, 2600.00, 'Celebration timeline', '24h', 'Run-of-show'),
  ('99999999-9999-4999-8999-999999999999', 6, 'Entertainment', 'Blue Note Events', 'Dinner DJ and recommitment ceremony audio', 'per event', 1700.00, 1, 1700.00, 'Ceremony and dinner schedule', '24h', 'AV and schedule'),
  ('99999999-9999-4999-8999-999999999999', 7, 'AV / Production', 'Signal House Productions', 'Ceremony and ballroom microphones, lighting and projection', 'per event', 3000.00, 1, 3000.00, 'Venue spaces and run-of-show', '24h', 'Power and staging'),
  ('99999999-9999-4999-8999-999999999999', 8, 'Furniture', 'Foundry Event Rentals', '95 reception chairs including operational buffer', 'per item/day', 12.00, 95, 1140.00, '90 guests with 5% buffer', '8h', 'Capacity and seating plan'),
  ('99999999-9999-4999-8999-999999999999', 9, 'Furniture', 'Foundry Event Rentals', 'Nine round dinner tables', 'per item/day', 18.00, 9, 162.00, '90 guests at 10 per table', '8h', 'Room layout'),
  ('99999999-9999-4999-8999-999999999999', 10, 'Tabletop', 'Tabletop Society', 'Place settings, glassware and linens', 'per place setting', 14.00, 95, 1330.00, '90 guests with 5% buffer', '6h', 'Catering and set-up'),
  ('99999999-9999-4999-8999-999999999999', 11, 'Cake', 'Butter & Bloom Cakes', '18th-anniversary cake', 'per serving', 12.00, 90, 1080.00, 'Confirmed guest count', '5d', 'Cake size and service'),
  ('99999999-9999-4999-8999-999999999999', 12, 'Security', 'Premier Event Security', 'Ballroom and entrance security coverage', 'per officer-hour', 48.00, 12, 576.00, 'Minimum two officers for six hours', '4h', 'Guest flow and venue access'),
  ('99999999-9999-4999-8999-999999999999', 13, 'Transport', 'CoachLine Events', 'One hotel guest shuttle', 'per coach/6h', 1650.00, 1, 1650.00, 'Guest room block and shuttle participation', '4h', 'Routes and timing'),
  ('99999999-9999-4999-8999-999999999999', 14, 'Signage', 'Signpost Studio', 'Welcome, seating chart and anniversary signage', 'per event', 800.00, 1, 800.00, 'Guest count, seating and spaces', '6h', 'Room layout and communications');

-- Fail the migration if any seeded commercial total drifts from its approved profile.
do $$
declare
  office_total numeric(12,2);
  anniversary_total numeric(12,2);
begin
  select sum(estimated_cost) into office_total from public.event_vendor_services where event_id = '88888888-8888-4888-8888-888888888888';
  select sum(estimated_cost) into anniversary_total from public.event_vendor_services where event_id = '99999999-9999-4999-8999-999999999999';
  if office_total <> 27044.00 then raise exception 'Office milestone party total is %, expected 27044.00', office_total; end if;
  if anniversary_total <> 44034.00 then raise exception '18th anniversary party total is %, expected 44034.00', anniversary_total; end if;
end $$;

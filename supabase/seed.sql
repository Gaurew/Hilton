-- Stable seed data for the confirmed Hilton Events workspace.
-- Legacy mithai box context is superseded by the Excel confirmed plan HIL-WED-260919.
-- This seed mirrors 202609030001_big_fat_indian_wedding_confirmed_plan.sql so `supabase db reset` and `supabase seed` both work.

insert into public.hilton_visitors (id)
values ('11111111-1111-4111-8111-111111111111')
on conflict (id) do nothing;

-- Ensure slug column exists for older DBs that have not yet run the migration (harmless if already exists via IF NOT EXISTS)
-- hilton_events slug is added in migration 202609030001; seed tolerates missing column by using separate update if needed.

insert into public.hilton_events (id, visitor_id, event_name, property_name, event_date, status, slug)
values
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'The Big Fat Indian Wedding', 'Hilton Lakeside Chicago', '2026-09-19', 'approved', 'big-fat-indian-wedding')
on conflict (id) do update set visitor_id = excluded.visitor_id, event_name = excluded.event_name, property_name = excluded.property_name, event_date = excluded.event_date, status = excluded.status, slug = excluded.slug;

insert into public.event_contexts (event_id, approved_context)
values
  ('22222222-2222-4222-8222-222222222222', $context${"scenario_key":"wedding_confirmed_plan","event_reference":"HIL-WED-260919","couple":"Emily Carter & Noah Bennett","venue":"Hilton Lakeside Chicago (Synthetic Demo Property)","booking_dates":"2026-09-18 to 2026-09-20","wedding_date":"2026-09-19","summary":"Confirmed wedding baseline from Excel: 160 guests, 48 rooms (96 room-nights), 16 dinner tables, 168 with 5% buffer, 18 vendor/crew meals + 10 styling, $125,614 total before taxes/gratuities.","event_baseline":{"guest_count":160,"table_size":10,"dinner_tables":16,"guest_count_with_buffer":168,"rooms":48,"room_nights":96,"vendor_crew_meals":18,"meals":178,"brunch_guests":96,"shuttle_capacity_per_coach":40,"required_shuttles":3,"styling_headcount":10,"total_estimated_cost_usd":125614.00},"preserved_constraints":["venue footprint","hotel contract","run-of-show"],"source":"CONFIRMED WEDDING EVENT PLAN | Hilton + ZS / Yoxa.ai Demo (Excel)"}$context$::jsonb)
on conflict (event_id) do update set approved_context = excluded.approved_context, updated_at = now();

insert into public.event_conversations (id, visitor_id, event_id, title)
values ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Wedding plan review — HIL-WED-260919')
on conflict (id) do update set event_id = excluded.event_id, title = excluded.title;

-- ---------------------------------------------------------------------------
-- Confirmed plan: wedding profile + schedule + vendors
-- These inserts are idempotent and match migration 202609030001
-- ---------------------------------------------------------------------------

-- Defer if normalized tables do not exist yet (e.g. seed run before migration on a fresh clone)
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='event_wedding_profiles') then
    return;
  end if;

  insert into public.event_wedding_profiles (
    event_id, event_code, couple_name, venue_name, venue_display_name,
    booking_start_date, booking_end_date, wedding_date,
    guest_count, table_size, shuttle_capacity_per_coach, vendor_crew_meals, styling_headcount,
    rooms, room_nights, dinner_tables, guest_count_with_buffer, meals, brunch_guests, required_shuttles, required_security_officer_hours,
    total_estimated_cost, raw_source
  ) values (
    '22222222-2222-4222-8222-222222222222',
    'HIL-WED-260919',
    'Emily Carter & Noah Bennett',
    'Hilton Lakeside Chicago',
    'Hilton Lakeside Chicago (Synthetic Demo Property)',
    '2026-09-18', '2026-09-20', '2026-09-19',
    160, 10, 40, 18, 10,
    48, 96, 16, 168, 178, 96, 3, 18,
    125614.00,
    '{"source":"CONFIRMED WEDDING EVENT PLAN | Hilton + ZS / Yoxa.ai Demo","notes":"Yellow cells are primary drivers"}'::jsonb
  ) on conflict (event_id) do update set
    event_code = excluded.event_code, couple_name = excluded.couple_name, venue_name = excluded.venue_name, venue_display_name = excluded.venue_display_name,
    booking_start_date = excluded.booking_start_date, booking_end_date = excluded.booking_end_date, wedding_date = excluded.wedding_date,
    guest_count = excluded.guest_count, table_size = excluded.table_size, shuttle_capacity_per_coach = excluded.shuttle_capacity_per_coach,
    vendor_crew_meals = excluded.vendor_crew_meals, styling_headcount = excluded.styling_headcount,
    rooms = excluded.rooms, room_nights = excluded.room_nights, dinner_tables = excluded.dinner_tables, guest_count_with_buffer = excluded.guest_count_with_buffer,
    meals = excluded.meals, brunch_guests = excluded.brunch_guests, required_shuttles = excluded.required_shuttles,
    total_estimated_cost = excluded.total_estimated_cost, raw_source = excluded.raw_source, updated_at = now();

  delete from public.event_schedule_items where event_id = '22222222-2222-4222-8222-222222222222';
  insert into public.event_schedule_items (event_id, sort_order, schedule_date, start_time, end_time, display_time, event_name, space, attendees, dependencies) values
    ('22222222-2222-4222-8222-222222222222', 1, '2026-09-18', '15:00', null, '3:00 PM', 'Guest Check-In Begins', 'Hotel Guest Rooms', 96, 'Transfers'),
    ('22222222-2222-4222-8222-222222222222', 2, '2026-09-18', '19:00', '21:00', '7:00-9:00 PM', 'Rehearsal Dinner', 'Lake Room', 40, 'Photography'),
    ('22222222-2222-4222-8222-222222222222', 3, '2026-09-19', '16:30', '17:00', '4:30-5:00 PM', 'Wedding Ceremony', 'Garden Terrace', 160, 'Backup'),
    ('22222222-2222-4222-8222-222222222222', 4, '2026-09-19', '17:00', '18:00', '5:00-6:00 PM', 'Cocktail Hour', 'Grand Foyer', 160, 'Signage'),
    ('22222222-2222-4222-8222-222222222222', 5, '2026-09-19', '18:00', '23:00', '6:00-11:00 PM', 'Wedding Reception', 'Grand Ballroom', 160, 'Security'),
    ('22222222-2222-4222-8222-222222222222', 6, '2026-09-19', '22:45', null, '10:45 PM', 'Grand Sendoff', 'Hotel Main Entrance', 160, 'Security'),
    ('22222222-2222-4222-8222-222222222222', 7, '2026-09-20', '10:00', '12:00', '10:00 AM-12:00 PM', 'Post-Wedding Brunch', 'Lake Room', 96, 'Support');

  delete from public.event_vendor_services where event_id = '22222222-2222-4222-8222-222222222222';
  insert into public.event_vendor_services (event_id, sort_order, category, confirmed_vendor, confirmed_scope, pricing_basis, unit_rate, confirmed_qty, estimated_cost, dependency_formula_driver, latest_change_cutoff, change_ripple) values
    ('22222222-2222-4222-8222-222222222222', 1,  'Venue',              'Hilton Lakeside Chicago',   'setup and service charge',                                 'per event',        18000.00,  1,   18000.00, 'Fixed confirmed venue footprint',                'Subject to hotel contract', 'signage and transport'),
    ('22222222-2222-4222-8222-222222222222', 2,  'Hotel Rooms',        'Hilton Lakeside Chicago',   'Two-night guest room block',                             'per room-night',     279.00, 96,   26784.00, 'nights',                                             '72h before arrival',        'transport and brunch'),
    ('22222222-2222-4222-8222-222222222222', 3,  'Catering',           'Harvest & Hearth Catering', 'Reception dinner + vendor/crew meals',                   'per meal',          95.00, 178,   16910.00, 'Confirmed guests + vendor/crew meals',            '72h before event',          'and staffing'),
    ('22222222-2222-4222-8222-222222222222', 4,  'Florals & Décor',    'Evergreen & Rose Studio',   'installation',                                           'per event',       8500.00,  1,    8500.00, 'Fixed design package',                               'structural',                'and signage'),
    ('22222222-2222-4222-8222-222222222222', 5,  'Weather Backup',     'ClearSpan Event Structures','contingency',                                             'per setup',      12500.00,  1,   12500.00, 'Outdoor ceremony contingency',                     '72h',                       'guest flow'),
    ('22222222-2222-4222-8222-222222222222', 6,  'Photography / Video','Northstar Wedding Co.',     '8-hour photo + cinematic video coverage',                'per day',         6800.00,  1,    6800.00, 'Fixed contracted coverage',                        '24h for extra shooter',     'and staffing'),
    ('22222222-2222-4222-8222-222222222222', 7,  'Entertainment',      'Blue Note Events',          'Reception DJ/MC + ceremony audio support',               'per event',       2800.00,  1,    2800.00, 'Reception & ceremony schedule',                    '24h',                       'Time changes affect DJ, AV, venue and transport'),
    ('22222222-2222-4222-8222-222222222222', 8,  'AV / Production',    'Signal House Productions',  'ballroom production',                                    'per event',       7200.00,  1,    7200.00, 'Venue spaces + run-of-show',                       '24h',                       'power'),
    ('22222222-2222-4222-8222-222222222222', 9,  'Communications',     'WedLink Digital',           'Wedding website, RSVP, SMS schedule updates',            'per event',        950.00,  1,     950.00, 'Guest list + schedule',                            '15 min',                    'guest communication'),
    ('22222222-2222-4222-8222-222222222222', 10, 'On-Site Signage',    'Signpost Studio',           'Welcome sign, seating chart, directional signage, menus','per event',       1200.00,  1,    1200.00, 'Guest count + seating + spaces',                   '6h for standard print',     'Guest/table/location changes can trigger reprint'),
    ('22222222-2222-4222-8222-222222222222', 11, 'Beauty',             'Collective Beauty Team',    'Hair and makeup for wedding party',                      'per person',       240.00,  8,    1920.00, 'Bridal party count',                               '24h',                       'call time'),
    ('22222222-2222-4222-8222-222222222222', 12, 'Attire Support',     'Pin & Press Styling',       'Steaming, pinning and emergency sewing support',         'per person',        95.00, 10,     950.00, 'Styling headcount',                                '2h',                        'Added people increase prep time and staffing'),
    ('22222222-2222-4222-8222-222222222222', 13, 'Transport',          'CoachLine Events',          'Hotel-to-venue guest shuttle service',                   'per coach/6h',    1650.00,  3,    4950.00, 'capacity',                                         '4h',                        'route duration'),
    ('22222222-2222-4222-8222-222222222222', 14, 'Guest Hospitality',  'Boxed Welcome',             'Welcome bags delivered to guest rooms',                  'per bag',           42.00, 48,    2016.00, 'Room block rooms',                                 '8h standard bags',          'workload'),
    ('22222222-2222-4222-8222-222222222222', 15, 'Reception Furniture','Foundry Event Rentals',     'Reception chairs',                                       'per item/day',      18.00, 168,    3024.00, 'Guest count + 5% chair buffer',                    '8h',                        'density'),
    ('22222222-2222-4222-8222-222222222222', 16, 'Reception Furniture','Foundry Event Rentals',     'Round dinner tables',                                    'per item/day',      18.00, 16,     288.00, 'Guest count + guests per table',                   '8h',                        'table/layout'),
    ('22222222-2222-4222-8222-222222222222', 17, 'Tabletop',           'Tabletop Society',          'China, flatware, glassware and linens',                  'per place setting', 16.00, 168,    2688.00, 'Guest count + 5% service buffer',                  '6h',                        'setup'),
    ('22222222-2222-4222-8222-222222222222', 18, 'Security',           'Premier Event Security',    'Ballroom and entrance security coverage for 6 hours',    'per officer-hour',  48.00, 18,     864.00, 'Guest count ÷ 75, minimum 2 officers',             '4h',                        'Larger event may require additional officers'),
    ('22222222-2222-4222-8222-222222222222', 19, 'Ceremony',           'Ever After Officiants',     'Custom ceremony + rehearsal attendance',                 'per ceremony',     950.00,  1,     950.00, 'Fixed ceremony',                                   '24h',                       'music'),
    ('22222222-2222-4222-8222-222222222222', 20, 'Cake',               'Butter & Bloom Cakes',      'Wedding cake sized for confirmed guest count',           'per serving',      12.00, 160,    1920.00, 'Confirmed guest count',                            '5d',                        'cake tier size'),
    ('22222222-2222-4222-8222-222222222222', 21, 'Ceremony Music',     'Ceremony Strings Co.',      'String quartet for ceremony and cocktail transition',    'per performance', 1800.00,  1,    1800.00, 'Ceremony schedule',                                '72h',                       'and setup'),
    ('22222222-2222-4222-8222-222222222222', 22, 'Special Effects',    'Spark & Sendoff FX',        'Cold sparks for first dance and grand sendoff',          'per event',       2600.00,  1,    2600.00, 'Reception timeline + safety approval',               '8h',                        'recheck');
end $$;

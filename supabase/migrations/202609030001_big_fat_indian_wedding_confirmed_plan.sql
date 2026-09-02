-- Big Fat Indian Wedding confirmed plan from Excel (HIL-WED-260919 / Emiliy Carter & Noah Bennett)
-- Creates normalized tables for the synthetic confirmed baseline and seeds the Excel values.
-- Yellow cells are primary drivers; green cells and vendor totals are derived and stored explicitly
-- so future Dashboard / Event Plan reads are database-driven.

-- ---------------------------------------------------------------------------
-- 1. Slug for file-system routing (replaces static eventCopy keys)
-- ---------------------------------------------------------------------------
alter table public.hilton_events add column if not exists slug text;
create unique index if not exists hilton_events_slug_unique_idx on public.hilton_events(slug) where slug is not null;

update public.hilton_events set slug = 'cocktail-reception' where id = '44444444-4444-4444-8444-444444444444' and slug is null;
update public.hilton_events set slug = 'big-fat-indian-wedding' where id = '22222222-2222-4222-8222-222222222222' and slug is null;
update public.hilton_events set slug = 'welcome-hampers' where id = '55555555-5555-4555-8555-555555555555' and slug is null;

-- Align the Big Fat Indian Wedding master row with the Excel event header
update public.hilton_events set
  event_name = 'The Big Fat Indian Wedding',
  property_name = 'Hilton Lakeside Chicago',
  event_date = '2026-09-19',
  status = 'approved',
  slug = 'big-fat-indian-wedding'
where id = '22222222-2222-4222-8222-222222222222';

-- Backfill additional dashboard demo events as database rows so the dashboard is DB-driven
insert into public.hilton_events (id, visitor_id, event_name, property_name, event_date, status, slug)
values
  ('66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111', 'Leadership Summit', 'Hilton Mumbai International Airport', '2025-11-22', 'approved', 'leadership-summit'),
  ('77777777-7777-4777-8777-777777777777', '11111111-1111-4111-8111-111111111111', 'Annual Partner Gala', 'Hilton Grand Ballroom', '2025-12-12', 'approved', 'annual-gala')
on conflict (id) do update set
  visitor_id = excluded.visitor_id,
  event_name = excluded.event_name,
  property_name = excluded.property_name,
  event_date = excluded.event_date,
  status = excluded.status,
  slug = excluded.slug;

-- Keep event_contexts in sync for YOXA Event Resolution (scenario_key = wedding_confirmed_plan)
insert into public.event_contexts (event_id, approved_context)
values
  ('22222222-2222-4222-8222-222222222222', $json${
    "scenario_key": "wedding_confirmed_plan",
    "event_reference": "HIL-WED-260919",
    "couple": "Emily Carter & Noah Bennett",
    "venue": "Hilton Lakeside Chicago (Synthetic Demo Property)",
    "booking_dates": "2026-09-18 to 2026-09-20",
    "wedding_date": "2026-09-19",
    "summary": "Confirmed wedding baseline from Excel: 160 guests, 48 rooms (96 room-nights), 16 dinner tables, 168 with 5% buffer, 18 vendor/crew meals + 10 styling, $125,614 total before taxes/gratuities.",
    "event_baseline": {
      "guest_count": 160,
      "table_size": 10,
      "dinner_tables": 16,
      "guest_count_with_buffer": 168,
      "rooms": 48,
      "room_nights": 96,
      "vendor_crew_meals": 18,
      "meals": 178,
      "brunch_guests": 96,
      "shuttle_capacity_per_coach": 40,
      "required_shuttles": 3,
      "styling_headcount": 10,
      "total_estimated_cost_usd": 125614.00
    },
    "preserved_constraints": ["venue footprint", "hotel contract", "run-of-show"],
    "source": "CONFIRMED WEDDING EVENT PLAN | Hilton + ZS / Yoxa.ai Demo (Excel)"
  }$json$::jsonb),
  ('66666666-6666-4666-8666-666666666666', $json${
    "scenario_key": "leadership_summit",
    "summary": "Leadership Summit approved conference plan — no open changes.",
    "event_baseline": {"attendee_count": 180, "venue": "Hilton Mumbai International Airport"}
  }$json$::jsonb),
  ('77777777-7777-4777-8777-777777777777', $json${
    "scenario_key": "annual_gala",
    "summary": "Annual Partner Gala approved plan — ready for next client request.",
    "event_baseline": {"attendee_count": 320, "venue": "Hilton Grand Ballroom"}
  }$json$::jsonb)
on conflict (event_id) do update set approved_context = excluded.approved_context, updated_at = now();

-- Plan revisions for HIL-WED-260919 — baseline is the Excel confirmed plan
insert into public.event_plan_revisions (event_id, revision_number, status, effective_at, summary, plan_snapshot)
values
  ('22222222-2222-4222-8222-222222222222', 1, 'baseline', '2026-09-01T10:00:00+05:30', 'Confirmed baseline from Excel — 160 guests, $125,614.', $json${
    "event_reference": "HIL-WED-260919",
    "couple": "Emily Carter & Noah Bennett",
    "booking_dates": "2026-09-18 to 2026-09-20",
    "wedding_date": "2026-09-19",
    "guest_count": 160,
    "rooms": 48,
    "room_nights": 96,
    "dinner_tables": 16,
    "guest_count_with_buffer": 168,
    "meals": 178,
    "brunch_guests": 96,
    "total_estimated_cost_usd": 125614.00
  }$json$::jsonb)
on conflict (event_id, revision_number) do update set summary = excluded.summary, plan_snapshot = excluded.plan_snapshot, effective_at = excluded.effective_at;

-- ---------------------------------------------------------------------------
-- 2. Normalized confirmed plan tables
-- ---------------------------------------------------------------------------

create table if not exists public.event_wedding_profiles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.hilton_events(id) on delete cascade,
  event_code text not null,
  couple_name text not null,
  venue_name text not null,
  venue_display_name text not null,
  booking_start_date date not null,
  booking_end_date date not null,
  wedding_date date not null,
  guest_count integer not null check (guest_count > 0),
  table_size integer not null check (table_size > 0),
  shuttle_capacity_per_coach integer not null check (shuttle_capacity_per_coach > 0),
  vendor_crew_meals integer not null check (vendor_crew_meals >= 0),
  styling_headcount integer not null check (styling_headcount >= 0),
  -- derived operational context (green cells)
  rooms integer not null check (rooms >= 0),
  room_nights integer not null check (room_nights >= 0),
  dinner_tables integer not null check (dinner_tables >= 0),
  guest_count_with_buffer integer not null check (guest_count_with_buffer >= 0),
  meals integer not null check (meals >= 0),
  brunch_guests integer not null check (brunch_guests >= 0),
  required_shuttles integer not null check (required_shuttles >= 0),
  required_security_officer_hours integer not null default 18,
  total_estimated_cost numeric(12,2) not null check (total_estimated_cost >= 0),
  raw_source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists event_wedding_profiles_event_id_idx on public.event_wedding_profiles(event_id);

create table if not exists public.event_schedule_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.hilton_events(id) on delete cascade,
  sort_order integer not null,
  schedule_date date not null,
  start_time text not null,
  end_time text,
  display_time text not null,
  event_name text not null,
  space text not null,
  attendees integer not null check (attendees >= 0),
  dependencies text,
  created_at timestamptz not null default now(),
  unique(event_id, sort_order)
);
create index if not exists event_schedule_items_event_id_sort_idx on public.event_schedule_items(event_id, sort_order);

create table if not exists public.event_vendor_services (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.hilton_events(id) on delete cascade,
  sort_order integer not null,
  category text not null,
  confirmed_vendor text not null,
  confirmed_scope text not null,
  pricing_basis text not null,
  unit_rate numeric(12,2) not null,
  confirmed_qty numeric(12,2) not null,
  estimated_cost numeric(12,2) not null,
  dependency_formula_driver text,
  latest_change_cutoff text,
  change_ripple text,
  created_at timestamptz not null default now(),
  unique(event_id, sort_order)
);
create index if not exists event_vendor_services_event_id_sort_idx on public.event_vendor_services(event_id, sort_order);

alter table public.event_wedding_profiles enable row level security;
alter table public.event_schedule_items enable row level security;
alter table public.event_vendor_services enable row level security;

-- Permissive read for the authenticated Event Manager workspace; writes remain service_role via Edge Functions.
drop policy if exists "event_wedding_profiles_read_all" on public.event_wedding_profiles;
create policy "event_wedding_profiles_read_all" on public.event_wedding_profiles for select using (true);
drop policy if exists "event_schedule_items_read_all" on public.event_schedule_items;
create policy "event_schedule_items_read_all" on public.event_schedule_items for select using (true);
drop policy if exists "event_vendor_services_read_all" on public.event_vendor_services;
create policy "event_vendor_services_read_all" on public.event_vendor_services for select using (true);

-- Also allow dashboard reads without RLS friction (hilton_events historically had no read policy)
drop policy if exists "hilton_events_read_all" on public.hilton_events;
create policy "hilton_events_read_all" on public.hilton_events for select using (true);
drop policy if exists "event_contexts_read_all" on public.event_contexts;
create policy "event_contexts_read_all" on public.event_contexts for select using (true);
drop policy if exists "event_plan_revisions_read_all" on public.event_plan_revisions;
create policy "event_plan_revisions_read_all" on public.event_plan_revisions for select using (true);
drop policy if exists "event_conversations_read_all" on public.event_conversations;
create policy "event_conversations_read_all" on public.event_conversations for select using (true);

-- ---------------------------------------------------------------------------
-- 3. Seed: Event wedding profile for HIL-WED-260919
-- ---------------------------------------------------------------------------
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
  $json${
    "source": "CONFIRMED WEDDING EVENT PLAN | Hilton + ZS / Yoxa.ai Demo",
    "notes": "Yellow cells are primary drivers; Total is baseline before taxes/gratuities/unlisted incidentals.",
    "excel_warnings": {
      "occupancy_driver_percent_60": "60% (driver, stored in raw_source for traceability)",
      "buffer_percent_75": "75% (stored)",
      "five_percent_buffer_label": "incl. 5% buffer = 168; 5% buffer = 168 (Excel shows both, kept as guest_count_with_buffer)"
    }
  }$json$::jsonb
)
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
  total_estimated_cost = excluded.total_estimated_cost,
  raw_source = excluded.raw_source,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. Seed: Confirmed event schedule (7 rows)
-- ---------------------------------------------------------------------------
delete from public.event_schedule_items where event_id = '22222222-2222-4222-8222-222222222222';
insert into public.event_schedule_items (event_id, sort_order, schedule_date, start_time, end_time, display_time, event_name, space, attendees, dependencies) values
  ('22222222-2222-4222-8222-222222222222', 1, '2026-09-18', '15:00', null, '3:00 PM', 'Guest Check-In Begins', 'Hotel Guest Rooms', 96, 'Transfers'),
  ('22222222-2222-4222-8222-222222222222', 2, '2026-09-18', '19:00', '21:00', '7:00-9:00 PM', 'Rehearsal Dinner', 'Lake Room', 40, 'Photography'),
  ('22222222-2222-4222-8222-222222222222', 3, '2026-09-19', '16:30', '17:00', '4:30-5:00 PM', 'Wedding Ceremony', 'Garden Terrace', 160, 'Backup'),
  ('22222222-2222-4222-8222-222222222222', 4, '2026-09-19', '17:00', '18:00', '5:00-6:00 PM', 'Cocktail Hour', 'Grand Foyer', 160, 'Signage'),
  ('22222222-2222-4222-8222-222222222222', 5, '2026-09-19', '18:00', '23:00', '6:00-11:00 PM', 'Wedding Reception', 'Grand Ballroom', 160, 'Security'),
  ('22222222-2222-4222-8222-222222222222', 6, '2026-09-19', '22:45', null, '10:45 PM', 'Grand Sendoff', 'Hotel Main Entrance', 160, 'Security'),
  ('22222222-2222-4222-8222-222222222222', 7, '2026-09-20', '10:00', '12:00', '10:00 AM-12:00 PM', 'Post-Wedding Brunch', 'Lake Room', 96, 'Support');

-- ---------------------------------------------------------------------------
-- 5. Seed: Confirmed vendor & service plan (22 rows, total $125,614.00)
-- ---------------------------------------------------------------------------
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

-- Validate total
do $$
declare v_total numeric;
begin
  select sum(estimated_cost) into v_total from public.event_vendor_services where event_id = '22222222-2222-4222-8222-222222222222';
  if v_total is distinct from 125614.00 then
    raise exception 'Vendor total mismatch: expected 125614.00 got %', v_total;
  end if;
end $$;

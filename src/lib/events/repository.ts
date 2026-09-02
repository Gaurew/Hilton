import type {
  EventConversationPreview,
  ManagedEventCard,
  ScheduleItem,
  VendorService,
  WeddingProfile,
  EventPlanRevision,
} from "@/lib/events/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase queries belong here once its supplied event schema is available. */
export async function getPreviousEvents(): Promise<EventConversationPreview[]> {
  return [];
}

function formatEventDate(raw: string | null): string {
  if (!raw) return "TBC";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function toneForEvent(hasProfile: boolean): ManagedEventCard["tone"] {
  return hasProfile ? "emerald" : "slate";
}

function metricForEvent(profile: WeddingProfile | null): { metric: string; delta: string; status: string; updated: string } {
  if (profile) {
    return {
      metric: `${profile.guestCount} guests`,
      delta: `${profile.rooms} rooms · $${profile.totalEstimatedCost.toLocaleString()} total`,
      status: "Confirmed",
      updated: `${profile.eventCode} · ${profile.coupleName}`,
    };
  }
  return { metric: "Plan unavailable", delta: "", status: "Unconfigured", updated: "" };
}

export async function getManagedEvents(supabase: SupabaseClient): Promise<ManagedEventCard[]> {
  const { data, error } = await supabase
    .from("hilton_events")
    .select("id, slug, event_name, property_name, event_date, status")
    .order("event_date", { ascending: true });

  if (error || !data) return [];

  // Fetch profiles in one query for metric computation
  const ids = data.map((r) => r.id);
  const { data: profiles } = await supabase.from("event_wedding_profiles").select("*").in("event_id", ids);
  const profileByEventId = new Map<string, WeddingProfile>();
  for (const row of (profiles ?? []) as Record<string, unknown>[]) {
    const p: WeddingProfile = {
      id: row["id"] as string,
      eventId: row["event_id"] as string,
      eventCode: row["event_code"] as string,
      coupleName: row["couple_name"] as string,
      venueName: row["venue_name"] as string,
      venueDisplayName: row["venue_display_name"] as string,
      bookingStartDate: row["booking_start_date"] as string,
      bookingEndDate: row["booking_end_date"] as string,
      weddingDate: row["wedding_date"] as string,
      guestCount: row["guest_count"] as number,
      tableSize: row["table_size"] as number,
      shuttleCapacityPerCoach: row["shuttle_capacity_per_coach"] as number,
      vendorCrewMeals: row["vendor_crew_meals"] as number,
      stylingHeadcount: row["styling_headcount"] as number,
      rooms: row["rooms"] as number,
      roomNights: row["room_nights"] as number,
      dinnerTables: row["dinner_tables"] as number,
      guestCountWithBuffer: row["guest_count_with_buffer"] as number,
      meals: row["meals"] as number,
      brunchGuests: row["brunch_guests"] as number,
      requiredShuttles: row["required_shuttles"] as number,
      requiredSecurityOfficerHours: row["required_security_officer_hours"] as number,
      totalEstimatedCost: Number(row["total_estimated_cost"]),
      rawSource: (row["raw_source"] as Record<string, unknown>) ?? null,
    };
    profileByEventId.set(p.eventId, p);
  }

  return data.map((row) => {
    const slug = (row.slug as string | null) ?? row.id;
    const profile = profileByEventId.get(row.id as string) ?? null;
    const { metric, delta, status, updated } = metricForEvent(profile);
    return {
      id: row.id as string,
      slug,
      name: row.event_name as string,
      property: row.property_name as string,
      date: formatEventDate(row.event_date as string | null),
      eventDateRaw: row.event_date as string | null,
      metric,
      delta,
      status,
      updated,
      tone: toneForEvent(!!profile),
      coupleName: profile?.coupleName ?? null,
      eventCode: profile?.eventCode ?? null,
      totalCost: profile?.totalEstimatedCost ?? null,
    };
  });
}

export async function getEventBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<{
  event: { id: string; slug: string; eventName: string; propertyName: string; eventDate: string | null };
  profile: WeddingProfile | null;
  schedule: ScheduleItem[];
  vendors: VendorService[];
  revisions: EventPlanRevision[];
} | null> {
  // Allow lookup by slug or by raw id (for legacy URLs)
  const { data: bySlug } = await supabase.from("hilton_events").select("id, slug, event_name, property_name, event_date").eq("slug", slug).maybeSingle();
  const eventRow = bySlug ?? (await supabase.from("hilton_events").select("id, slug, event_name, property_name, event_date").eq("id", slug).maybeSingle()).data;
  if (!eventRow) return null;

  const eventId = eventRow.id as string;

  const [profileRes, scheduleRes, vendorRes, revisionRes] = await Promise.all([
    supabase.from("event_wedding_profiles").select("*").eq("event_id", eventId).maybeSingle(),
    supabase.from("event_schedule_items").select("*").eq("event_id", eventId).order("sort_order"),
    supabase.from("event_vendor_services").select("*").eq("event_id", eventId).order("sort_order"),
    supabase.from("event_plan_revisions").select("*").eq("event_id", eventId).order("revision_number"),
  ]);

  const profileRow = profileRes.data as Record<string, unknown> | null;
  const profile: WeddingProfile | null = profileRow
    ? {
        id: profileRow["id"] as string,
        eventId: profileRow["event_id"] as string,
        eventCode: profileRow["event_code"] as string,
        coupleName: profileRow["couple_name"] as string,
        venueName: profileRow["venue_name"] as string,
        venueDisplayName: profileRow["venue_display_name"] as string,
        bookingStartDate: profileRow["booking_start_date"] as string,
        bookingEndDate: profileRow["booking_end_date"] as string,
        weddingDate: profileRow["wedding_date"] as string,
        guestCount: profileRow["guest_count"] as number,
        tableSize: profileRow["table_size"] as number,
        shuttleCapacityPerCoach: profileRow["shuttle_capacity_per_coach"] as number,
        vendorCrewMeals: profileRow["vendor_crew_meals"] as number,
        stylingHeadcount: profileRow["styling_headcount"] as number,
        rooms: profileRow["rooms"] as number,
        roomNights: profileRow["room_nights"] as number,
        dinnerTables: profileRow["dinner_tables"] as number,
        guestCountWithBuffer: profileRow["guest_count_with_buffer"] as number,
        meals: profileRow["meals"] as number,
        brunchGuests: profileRow["brunch_guests"] as number,
        requiredShuttles: profileRow["required_shuttles"] as number,
        requiredSecurityOfficerHours: profileRow["required_security_officer_hours"] as number,
        totalEstimatedCost: Number(profileRow["total_estimated_cost"]),
        rawSource: (profileRow["raw_source"] as Record<string, unknown>) ?? null,
      }
    : null;

  const schedule: ScheduleItem[] = ((scheduleRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r["id"] as string,
    sortOrder: r["sort_order"] as number,
    scheduleDate: r["schedule_date"] as string,
    displayTime: r["display_time"] as string,
    startTime: r["start_time"] as string,
    endTime: (r["end_time"] as string | null) ?? null,
    eventName: r["event_name"] as string,
    space: r["space"] as string,
    attendees: r["attendees"] as number,
    dependencies: (r["dependencies"] as string | null) ?? null,
  }));

  const vendors: VendorService[] = ((vendorRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r["id"] as string,
    sortOrder: r["sort_order"] as number,
    category: r["category"] as string,
    confirmedVendor: r["confirmed_vendor"] as string,
    confirmedScope: r["confirmed_scope"] as string,
    pricingBasis: r["pricing_basis"] as string,
    unitRate: Number(r["unit_rate"]),
    confirmedQty: Number(r["confirmed_qty"]),
    estimatedCost: Number(r["estimated_cost"]),
    dependencyFormulaDriver: (r["dependency_formula_driver"] as string | null) ?? null,
    latestChangeCutoff: (r["latest_change_cutoff"] as string | null) ?? null,
    changeRipple: (r["change_ripple"] as string | null) ?? null,
  }));

  const revisions: EventPlanRevision[] = ((revisionRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r["id"] as string,
    revisionNumber: r["revision_number"] as number,
    status: r["status"] as "baseline" | "approved",
    effectiveAt: r["effective_at"] as string,
    summary: r["summary"] as string,
    planSnapshot: (r["plan_snapshot"] as Record<string, unknown>) ?? {},
  }));

  return {
    event: {
      id: eventId,
      slug: (eventRow.slug as string) ?? eventId,
      eventName: eventRow.event_name as string,
      propertyName: eventRow.property_name as string,
      eventDate: eventRow.event_date as string | null,
    },
    profile,
    schedule,
    vendors,
    revisions,
  };
}

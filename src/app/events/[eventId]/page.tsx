import { notFound } from "next/navigation";
import { EventDetailWorkspace } from "@/components/event-detail-workspace";
import { createClient } from "@/lib/supabase/server";
import { getEventBySlug } from "@/lib/events/repository";

function formatDateLong(raw: string | null): string {
  if (!raw) return "TBC";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const db = await getEventBySlug(supabase as unknown as import("@supabase/supabase-js").SupabaseClient, eventId);
  if (!db) notFound();

  const latestRevision = db.revisions.at(-1);
  const profile = db.profile;
  const event = {
    id: db.event.id,
    name: db.event.eventName,
    property: db.event.propertyName,
    date: formatDateLong(db.event.eventDate),
    current: profile ? `${profile.guestCount} guests · ${profile.rooms} rooms · $${profile.totalEstimatedCost.toLocaleString()}` : "Approved plan",
    baseline: profile ? `${profile.guestCount} guests` : "Approved plan",
    change: "Confirmed plan",
    time: latestRevision ? new Date(latestRevision.effectiveAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "",
    summary: profile ? `Confirmed approved plan for ${profile.coupleName}.` : `Confirmed plan for ${db.event.eventName}.`,
  };

  return <EventDetailWorkspace event={event} profile={profile} schedule={db.schedule} vendors={db.vendors} revisions={db.revisions} />;
}

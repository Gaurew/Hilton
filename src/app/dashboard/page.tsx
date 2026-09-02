import { EventManagerDashboard } from "@/components/event-manager-dashboard";
import { createClient } from "@/lib/supabase/server";
import { getManagedEvents } from "@/lib/events/repository";

export default async function DashboardPage() {
  let initialEvents: Awaited<ReturnType<typeof getManagedEvents>> = [];
  try {
    const supabase = await createClient();
    initialEvents = await getManagedEvents(supabase as unknown as import("@supabase/supabase-js").SupabaseClient);
  } catch {
    // Render an empty state rather than static event data when Supabase is unavailable.
  }
  return <EventManagerDashboard initialEvents={initialEvents} />;
}

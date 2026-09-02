"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ManagedEventCard } from "@/lib/events/types";
import { getManagedEvents } from "@/lib/events/repository";

const tones = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function EventManagerDashboard({ initialEvents }: { initialEvents?: ManagedEventCard[] }) {
  const [events, setEvents] = useState<ManagedEventCard[]>(initialEvents ?? []);
  const [loadedFromDb, setLoadedFromDb] = useState(!!initialEvents?.length);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const rows = await getManagedEvents(supabase as unknown as import("@supabase/supabase-js").SupabaseClient);
        if (!cancelled) {
          setEvents(rows);
          setLoadedFromDb(true);
        }
      } catch {
        if (!cancelled) setLoadedFromDb(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialEvents]);

  return <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#f6f8fa] text-[#17324d]">
    <header className="flex h-[86px] items-center justify-between border-b border-[#dce4e9] bg-white px-10">
      <div><p className="text-[27px] font-bold tracking-[-0.045em]">Hilton <span className="font-normal">Events</span></p><p className="mt-0.5 text-sm text-slate-500">Event Manager Workspace</p></div>
      <div className="flex items-center gap-4"><span className="text-sm text-slate-500">Event Manager</span><span className="grid size-10 place-items-center rounded-full bg-[#123d75] text-sm font-semibold text-white">EM</span></div>
    </header>
    <div className="min-h-0 flex-1">
      <section className="min-h-0 min-w-0 overflow-y-auto p-9">
        <div className="flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#3977a9]">Events</p><h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em]">Managed events</h1><p className="mt-2 text-[15px] text-slate-600">Open an event to review its approved plan, change history, and related conversations.</p></div><p className="text-sm text-slate-500">{events.length} managed events{loadedFromDb ? " · live from database" : ""}</p></div>
        {events.length ? <div className="mt-8 grid grid-cols-2 gap-3.5">{events.map(event => <Link key={event.id} href={"/events/" + event.slug} className="rounded-lg border border-[#dce4e9] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(18,50,80,0.04)] transition hover:-translate-y-0.5 hover:border-[#9fcde4] hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><p className="text-[15px] font-semibold">{event.name}</p><p className="mt-1 text-[13px] text-slate-500">{event.property} · {event.date}</p></div><span className={"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 " + tones[event.tone]}>{event.status}</span></div><div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3"><div><p className="text-xs text-slate-500">Current approved plan</p><p className="mt-1 text-[17px] font-semibold">{event.metric}</p><p className="mt-0.5 text-xs font-medium text-[#3977a9]">{event.delta}</p></div><ArrowRight size={18} className="mb-1 text-[#3977a9]" /></div><p className="mt-3 text-[11px] text-slate-500">Last activity: {event.updated}</p></Link>)}</div> : <div className="mt-8 rounded-lg border border-dashed border-[#c7d3da] bg-white px-5 py-8 text-sm text-slate-600">No managed events are available.</div>}
      </section>
    </div>
  </main>;
}

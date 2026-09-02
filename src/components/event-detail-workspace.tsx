"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import { HiltonEventsWorkspace } from "@/components/hilton-events-workspace";
import type { EventPlanRevision, ScheduleItem, VendorService, WeddingProfile } from "@/lib/events/types";

type EventInfo = { id?: string; name: string; conversationEventName?: string; property: string; date: string; current: string; baseline: string; change: string; time: string; summary: string };

export function EventDetailWorkspace({
  event,
  profile,
  schedule,
  vendors,
  revisions,
}: {
  event: EventInfo;
  profile?: WeddingProfile | null;
  schedule?: ScheduleItem[];
  vendors?: VendorService[];
  revisions?: EventPlanRevision[];
}) {
  const router = useRouter();
  const [chatWidth, setChatWidth] = useState(620);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  function clampChatWidth(width: number) {
    const isCompact = window.innerWidth < 1024;
    const minimumChatWidth = isCompact ? 380 : 560;
    const minimumPlanWidth = isCompact ? 440 : 620;
    const maximumChatWidth = Math.max(minimumChatWidth, window.innerWidth - minimumPlanWidth);
    return Math.min(maximumChatWidth, Math.max(minimumChatWidth, width));
  }

  useEffect(() => {
    const resize = () => setChatWidth(clampChatWidth(Math.round(window.innerWidth * 0.46)));
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // The YOXA Update Changes connector writes directly to Supabase. Refresh this
  // server-rendered event payload so the approved plan and revision timeline follow it.
  useEffect(() => {
    const refresh = window.setInterval(() => router.refresh(), 2000);
    return () => window.clearInterval(refresh);
  }, [router]);

  function beginChatResize(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const onMove = (move: MouseEvent) => setChatWidth(clampChatWidth(window.innerWidth - move.clientX));
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const hasProfile = !!profile;
  const totalCost = profile?.totalEstimatedCost ?? null;

  const formatMoney = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatCurrencyShort = (n: number) => `$${n.toLocaleString()}`;

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#f6f8fa] text-[#17324d]">
      <header className="flex h-16 items-center justify-between border-b border-[#dce4e9] bg-white px-7">
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-[#124c97] hover:bg-[#edf5fb]">
          <ArrowLeft size={18} />
          All events
        </Link>
        <p className="text-sm font-semibold text-[#123250]">Hilton Events</p>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <section className="min-h-0 min-w-[440px] flex-1 overflow-y-auto lg:min-w-[620px]">
          <div className="mx-auto max-w-5xl px-10 py-9">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#3977a9]">Event plan</p>
            <div className="mt-2 flex items-start justify-between gap-6">
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.04em]">{event.name}</h1>
                {hasProfile ? (
                  <p className="mt-2 text-sm font-medium text-[#2a5a82]">
                    {profile!.coupleName} · {profile!.eventCode}
                  </p>
                ) : null}
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <CalendarDays size={17} />
                  {event.property} · {event.date}
                  {hasProfile ? ` · Booking ${new Date(profile!.bookingStartDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}–${new Date(profile!.bookingEndDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                </p>
              </div>
            </div>

            <div className="mt-9 grid gap-5">
              {/* Current approved plan — database-driven */}
              <section className="rounded-xl border border-[#dce4e9] bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#3977a9]">Current approved plan</p>
                {hasProfile ? (
                  <>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                      {profile!.guestCount} guests · {profile!.rooms} rooms · {formatCurrencyShort(totalCost!)}
                    </p>
                    <p className="mt-2 text-sm font-medium text-emerald-700">
                      {profile!.dinnerTables} dinner tables · {profile!.meals} meals incl. {profile!.vendorCrewMeals} vendor/crew · {profile!.guestCountWithBuffer} with 5% buffer
                    </p>
                    <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-100 pt-5 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Rooms / Nights</p>
                        <p className="mt-1 font-semibold">
                          {profile!.rooms} rooms · {profile!.roomNights} nights
                        </p>
                        <p className="text-xs text-slate-500">{profile!.brunchGuests} brunch guests</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Service</p>
                        <p className="mt-1 font-semibold">
                          {profile!.tableSize} per table · {profile!.requiredShuttles} shuttles (40/coach)
                        </p>
                        <p className="text-xs text-slate-500">{profile!.stylingHeadcount} styling · {profile!.requiredSecurityOfficerHours} security hours</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Total (before tax/gratuity)</p>
                        <p className="mt-1 font-semibold">{formatMoney(totalCost!)}</p>
                        <p className="text-xs text-slate-500">Event date: {new Date(profile!.weddingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                    <p className="mt-6 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">
                      {event.summary} This approved baseline is stored in Supabase under
                      <span className="font-medium text-[#17324d]"> {profile!.eventCode}</span>; linked quantities and costs below recalculate automatically. Any future edits to the database row will be reflected here and on the dashboard card.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{event.current}</p>
                    <p className="mt-2 text-sm font-medium text-emerald-700">{event.change} from approved baseline</p>
                    <p className="mt-6 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">{event.summary}</p>
                  </>
                )}
              </section>

              {/* Confirmed schedule — only when we have a wedding profile */}
              {hasProfile && schedule && schedule.length ? (
                <section className="rounded-xl border border-[#dce4e9] bg-white p-6">
                  <h2 className="text-lg font-semibold">Confirmed event schedule</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {schedule.length} events · {profile!.venueDisplayName}
                  </p>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.08em] text-slate-500">
                          <th className="pb-2 font-semibold">Date</th>
                          <th className="pb-2 font-semibold">Time</th>
                          <th className="pb-2 font-semibold">Event</th>
                          <th className="pb-2 font-semibold">Space</th>
                          <th className="pb-2 font-semibold text-right">Attendees</th>
                          <th className="pb-2 font-semibold">Dependencies</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map((s) => (
                          <tr key={s.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-3 text-slate-700">{new Date(s.scheduleDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                            <td className="py-3 font-medium">{s.displayTime}</td>
                            <td className="py-3 font-medium text-[#17324d]">{s.eventName}</td>
                            <td className="py-3 text-slate-600">{s.space}</td>
                            <td className="py-3 text-right font-medium">{s.attendees}</td>
                            <td className="py-3 text-xs text-slate-500">{s.dependencies}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {/* Vendor & service plan — only for the wedding */}
              {hasProfile && vendors && vendors.length ? (
                <section className="rounded-xl border border-[#dce4e9] bg-white p-6">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold">Confirmed vendor &amp; service plan</h2>
                    <p className="text-sm font-semibold text-[#17324d]">{formatMoney(totalCost!)} total</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Baseline before taxes, gratuities or unlisted incidentals. Costs recalc with guest/room changes.</p>
                  <div className="mt-5 max-h-[520px] overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-[#f8fafb] text-[11px] uppercase tracking-[0.08em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Category</th>
                          <th className="px-3 py-2 font-semibold">Vendor</th>
                          <th className="px-3 py-2 font-semibold">Scope</th>
                          <th className="px-3 py-2 font-semibold text-right">Unit</th>
                          <th className="px-3 py-2 font-semibold text-right">Qty</th>
                          <th className="px-3 py-2 font-semibold text-right">Est.</th>
                          <th className="px-3 py-2 font-semibold">Cutoff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendors.map((v) => (
                          <tr key={v.id} className="border-t border-slate-100 align-top">
                            <td className="px-3 py-2 font-medium text-[#17324d]">{v.category}</td>
                            <td className="px-3 py-2 text-slate-700">{v.confirmedVendor}</td>
                            <td className="px-3 py-2 text-slate-600">{v.confirmedScope}</td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {formatMoney(v.unitRate)} <span className="text-slate-400">/ {v.pricingBasis}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{v.confirmedQty}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatMoney(v.estimatedCost)}</td>
                            <td className="px-3 py-2 text-[11px] leading-4 text-slate-500">
                              <span className="font-medium text-slate-600">{v.latestChangeCutoff}</span>
                              {v.changeRipple ? <span className="block text-slate-400">{v.changeRipple}</span> : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#f1f6fb] font-semibold text-[#17324d]">
                          <td colSpan={5} className="px-3 py-3 text-right">
                            TOTAL ESTIMATED CONFIRMED PLAN COST
                          </td>
                          <td className="px-3 py-3 text-right">{formatMoney(totalCost!)}</td>
                          <td className="px-3 py-3 text-xs font-normal text-slate-500">Baseline before taxes/gratuities.</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              ) : null}

              <section className="rounded-xl border border-[#dce4e9] bg-white p-6">
                <h2 className="text-lg font-semibold">Change timeline</h2>
                <ol className="mt-5 space-y-5 border-l border-[#b9d9eb] pl-6">
                  {revisions?.length ? (
                    revisions
                      .slice()
                      .sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime())
                      .map((r) => (
                        <li key={r.id}>
                          <p className="text-sm font-semibold">
                            {r.status === "baseline" ? "Baseline recorded" : `Revision ${r.revisionNumber} · ${r.status}`}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{r.summary}</p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(r.effectiveAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
                        </li>
                      ))
                  ) : (
                    <>
                      <li>
                        <p className="text-sm font-semibold">Current approved plan recorded</p>
                        <p className="mt-1 text-sm text-slate-600">YOXA assessment and the required approvals were completed.</p>
                        <p className="mt-1 text-xs text-slate-500">{event.time}</p>
                      </li>
                      <li>
                        <p className="text-sm font-semibold">Client change received</p>
                        <p className="mt-1 text-sm text-slate-600">The Event Manager opened a conversation to coordinate the requested change.</p>
                      </li>
                      <li>
                        <p className="text-sm font-semibold">Original plan approved</p>
                        <p className="mt-1 text-sm text-slate-600">Baseline remains available for comparison.</p>
                      </li>
                    </>
                  )}
                </ol>
              </section>
            </div>
          </div>
        </section>
        <aside style={{ width: chatWidth }} className="relative flex min-h-0 min-w-[380px] shrink-0 flex-col overflow-hidden border-l border-[#dce4e9] bg-white shadow-[-12px_0_32px_rgba(18,50,80,0.08)]">
          <div onMouseDown={beginChatResize} className="group absolute -left-1 top-0 z-20 hidden h-full w-3 cursor-col-resize md:block" aria-label="Resize conversation panel" role="separator">
            <span className="absolute left-1 top-1/2 h-12 w-px -translate-y-1/2 bg-[#8bbbd7] opacity-0 transition group-hover:opacity-100" />
          </div>
          <div className="min-h-0 flex-1">
            <HiltonEventsWorkspace embedded eventId={event.id} eventName={event.name} workflowEventName={event.conversationEventName ?? event.name} selectedConversationId={selectedConversationId} onConversationChange={setSelectedConversationId} />
          </div>
        </aside>
      </div>
    </main>
  );
}

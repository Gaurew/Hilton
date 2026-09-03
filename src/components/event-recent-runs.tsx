"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Clock3, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type EventConversationRun = {
  id: string;
  title: string;
  created_at: string;
  last_triggered_at: string | null;
  workflow_run_id: string | null;
  is_owned_by_current_visitor: boolean;
  message_count: number;
  last_message_preview: string;
  last_activity_at: string;
};

function visitorSession() {
  const visitorStorageKey = "hilton-events-visitor-id";
  const accessKeyStorageKey = "hilton-events-workspace-key";
  let visitorId = window.localStorage.getItem(visitorStorageKey);
  let visitorAccessKey = window.localStorage.getItem(accessKeyStorageKey);
  if (!visitorId) { visitorId = crypto.randomUUID(); window.localStorage.setItem(visitorStorageKey, visitorId); }
  if (!visitorAccessKey) { visitorAccessKey = crypto.randomUUID() + crypto.randomUUID(); window.localStorage.setItem(accessKeyStorageKey, visitorAccessKey); }
  return { visitorId, visitorAccessKey };
}

function timeLabel(value: string) {
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function EventRecentRuns({ eventId, selectedConversationId, onSelectConversation, compact = false }: { eventId: string; selectedConversationId: string | null; onSelectConversation: (conversationId: string | null) => void; compact?: boolean }) {
  const [runs, setRuns] = useState<EventConversationRun[]>([]);
  const [error, setError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    const loadRuns = async () => {
      const { visitorId, visitorAccessKey } = visitorSession();
      const { data, error } = await createClient().functions.invoke("get-event-history", { body: { visitor_id: visitorId, visitor_access_key: visitorAccessKey, event_id: eventId } });
      if (!active) return;
      setError(!!error);
      if (!error && Array.isArray(data?.conversations)) setRuns(data.conversations as EventConversationRun[]);
    };
    void loadRuns();
    const refresh = window.setInterval(() => void loadRuns(), 4000);
    return () => { active = false; window.clearInterval(refresh); };
  }, [eventId]);

  if (compact) return <section className="rounded-lg border border-[#dce4e9] bg-white" aria-label="Chat history">
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <button type="button" onClick={() => setIsExpanded((expanded) => !expanded)} aria-expanded={isExpanded} className="inline-flex min-w-0 items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.11em] text-[#3977a9] hover:text-[#104c97]">
        {isExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
        Chat history{runs.length ? ` (${runs.length})` : ""}
      </button>
      <button type="button" onClick={() => { setIsExpanded(false); onSelectConversation(null); }} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-[#104c97] hover:bg-[#eaf6fc]"><Plus size={14} />New Chat</button>
    </div>
    {isExpanded && <div className="border-t border-[#e8edf0]">
      {error ? <p className="px-4 py-3 text-xs text-[#a53b3b]">Chats are temporarily unavailable.</p> : null}
      {!error && runs.length === 0 ? <p className="px-4 py-3 text-xs leading-5 text-[#65727c]">Send a message to create the first chat.</p> : null}
      {runs.length ? <div className="divide-y divide-[#eef1f3]">
        {runs.map((run) => <button key={run.id} onClick={() => { setIsExpanded(false); onSelectConversation(run.id); }} className={(selectedConversationId === run.id ? "bg-[#edf8fd] " : "bg-white hover:bg-[#f8fbfd] ") + "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-2.5 text-left transition"}>
          <span className="block min-w-0 truncate text-[13px] font-semibold text-[#173c59]">{run.title}</span>
          <span className="whitespace-nowrap text-[10px] text-[#71818c]">{run.message_count} messages · {timeLabel(run.last_activity_at)}</span>
        </button>)}
      </div> : null}
    </div>}
  </section>;

  return <div className="flex h-full min-h-0 flex-col bg-[#f8fafb]">
    <div className="border-b border-[#dce4e9] px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#3977a9]">Event workspace</p>
      <h2 className="mt-1 text-lg font-semibold text-[#123250]">Recent runs</h2>
      <button onClick={() => onSelectConversation(null)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#104c97] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#0d4284]"><Plus size={16} />New conversation</button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {error ? <p className="rounded-md border border-[#f6c7c7] bg-[#fff7f7] px-3 py-3 text-xs leading-5 text-[#a53b3b]">Recent runs are temporarily unavailable. You can still start a new conversation.</p> : null}
      {!error && runs.length === 0 ? <div className="rounded-lg border border-dashed border-[#c7d3da] bg-white px-4 py-5 text-center"><Clock3 className="mx-auto text-[#3977a9]" size={19} /><p className="mt-3 text-sm font-medium text-[#315067]">No previous runs</p><p className="mt-1 text-xs leading-5 text-[#65727c]">Start a conversation to create the first workflow run.</p></div> : null}
      <div className="space-y-2">
        {runs.map((run) => <button key={run.id} onClick={() => onSelectConversation(run.id)} className={(selectedConversationId === run.id ? "border-[#70bde4] bg-[#eaf6fc] " : "border-transparent bg-white hover:border-[#c7dbe8] hover:bg-[#fbfdfe] ") + "w-full rounded-lg border p-3 text-left shadow-[0_1px_2px_rgba(18,50,80,0.04)] transition"}>
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#173c59]">{run.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#65727c]">{run.last_message_preview}</p>
          <p className="mt-2 text-[11px] font-medium text-[#3977a9]">{run.message_count} messages · {timeLabel(run.last_activity_at)}</p>
        </button>)}
      </div>
    </div>
  </div>;
}

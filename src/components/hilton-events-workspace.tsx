"use client";

import { useEffect, useRef, useState } from "react";
import { EventRecentRuns } from "@/components/event-recent-runs";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  ChevronDown,
  Menu,
  MessageCircle,
  PanelRightOpen,
  Plus,
  Search,
} from "lucide-react";
import type { EventMessage } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/client";

const prompts = [
  "Who are the confirmed vendors for this event?",
  "Please add 10 more guests and assess the operational and commercial impact.",
  "Please suggest a change to one of the confirmed vendors.",
];

type ApprovalOption = { option_id: string; title: string; description: string };
type ApprovalTask = { id: string; conversation_id: string; title: string; description: string; options: ApprovalOption[]; status: "pending" | "answered"; selected_option_id: string | null; override_message: string | null };
type ConversationAsset = { id: string; file_name: string; content_type: string; created_at: string; url: string };

export function HiltonEventsWorkspace({ embedded = false, eventId, eventName, workflowEventName, selectedConversationId, onConversationChange }: { embedded?: boolean; eventId?: string; eventName?: string; workflowEventName?: string; selectedConversationId?: string | null; onConversationChange?: (conversationId: string | null) => void }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<EventMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<ApprovalTask[]>([]);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalDrafts, setApprovalDrafts] = useState<Record<string, string>>({});
  const [submittingApprovalId, setSubmittingApprovalId] = useState<string | null>(null);
  const [assets, setAssets] = useState<ConversationAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ConversationAsset | null>(null);
  const [isAssetPanelOpen, setIsAssetPanelOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(420);
  const chatShellRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const helperStartedAtRef = useRef<string | null>(null);
  const activeConversationId = selectedConversationId === undefined ? conversationId : selectedConversationId;
  const selectConversation = (nextConversationId: string | null, resetView = true) => {
    if (resetView && nextConversationId !== activeConversationId) {
      setMessages([]);
      setApprovals([]);
      setAssets([]);
      setSelectedAsset(null);
      setIsAssetPanelOpen(false);
      helperStartedAtRef.current = null;
      setWorkflowStatus(null);
      setApprovalError(null);
      setApprovalDrafts({});
    }
    setConversationId(nextConversationId);
    onConversationChange?.(nextConversationId);
  };

  function getVisitorSession() {
    const visitorStorageKey = "hilton-events-visitor-id";
    const accessKeyStorageKey = "hilton-events-workspace-key";
    let visitorId = window.localStorage.getItem(visitorStorageKey);
    let visitorAccessKey = window.localStorage.getItem(accessKeyStorageKey);
    if (!visitorId) { visitorId = crypto.randomUUID(); window.localStorage.setItem(visitorStorageKey, visitorId); }
    if (!visitorAccessKey) { visitorAccessKey = crypto.randomUUID() + crypto.randomUUID(); window.localStorage.setItem(accessKeyStorageKey, visitorAccessKey); }
    return { visitorId, visitorAccessKey };
  }

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maximumHeight = 192;
    textarea.style.height = Math.min(textarea.scrollHeight, maximumHeight) + "px";
    textarea.style.overflowY = textarea.scrollHeight > maximumHeight ? "auto" : "hidden";
  }, [draft]);

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    const loadHistory = async () => {
      const { visitorId, visitorAccessKey } = getVisitorSession();
      const [{ data: historyData, error: historyError }, approvalResult] = await Promise.all([
        createClient().functions.invoke("get-event-history", { body: { visitor_id: visitorId, visitor_access_key: visitorAccessKey, event_id: eventId, ...(activeConversationId ? { conversation_id: activeConversationId } : {}) } }),
        createClient().functions.invoke("get-pending-approvals", { body: { visitor_id: visitorId, visitor_access_key: visitorAccessKey, ...(activeConversationId ? { conversation_id: activeConversationId } : { event_id: eventId }) } }),
      ]);
      if (!active) return;
      if (historyError) setWorkflowStatus(null);
      else if (Array.isArray(historyData?.messages)) {
        const loadedMessages: EventMessage[] = historyData.messages.map((message: { id: string; role: string; content_markdown: string; created_at: string }) => ({ id: message.id, role: message.role === "user" || message.role === "visitor" ? "user" : "assistant", content: message.content_markdown, createdAt: message.created_at }));
        setMessages(loadedMessages);
        setAssets(Array.isArray(historyData?.assets) ? historyData.assets : []);
        const helperStartedAt = helperStartedAtRef.current;
        if (helperStartedAt && loadedMessages.some((message) => message.role === "assistant" && new Date(message.createdAt).getTime() >= new Date(helperStartedAt).getTime())) {
          helperStartedAtRef.current = null;
          setWorkflowStatus(null);
        }
      }
      if (approvalResult.error) { setApprovalError("We couldn’t load the latest approval request."); return; }
      setApprovalError(null);
      const pendingApprovals = Array.isArray(approvalResult.data?.approvals) ? approvalResult.data.approvals as ApprovalTask[] : [];
      setApprovals(activeConversationId ? pendingApprovals.filter((approval) => approval.conversation_id === activeConversationId) : []);
    };
    void loadHistory();
    const refresh = window.setInterval(() => void loadHistory(), 4000);
    return () => { active = false; window.clearInterval(refresh); };
  }, [eventId, activeConversationId]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || isSending) return;
    const { visitorId, visitorAccessKey } = getVisitorSession();
    const requestStartedAt = new Date().toISOString();
    setIsSending(true);
    helperStartedAtRef.current = requestStartedAt;
    setWorkflowStatus("YOXA is thinking…");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content, createdAt: requestStartedAt }]);
    setDraft("");
    const { data, error } = await createClient().functions.invoke("start-event-change", { body: { change_request: content, conversation_id: activeConversationId, visitor_id: visitorId, visitor_access_key: visitorAccessKey, ...(eventId ? { event_id: eventId } : {}), ...((workflowEventName ?? eventName) ? { event_name: workflowEventName ?? eventName } : {}) } });
    if (error || !data?.conversation_id) {
      helperStartedAtRef.current = null;
      setWorkflowStatus(null);
    } else selectConversation(data.conversation_id, false);
    setIsSending(false);
  }

  function beginPanelResize(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const bounds = chatShellRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const minimumAssetWidth = 260;
    const maximumAssetWidth = Math.max(minimumAssetWidth, bounds.width - 360);
    const onMove = (move: MouseEvent) => setPanelWidth(Math.min(maximumAssetWidth, Math.max(minimumAssetWidth, bounds.right - move.clientX)));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }

  async function respondToApproval(approval: ApprovalTask, selectedOptionId?: string) {
    const approvalConversationId = approval.conversation_id || activeConversationId;
    if (!approvalConversationId || submittingApprovalId) return;
    const overrideMessage = (approvalDrafts[approval.id] ?? "").trim();
    if (!selectedOptionId && !overrideMessage) { setApprovalError("Choose an option or write a response before sending."); return; }
    const { visitorId, visitorAccessKey } = getVisitorSession();
    setSubmittingApprovalId(approval.id);
    setApprovalError(null);
    const { error } = await createClient().functions.invoke("respond-to-yoxa-hitl", { body: { approval_id: approval.id, conversation_id: approvalConversationId, visitor_id: visitorId, visitor_access_key: visitorAccessKey, ...(selectedOptionId ? { selected_option_id: selectedOptionId } : { override_message: overrideMessage }) } });
    if (error) setApprovalError("YOXA could not receive that decision. Please try again.");
    else {
      helperStartedAtRef.current = new Date().toISOString();
      setApprovals((current) => current.filter((currentApproval) => currentApproval.id !== approval.id));
      setWorkflowStatus("Decision captured. YOXA is taking the next steps…");
    }
    setSubmittingApprovalId(null);
  }

  function newConversation() {
    setDraft("");
    selectConversation(null);
  }

  // A null selection is the new-run composer. Never render stale state from a previously opened run.
  const visibleMessages = activeConversationId ? messages : [];
  const visibleAssets = activeConversationId ? assets : [];
  const visibleApprovals = activeConversationId ? approvals : [];
  const timeline = [
    ...visibleMessages.map((message) => ({ type: "message" as const, createdAt: message.createdAt, message })),
    ...visibleAssets.map((asset) => ({ type: "asset" as const, createdAt: asset.created_at, asset })),
  ].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  return (
    <main className={embedded ? "grid h-full min-w-0 grid-cols-[minmax(0,1fr)] overflow-hidden bg-white font-sans text-[#1d2730]" : "grid h-screen min-w-[1100px] grid-cols-[292px_minmax(0,1fr)] overflow-hidden bg-white font-sans text-[#1d2730]"}>
      <aside className={(embedded ? "hidden " : "flex ") + "min-h-0 flex-col border-r border-[#d8e0e5] bg-[#f8fafb]"}>
        <header className="flex h-[76px] items-center justify-between border-b border-[#d8e0e5] px-6">
          <Link href="/dashboard" className="rounded-md focus:outline-none focus:ring-2 focus:ring-[#9fcde4]"><p className="text-[25px] font-bold tracking-[-0.04em] text-[#123250]">Hilton <span className="font-normal">Events</span></p><p className="mt-0.5 text-xs text-[#65727c]">Back to managed events</p></Link>
          <button aria-label="Search conversations" className="grid size-9 place-items-center rounded-full text-[#315067] hover:bg-[#e5f4fb]"><Search size={19} /></button>
        </header>

        <div className="px-4 pt-5"><button onClick={newConversation} className="flex h-11 w-full items-center gap-3 rounded-md bg-[#104c97] px-4 text-sm font-semibold text-white hover:bg-[#0d4284]"><Plus size={18} />New conversation</button></div>

        <section className="px-6 pt-8" aria-labelledby="previous-events-heading">
          <div className="flex items-center justify-between"><h2 id="previous-events-heading" className="text-xs font-semibold uppercase tracking-[0.11em] text-[#5d6a74]">Previous events</h2><ChevronDown size={16} className="text-[#71818c]" /></div>
          <div className="mt-4 rounded-lg border border-dashed border-[#c7d3da] bg-white px-4 py-5"><MessageCircle size={18} className="text-[#3977a9]" /><p className="mt-3 text-sm font-medium text-[#315067]">No event conversations yet</p><p className="mt-1 text-xs leading-5 text-[#65727c]">Your event conversations will appear here.</p></div>
        </section>

        <div className="mt-auto border-t border-[#d8e0e5] p-4"><button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-[#e5f4fb]"><span className="grid size-8 place-items-center rounded-full bg-[#dbeaf4] text-xs font-semibold text-[#123250]">D</span><span className="flex-1 text-sm font-medium text-[#315067]">Demo workspace</span><Menu size={18} className="text-[#65727c]" /></button></div>
      </aside>

      <div ref={chatShellRef} className="flex min-w-0 overflow-hidden"><section className="grid min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        {eventId ? <div className={(embedded ? "px-6 " : "px-12 ") + "shrink-0 border-b border-[#e8edf0] bg-white py-4"}><EventRecentRuns compact eventId={eventId} selectedConversationId={activeConversationId ?? null} onSelectConversation={selectConversation} /></div> : null}
        <div className="min-h-0 overflow-y-auto">
          <div className={(embedded ? "px-6 " : "px-12 ") + "py-5"}>
            <div className="mb-4 flex justify-end"><button onClick={() => setIsAssetPanelOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-[#104c97] hover:bg-[#eaf6fc]"><PanelRightOpen size={16} />Generated assets</button></div>
            <div className={visibleMessages.length === 0 ? "min-h-[420px]" : ""}>
          {timeline.length === 0 ? <div className={(embedded ? "mx-auto flex h-full max-w-2xl items-center" : "mx-auto flex h-full max-w-4xl justify-center") + " w-full flex-col text-center"}><h1 className="text-[28px] font-semibold tracking-[-0.035em] text-[#123250]">How can we help?</h1><p className="mt-2 text-sm text-[#65727c]">Start with a question or event change.</p><div className="mt-6 grid w-full max-w-2xl gap-2.5 text-left">{prompts.map((prompt) => <button key={prompt} onClick={() => setDraft(prompt)} className="rounded-md border border-[#d8e0e5] bg-white px-4 py-3 text-sm leading-5 text-[#315067] shadow-[0_1px_2px_rgba(18,50,80,0.04)] transition hover:border-[#73bee5] hover:bg-[#f6fbfe]">{prompt}</button>)}</div></div> : <div className="mx-auto w-full max-w-4xl space-y-7">{timeline.map((item) => item.type === "message" ? <article key={item.message.id} className={item.message.role === "user" ? "flex justify-end" : "flex justify-start"}><div className={item.message.role === "user" ? "max-w-[80%] rounded-2xl rounded-br-sm bg-[#e5f4fb] px-5 py-4 text-sm leading-6 text-[#173c59]" : "max-w-[86%] rounded-2xl rounded-bl-sm border border-[#d8e0e5] bg-white px-5 py-4 text-sm leading-6 text-[#173c59] shadow-sm"}>{item.message.role === "assistant" ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: ({ children }) => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-left text-xs">{children}</table></div>, th: ({ children }) => <th className="border border-[#d8e0e5] bg-[#f5f8fa] px-3 py-2 font-semibold">{children}</th>, td: ({ children }) => <td className="border border-[#d8e0e5] px-3 py-2 align-top">{children}</td> }}>{item.message.content}</ReactMarkdown> : item.message.content}</div></article> : <article key={item.asset.id} className="flex justify-start"><button onClick={() => { setSelectedAsset(item.asset); setIsAssetPanelOpen(true); }} className="rounded-lg border border-[#c7dbe8] bg-[#f7fcff] px-4 py-3 text-left text-sm font-semibold text-[#104c97] hover:bg-[#eaf6fc]">View document: {item.asset.file_name}</button></article>)}{visibleApprovals.map((approval) => <article key={approval.id} className="flex justify-start"><div className="w-full max-w-[86%] rounded-xl border border-[#b9d9eb] bg-[#f7fcff] p-5 text-[#173c59] shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.11em] text-[#3977a9]">Action required</p><h2 className="mt-2 text-base font-semibold text-[#123250]">{approval.title}</h2><p className="mt-2 text-sm leading-6 text-[#5d6a74]">{approval.description}</p>{approval.status === "answered" ? null : <><div className="mt-4 grid gap-2">{approval.options.map((option) => <button key={option.option_id} onClick={() => void respondToApproval(approval, option.option_id)} disabled={submittingApprovalId === approval.id} className="rounded-md border border-[#9fcde4] bg-white px-3 py-3 text-left transition hover:border-[#3977a9] hover:bg-[#edf8fd] disabled:opacity-60"><span className="block text-sm font-semibold text-[#123250]">{option.title}</span><span className="mt-1 block text-xs leading-5 text-[#65727c]">{option.description}</span></button>)}</div><textarea value={approvalDrafts[approval.id] ?? ""} onChange={(event) => setApprovalDrafts((current) => ({ ...current, [approval.id]: event.target.value }))} rows={2} placeholder="Add a different instruction…" className="mt-4 block w-full resize-none rounded-md border border-[#c7d3da] bg-white px-3 py-2 text-sm outline-none focus:border-[#00a8e1]" /><button onClick={() => void respondToApproval(approval)} disabled={submittingApprovalId === approval.id || !(approvalDrafts[approval.id] ?? "").trim()} className="mt-2 rounded-md bg-[#104c97] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0d4284] disabled:cursor-not-allowed disabled:bg-[#b6c8d8]">{submittingApprovalId === approval.id ? "Sending…" : "Send response"}</button></>}</div></article>)}{approvalError ? <p className="text-sm text-[#b42318]">{approvalError}</p> : null}{workflowStatus ? <div className="flex items-center gap-2 text-sm text-[#65727c]"><span className="size-2 animate-pulse rounded-full bg-[#00a8e1]" />{workflowStatus}</div> : null}</div>}
            </div>
          </div>
        </div>

        <div className={(embedded ? "px-6" : "px-12") + " pb-5"}><div className="mx-auto grid max-w-4xl gap-3 rounded-[22px] border border-[#c7d3da] bg-white p-4 shadow-[0_8px_24px_rgba(18,50,80,0.1)] focus-within:border-[#00a8e1] focus-within:ring-2 focus-within:ring-[#cdebf9]"><textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={1} placeholder="Describe the change you need for your event…" className="max-h-48 min-h-6 w-full resize-none overflow-y-hidden border-0 bg-transparent text-sm leading-6 text-[#1d2730] outline-none placeholder:text-[#85929b]" /><button onClick={() => void sendMessage()} disabled={!draft.trim() || isSending} aria-label={isSending ? "Sending event change request" : "Send event change request"} className="grid size-10 place-items-center justify-self-end rounded-full bg-[#104c97] text-white transition hover:bg-[#0d4284] disabled:cursor-not-allowed disabled:bg-[#b6c8d8]"><ArrowUp size={19} /></button></div></div>
      </section>{isAssetPanelOpen ? <aside style={{ width: panelWidth }} className="relative flex min-w-0 max-w-[48%] shrink-0 flex-col border-l border-[#d8e0e5] bg-white"><div onMouseDown={beginPanelResize} className="absolute -left-1 top-0 z-20 hidden h-full w-3 cursor-col-resize md:block" aria-label="Resize generated assets panel" role="separator" /><header className="flex h-[76px] items-center justify-between border-b border-[#e2e7ea] px-5"><p className="truncate text-sm font-semibold text-[#123250]">{selectedAsset?.file_name ?? "Generated assets"}</p><button onClick={() => setIsAssetPanelOpen(false)} className="rounded-md px-2 py-1 text-sm text-[#315067] hover:bg-[#edf5fb]">Close</button></header>{selectedAsset ? <iframe title={selectedAsset.file_name} src={selectedAsset.url} className="min-h-0 flex-1 bg-[#f5f8fa]" /> : <div className="grid flex-1 place-items-center p-8 text-center"><div><PanelRightOpen className="mx-auto text-[#3977a9]" size={28} /><p className="mt-4 text-sm font-semibold text-[#123250]">No generated assets</p><p className="mt-2 max-w-xs text-sm leading-6 text-[#65727c]">PDFs created by YOXA will appear here when they are available.</p></div></div>}</aside> : null}</div>
    </main>
  );
}

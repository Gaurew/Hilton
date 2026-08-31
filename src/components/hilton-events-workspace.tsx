"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  ChevronDown,
  Hotel,
  Menu,
  MessageCircle,
  PanelRightOpen,
  Plus,
  Search,
} from "lucide-react";
import type { EventMessage } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/client";

const prompts = [
  "For the Hilton Big Fat Indian Wedding, please add 40 vegetarian meals and 15 Jain meals to the approved dinner service.",
  "The guest count for our conference has increased. Please assess the room and catering impact.",
  "Please review the changes needed to accommodate additional guests while preserving the event schedule.",
];

type ApprovalOption = { option_id: string; title: string; description: string };
type ApprovalTask = { id: string; title: string; description: string; options: ApprovalOption[]; status: "pending" | "answered"; selected_option_id: string | null; override_message: string | null };
type ConversationAsset = { id: string; file_name: string; content_type: string; created_at: string; url: string };

export function HiltonEventsWorkspace() {
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
  const [panelWidth, setPanelWidth] = useState(520);

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
    if (!conversationId) return;
    let active = true;
    const loadApprovals = async () => {
      const { visitorId, visitorAccessKey } = getVisitorSession();
      const [{ data: conversationData, error: conversationError }, { data: approvalData, error: approvalError }] = await Promise.all([
        createClient().functions.invoke("get-conversation-updates", { body: { visitor_id: visitorId, visitor_access_key: visitorAccessKey, conversation_id: conversationId } }),
        createClient().functions.invoke("get-pending-approvals", { body: { visitor_id: visitorId, visitor_access_key: visitorAccessKey, conversation_id: conversationId } }),
      ]);
      if (!active) return;
      if (conversationError) setWorkflowStatus("We couldn’t refresh the latest workflow updates.");
      else if (Array.isArray(conversationData?.messages)) {
        setMessages(conversationData.messages.map((message: { id: string; role: "visitor" | "agent"; content_markdown: string; created_at: string }) => ({ id: message.id, role: message.role, content: message.content_markdown, createdAt: message.created_at })));
        setAssets(Array.isArray(conversationData?.assets) ? conversationData.assets : []);
      }
      if (approvalError) { setApprovalError("We couldn’t load the latest approval request."); return; }
      setApprovalError(null);
      setApprovals(Array.isArray(approvalData?.approvals) ? approvalData.approvals : []);
    };
    void loadApprovals();
    const refresh = window.setInterval(() => void loadApprovals(), 4000);
    return () => { active = false; window.clearInterval(refresh); };
  }, [conversationId]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || isSending) return;
    const { visitorId, visitorAccessKey } = getVisitorSession();
    setIsSending(true);
    setWorkflowStatus(null);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "visitor", content, createdAt: new Date().toISOString() }]);
    setDraft("");
    const { data, error } = await createClient().functions.invoke("start-event-change", { body: { change_request: content, conversation_id: conversationId, visitor_id: visitorId, visitor_access_key: visitorAccessKey } });
    if (error || !data?.conversation_id) setWorkflowStatus("Your request was saved locally, but YOXA could not start. Please try again shortly.");
    else { setConversationId(data.conversation_id); setWorkflowStatus("Request sent to YOXA. We’ll add updates here as the workflow progresses."); }
    setIsSending(false);
  }

  function beginPanelResize(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const onMove = (move: MouseEvent) => setPanelWidth(Math.min(760, Math.max(360, window.innerWidth - move.clientX)));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }

  async function respondToApproval(approvalId: string, selectedOptionId?: string) {
    if (!conversationId || submittingApprovalId) return;
    const overrideMessage = (approvalDrafts[approvalId] ?? "").trim();
    if (!selectedOptionId && !overrideMessage) { setApprovalError("Choose an option or write a response before sending."); return; }
    const { visitorId, visitorAccessKey } = getVisitorSession();
    setSubmittingApprovalId(approvalId);
    setApprovalError(null);
    const { error } = await createClient().functions.invoke("respond-to-yoxa-hitl", { body: { approval_id: approvalId, conversation_id: conversationId, visitor_id: visitorId, visitor_access_key: visitorAccessKey, ...(selectedOptionId ? { selected_option_id: selectedOptionId } : { override_message: overrideMessage }) } });
    if (error) setApprovalError("YOXA could not receive that decision. Please try again.");
    else { setApprovals((current) => current.filter((approval) => approval.id !== approvalId)); setWorkflowStatus("Decision sent to YOXA. The workflow is resuming."); }
    setSubmittingApprovalId(null);
  }

  function newConversation() {
    setMessages([]); setDraft(""); setConversationId(null); setWorkflowStatus(null); setApprovals([]); setAssets([]); setSelectedAsset(null); setIsAssetPanelOpen(false); setApprovalError(null); setApprovalDrafts({});
  }

  return (
    <main className="grid h-screen min-w-[1100px] grid-cols-[292px_minmax(0,1fr)] overflow-hidden bg-white font-sans text-[#1d2730]">
      <aside className="flex min-h-0 flex-col border-r border-[#d8e0e5] bg-[#f8fafb]">
        <header className="flex h-[76px] items-center justify-between border-b border-[#d8e0e5] px-6">
          <div><p className="text-[25px] font-bold tracking-[-0.04em] text-[#123250]">Hilton <span className="font-normal">Events</span></p><p className="mt-0.5 text-xs text-[#65727c]">Event planning workspace</p></div>
          <button aria-label="Search conversations" className="grid size-9 place-items-center rounded-full text-[#315067] hover:bg-[#e5f4fb]"><Search size={19} /></button>
        </header>

        <div className="px-4 pt-5"><button onClick={newConversation} className="flex h-11 w-full items-center gap-3 rounded-md bg-[#104c97] px-4 text-sm font-semibold text-white hover:bg-[#0d4284]"><Plus size={18} />New conversation</button></div>

        <section className="px-6 pt-8" aria-labelledby="previous-events-heading">
          <div className="flex items-center justify-between"><h2 id="previous-events-heading" className="text-xs font-semibold uppercase tracking-[0.11em] text-[#5d6a74]">Previous events</h2><ChevronDown size={16} className="text-[#71818c]" /></div>
          <div className="mt-4 rounded-lg border border-dashed border-[#c7d3da] bg-white px-4 py-5"><MessageCircle size={18} className="text-[#3977a9]" /><p className="mt-3 text-sm font-medium text-[#315067]">No event conversations yet</p><p className="mt-1 text-xs leading-5 text-[#65727c]">Your event conversations will appear here.</p></div>
        </section>

        <div className="mt-auto border-t border-[#d8e0e5] p-4"><button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-[#e5f4fb]"><span className="grid size-8 place-items-center rounded-full bg-[#dbeaf4] text-xs font-semibold text-[#123250]">D</span><span className="flex-1 text-sm font-medium text-[#315067]">Demo workspace</span><Menu size={18} className="text-[#65727c]" /></button></div>
      </aside>

      <div className="flex min-w-0 overflow-hidden"><section className="grid min-w-0 flex-1 grid-rows-[76px_minmax(0,1fr)_auto] overflow-hidden">
        <header className="flex h-[76px] items-center justify-between border-b border-[#e2e7ea] px-8"><div className="flex items-center gap-3"><Hotel size={21} className="text-[#104c97]" /><p className="text-sm font-semibold text-[#123250]">Hilton Events</p><span className="h-4 w-px bg-[#d8e0e5]" /><p className="text-sm text-[#65727c]">New conversation</p></div><button onClick={() => setIsAssetPanelOpen((open) => !open)} aria-label="Toggle generated assets" className="grid size-9 place-items-center rounded-md border border-[#d8e0e5] text-[#315067] hover:bg-[#edf5fb]"><PanelRightOpen size={18} /></button></header>

        <div className={`min-h-0 px-12 ${messages.length === 0 ? "overflow-hidden py-6" : "overflow-y-auto py-8"}`}>
          {messages.length === 0 ? <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center"><p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#3977a9]">Hilton Events</p><h1 className="mt-3 max-w-xl text-[34px] font-semibold tracking-[-0.035em] text-[#123250]">What would you like to change?</h1><p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5d6a74]">Describe what has changed in your event plan. We’ll retrieve the relevant event context and coordinate the next steps.</p><div className="mt-7 grid gap-2.5">{prompts.map((prompt) => <button key={prompt} onClick={() => setDraft(prompt)} className="rounded-md border border-[#d8e0e5] bg-white px-4 py-3 text-left text-sm leading-5 text-[#315067] shadow-[0_1px_2px_rgba(18,50,80,0.04)] transition hover:border-[#73bee5] hover:bg-[#f6fbfe]">{prompt}</button>)}</div></div> : <div className="mx-auto w-full max-w-4xl space-y-7">{messages.map((message) => <article key={message.id} className={message.role === "visitor" ? "flex justify-end" : "flex justify-start"}><div className={message.role === "visitor" ? "max-w-[80%] rounded-2xl rounded-br-sm bg-[#e5f4fb] px-5 py-4 text-sm leading-6 text-[#173c59]" : "max-w-[86%] rounded-2xl rounded-bl-sm border border-[#d8e0e5] bg-white px-5 py-4 text-sm leading-6 text-[#173c59] shadow-sm"}>{message.role === "agent" ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: ({ children }) => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-left text-xs">{children}</table></div>, th: ({ children }) => <th className="border border-[#d8e0e5] bg-[#f5f8fa] px-3 py-2 font-semibold">{children}</th>, td: ({ children }) => <td className="border border-[#d8e0e5] px-3 py-2 align-top">{children}</td> }}>{message.content}</ReactMarkdown> : message.content}</div></article>)}{approvals.map((approval) => <article key={approval.id} className="flex justify-start"><div className="w-full max-w-[86%] rounded-xl border border-[#b9d9eb] bg-[#f7fcff] p-5 text-[#173c59] shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.11em] text-[#3977a9]">Action required</p><h2 className="mt-2 text-base font-semibold text-[#123250]">{approval.title}</h2><p className="mt-2 text-sm leading-6 text-[#5d6a74]">{approval.description}</p>{approval.status === "answered" ? <p className="mt-4 rounded-md bg-[#e5f4fb] px-3 py-2 text-sm font-medium text-[#173c59]">Decision sent to YOXA</p> : <><div className="mt-4 grid gap-2">{approval.options.map((option) => <button key={option.option_id} onClick={() => void respondToApproval(approval.id, option.option_id)} disabled={submittingApprovalId === approval.id} className="rounded-md border border-[#9fcde4] bg-white px-3 py-3 text-left transition hover:border-[#3977a9] hover:bg-[#edf8fd] disabled:opacity-60"><span className="block text-sm font-semibold text-[#123250]">{option.title}</span><span className="mt-1 block text-xs leading-5 text-[#65727c]">{option.description}</span></button>)}</div><textarea value={approvalDrafts[approval.id] ?? ""} onChange={(event) => setApprovalDrafts((current) => ({ ...current, [approval.id]: event.target.value }))} rows={2} placeholder="Add a different instruction…" className="mt-4 block w-full resize-none rounded-md border border-[#c7d3da] bg-white px-3 py-2 text-sm outline-none focus:border-[#00a8e1]" /><button onClick={() => void respondToApproval(approval.id)} disabled={submittingApprovalId === approval.id || !(approvalDrafts[approval.id] ?? "").trim()} className="mt-2 rounded-md bg-[#104c97] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0d4284] disabled:cursor-not-allowed disabled:bg-[#b6c8d8]">{submittingApprovalId === approval.id ? "Sending…" : "Send response"}</button></>}</div></article>)}{assets.map((asset) => <article key={asset.id} className="flex justify-start"><button onClick={() => { setSelectedAsset(asset); setIsAssetPanelOpen(true); }} className="rounded-lg border border-[#c7dbe8] bg-[#f7fcff] px-4 py-3 text-left text-sm font-semibold text-[#104c97] hover:bg-[#eaf6fc]">View document: {asset.file_name}</button></article>)}{approvalError ? <p className="text-sm text-[#b42318]">{approvalError}</p> : null}<div className="flex items-center gap-2 text-sm text-[#65727c]"><span className="size-2 animate-pulse rounded-full bg-[#00a8e1]" />{workflowStatus ?? "YOXA is preparing this request."}</div></div>}
        </div>

        <div className="px-12 pb-5"><div className="mx-auto max-w-4xl rounded-xl border border-[#c7d3da] bg-white p-3 shadow-[0_8px_24px_rgba(18,50,80,0.1)] focus-within:border-[#00a8e1] focus-within:ring-2 focus-within:ring-[#cdebf9]"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={2} placeholder="Describe the change you need for your event…" className="block w-full resize-none border-0 bg-transparent px-2 py-1 text-sm leading-6 text-[#1d2730] outline-none placeholder:text-[#85929b]" /><div className="mt-2 flex items-center justify-between border-t border-[#eef1f3] px-2 pt-3"><p className="text-xs text-[#71818c]">{isSending ? "Sending to YOXA…" : "Enter to send · Shift + Enter for a new line"}</p><button onClick={() => void sendMessage()} disabled={!draft.trim() || isSending} aria-label="Send event change request" className="grid size-9 place-items-center rounded-full bg-[#104c97] text-white hover:bg-[#0d4284] disabled:cursor-not-allowed disabled:bg-[#b6c8d8]"><ArrowUp size={18} /></button></div></div></div>
      </section>{isAssetPanelOpen ? <aside style={{ width: panelWidth }} className="relative flex shrink-0 flex-col border-l border-[#d8e0e5] bg-white"><div onMouseDown={beginPanelResize} className="absolute -left-1 top-0 h-full w-2 cursor-col-resize" /><header className="flex h-[76px] items-center justify-between border-b border-[#e2e7ea] px-5"><p className="truncate text-sm font-semibold text-[#123250]">{selectedAsset?.file_name ?? "Generated assets"}</p><button onClick={() => setIsAssetPanelOpen(false)} className="rounded-md px-2 py-1 text-sm text-[#315067] hover:bg-[#edf5fb]">Close</button></header>{selectedAsset ? <iframe title={selectedAsset.file_name} src={selectedAsset.url} className="min-h-0 flex-1 bg-[#f5f8fa]" /> : <div className="grid flex-1 place-items-center p-8 text-center"><div><PanelRightOpen className="mx-auto text-[#3977a9]" size={28} /><p className="mt-4 text-sm font-semibold text-[#123250]">No generated assets</p><p className="mt-2 max-w-xs text-sm leading-6 text-[#65727c]">PDFs created by YOXA will appear here when they are available.</p></div></div>}</aside> : null}</div>
    </main>
  );
}

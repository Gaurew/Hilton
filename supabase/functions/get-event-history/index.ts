import { readJson, serviceClient } from "../_shared/yoxa.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))), (byte) => byte.toString(16).padStart(2, "0")).join("");
const equal = (left: string, right: string) => { if (left.length !== right.length) return false; let difference = 0; for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index); return difference === 0; };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  const body = await readJson(request);
  if (typeof body?.visitor_id !== "string" || typeof body?.visitor_access_key !== "string" || typeof body?.event_id !== "string") return respond({ error: "Workspace credentials and event_id are required." }, 400);
  if (body.conversation_id != null && typeof body.conversation_id !== "string") return respond({ error: "conversation_id must be a UUID when provided." }, 400);

  const client = serviceClient();
  const accessKeyHash = await hash(body.visitor_access_key);
  let { data: visitor } = await client.from("hilton_visitors").select("access_key_hash").eq("id", body.visitor_id).maybeSingle();
  if (!visitor) {
    const { error } = await client.from("hilton_visitors").insert({ id: body.visitor_id, access_key_hash: accessKeyHash });
    // The chat and run list can initialize at the same time. A duplicate insert means
    // the other request created the same browser workspace; re-read it below.
    if (error && error.code !== "23505") return respond({ error: "Unable to prepare the workspace." }, 500);
    ({ data: visitor } = await client.from("hilton_visitors").select("access_key_hash").eq("id", body.visitor_id).maybeSingle());
  }
  if (!visitor?.access_key_hash || !equal(visitor.access_key_hash, accessKeyHash)) return respond({ error: "Workspace not found." }, 403);

  const { data: event } = await client
    .from("hilton_events")
    .select("id, event_wedding_profiles!inner(event_id)")
    .eq("id", body.event_id)
    .eq("status", "approved")
    .maybeSingle();
  if (!event) return respond({ error: "Approved event plan not found." }, 404);

  const { data: conversations, error: conversationError } = await client
    .from("event_conversations")
    .select("id, visitor_id, title, created_at, last_triggered_at, workflow_run_id")
    .eq("event_id", body.event_id)
    .order("created_at", { ascending: false });
  if (conversationError) return respond({ error: "Unable to retrieve event conversations." }, 500);

  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
  if (!conversationIds.length) return respond({ conversations: [], messages: [], assets: [] });
  if (body.conversation_id && !conversationIds.includes(body.conversation_id)) return respond({ error: "Conversation does not belong to this workspace and event." }, 404);

  // The history list needs only counts and timestamps. Full message bodies and
  // assets are queried only for the one chat the user selected.
  const { data: messageActivity, error: activityError } = await client
    .from("conversation_messages")
    .select("conversation_id, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at");
  if (activityError) return respond({ error: "Unable to retrieve chat activity." }, 500);

  const activityByConversation = new Map<string, string[]>();
  for (const message of messageActivity ?? []) {
    activityByConversation.set(message.conversation_id, [...(activityByConversation.get(message.conversation_id) ?? []), message.created_at]);
  }
  const runSummaries = (conversations ?? []).map((conversation) => {
    const activity = activityByConversation.get(conversation.id) ?? [];
    const latestActivity = activity.at(-1);
    return {
      id: conversation.id,
      title: conversation.title || "New event conversation",
      created_at: conversation.created_at,
      last_triggered_at: conversation.last_triggered_at,
      workflow_run_id: conversation.workflow_run_id,
      is_owned_by_current_visitor: conversation.visitor_id === body.visitor_id,
      message_count: activity.length,
      last_message_preview: "",
      last_activity_at: latestActivity ?? conversation.last_triggered_at ?? conversation.created_at,
    };
  }).sort((left, right) => new Date(right.last_activity_at).getTime() - new Date(left.last_activity_at).getTime());

  const selectedConversationId = body.conversation_id as string | undefined;
  let selectedMessages: Array<{ id: string; conversation_id: string; role: string; category: string; content_markdown: string; created_at: string }> = [];
  let selectedAssets: Array<{ id: string; conversation_id: string; file_name: string; content_type: string; storage_path: string; created_at: string }> = [];
  if (selectedConversationId) {
    const [messagesResult, assetsResult] = await Promise.all([
      client.from("conversation_messages").select("id, conversation_id, role, category, content_markdown, created_at").eq("conversation_id", selectedConversationId).order("created_at"),
      client.from("conversation_assets").select("id, conversation_id, file_name, content_type, storage_path, created_at").eq("conversation_id", selectedConversationId).order("created_at"),
    ]);
    if (messagesResult.error || assetsResult.error) return respond({ error: "Unable to retrieve the selected chat." }, 500);
    selectedMessages = messagesResult.data ?? [];
    selectedAssets = assetsResult.data ?? [];
  }

  return respond({
    conversations: runSummaries,
    selected_conversation_is_owned_by_current_visitor: selectedConversationId ? (conversations ?? []).some((conversation) => conversation.id === selectedConversationId && conversation.visitor_id === body.visitor_id) : true,
    messages: selectedMessages,
    assets: selectedAssets.map((asset) => ({
      id: asset.id,
      conversation_id: asset.conversation_id,
      file_name: asset.file_name,
      content_type: asset.content_type,
      created_at: asset.created_at,
      url: client.storage.from("hilton-event-assets").getPublicUrl(asset.storage_path).data.publicUrl,
    })),
  });
});

import { readJson, serviceClient } from "../_shared/yoxa.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const encoder = new TextEncoder();
const hashAccessKey = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))), (byte) => byte.toString(16).padStart(2, "0")).join("");
const equal = (left: string, right: string) => { if (left.length !== right.length) return false; let difference = 0; for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index); return difference === 0; };


async function ensureDemoEventContext(client: ReturnType<typeof serviceClient>, visitorId: string) {
  const { data: existingEvent } = await client.from("hilton_events").select("id").eq("visitor_id", visitorId).eq("status", "approved").limit(1).maybeSingle();
  if (existingEvent) {
    const { data: existingContext } = await client.from("event_contexts").select("id").eq("event_id", existingEvent.id).limit(1).maybeSingle();
    if (existingContext) return true;
  }
  const { data: templateEvent } = await client.from("hilton_events").select("id, event_name, property_name, event_date").eq("status", "approved").limit(1).maybeSingle();
  if (!templateEvent) return false;
  const { data: templateContext } = await client.from("event_contexts").select("approved_context").eq("event_id", templateEvent.id).limit(1).maybeSingle();
  if (!templateContext) return false;
  const { data: event, error: eventError } = await client.from("hilton_events").insert({ visitor_id: visitorId, event_name: templateEvent.event_name, property_name: templateEvent.property_name, event_date: templateEvent.event_date, status: "approved" }).select("id").single();
  if (eventError || !event) return false;
  const { error: contextError } = await client.from("event_contexts").insert({ event_id: event.id, approved_context: templateContext.approved_context });
  return !contextError;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);
  const body = await readJson(request);
  const changeRequest = typeof body?.change_request === "string" ? body.change_request.trim() : "";
  const visitorId = isUuid(body?.visitor_id) ? body.visitor_id : crypto.randomUUID();
  const requestedConversationId = body?.conversation_id;
  const visitorAccessKey = typeof body?.visitor_access_key === "string" ? body.visitor_access_key : "";
  if (visitorAccessKey.length < 32) return respond({ error: "A valid demo workspace key is required." }, 401);
  if (!changeRequest) return respond({ error: "change_request is required." }, 400);
  if (requestedConversationId != null && !isUuid(requestedConversationId)) return respond({ error: "conversation_id must be a UUID when provided." }, 400);

  const client = serviceClient();
  const accessKeyHash = await hashAccessKey(visitorAccessKey);
  const { data: existingVisitor } = await client.from("hilton_visitors").select("access_key_hash").eq("id", visitorId).maybeSingle();
  if (!existingVisitor) {
    const { error } = await client.from("hilton_visitors").insert({ id: visitorId, access_key_hash: accessKeyHash });
    if (error) return respond({ error: "Unable to prepare the demo workspace." }, 500);
  } else if (existingVisitor.access_key_hash && !equal(existingVisitor.access_key_hash, accessKeyHash)) {
    return respond({ error: "This demo workspace belongs to another browser." }, 403);
  } else if (!existingVisitor.access_key_hash) {
    const { error } = await client.from("hilton_visitors").update({ access_key_hash: accessKeyHash }).eq("id", visitorId);
    if (error) return respond({ error: "Unable to secure the demo workspace." }, 500);
  }
  if (!await ensureDemoEventContext(client, visitorId)) return respond({ error: "Unable to prepare the approved demo event context." }, 500);
  let conversationId = requestedConversationId as string | undefined;
  if (conversationId) {
    const { data: conversation, error } = await client.from("event_conversations").select("id").eq("id", conversationId).eq("visitor_id", visitorId).maybeSingle();
    if (error || !conversation) return respond({ error: "This conversation is not available in the current workspace." }, 404);
  } else {
    const { data: conversation, error } = await client.from("event_conversations").insert({ visitor_id: visitorId, title: changeRequest.slice(0, 96) }).select("id").single();
    if (error || !conversation) return respond({ error: "Unable to start a conversation." }, 500);
    conversationId = conversation.id;
  }
  const { error: messageError } = await client.from("conversation_messages").insert({ conversation_id: conversationId, role: "visitor", category: "change_request", content_markdown: changeRequest });
  if (messageError) return respond({ error: "Unable to save the change request." }, 500);

  const triggerUrl = Deno.env.get("YOXA_TRIGGER_URL");
  const deploymentSecret = Deno.env.get("YOXA_DEPLOYMENT_SECRET");
  if (!triggerUrl || !deploymentSecret) return respond({ error: "The YOXA workflow is not configured yet. Your request was saved." }, 503);
  const triggerId = crypto.randomUUID();
  const triggerText = [
    "A Hilton Events participant application received this customer event-change request.", "",
    "Customer change request (use exactly as submitted):", changeRequest, "",
    "Integration identifiers (retain and pass unchanged to Hilton tools):",
    `visitor_id: ${visitorId}`, `conversation_id: ${conversationId}`, `trigger_id: ${triggerId}`,
  ].join("\n");
  let triggerResponse: Response;
  try {
    triggerResponse = await fetch(triggerUrl, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": triggerId, "X-Yoxa-Deployment-Secret": deploymentSecret }, body: JSON.stringify({ trigger_text: triggerText }) });
  } catch {
    return respond({ error: "YOXA could not be reached. Your request was saved; please try again shortly.", conversation_id: conversationId }, 502);
  }
  const responseBody = await triggerResponse.json().catch(() => null);
  if (!triggerResponse.ok) return respond({ error: "YOXA could not start the workflow. Your request was saved; please try again shortly.", conversation_id: conversationId }, 502);
  const workflowRunId = typeof responseBody?.workflow_run_id === "string" ? responseBody.workflow_run_id : typeof responseBody?.run_id === "string" ? responseBody.run_id : typeof responseBody?.id === "string" ? responseBody.id : null;
  const { error: updateError } = await client.from("event_conversations").update({ last_trigger_id: triggerId, last_triggered_at: new Date().toISOString(), ...(workflowRunId ? { workflow_run_id: workflowRunId } : {}) }).eq("id", conversationId);

  if (updateError) return respond({ error: "The workflow started, but its tracking details could not be saved.", conversation_id: conversationId }, 202);
  return respond({ conversation_id: conversationId, trigger_id: triggerId, workflow_run_id: workflowRunId, status: "started" }, 202);
});

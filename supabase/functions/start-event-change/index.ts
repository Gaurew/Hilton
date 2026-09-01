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


const TEMPLATE_VISITOR_ID = "11111111-1111-4111-8111-111111111111";

type DemoEvent = { id: string; event_name: string; property_name: string; event_date: string };

async function ensureDemoEventContexts(client: ReturnType<typeof serviceClient>, visitorId: string): Promise<DemoEvent[] | null> {
  const { data: templates, error: templateError } = await client
    .from("hilton_events")
    .select("id, event_name, property_name, event_date")
    .eq("visitor_id", TEMPLATE_VISITOR_ID)
    .eq("status", "approved");
  if (templateError || !templates?.length) return null;

  const copiedEvents: DemoEvent[] = [];
  for (const template of templates) {
    const { data: templateContext, error: contextReadError } = await client
      .from("event_contexts")
      .select("approved_context")
      .eq("event_id", template.id)
      .maybeSingle();
    if (contextReadError || !templateContext) return null;

    const { data: existingEvent, error: existingEventError } = await client
      .from("hilton_events")
      .select("id, event_name, property_name, event_date")
      .eq("visitor_id", visitorId)
      .eq("event_name", template.event_name)
      .eq("property_name", template.property_name)
      .eq("event_date", template.event_date)
      .maybeSingle();
    if (existingEventError) return null;

    let event = existingEvent;
    if (!event) {
      const { data: insertedEvent, error: insertEventError } = await client
        .from("hilton_events")
        .insert({ visitor_id: visitorId, event_name: template.event_name, property_name: template.property_name, event_date: template.event_date, status: "approved" })
        .select("id, event_name, property_name, event_date")
        .single();
      if (insertEventError || !insertedEvent) return null;
      event = insertedEvent;
    }

    const { error: contextWriteError } = await client
      .from("event_contexts")
      .upsert({ event_id: event.id, approved_context: templateContext.approved_context }, { onConflict: "event_id" });
    if (contextWriteError) return null;
    copiedEvents.push(event);
  }
  return copiedEvents;
}

function selectEventForRequest(events: DemoEvent[], changeRequest: string): DemoEvent | null {
  const request = changeRequest.toLowerCase();
  if (request.includes("cocktail table") || request.includes("bar seating") || request.includes("bar seats")) {
    return events.find((event) => event.event_name.includes("Cocktail")) ?? null;
  }
  if (request.includes("mithai") || request.includes("mithai boxes")) {
    return events.find((event) => event.event_name === "The Big Fat Indian Wedding" && event.event_date === "2026-01-18") ?? null;
  }
  if (request.includes("welcome hamper") || request.includes("newly added rooms")) {
    return events.find((event) => event.event_name.includes("Welcome Hampers")) ?? null;
  }
  return null;
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
  const demoEvents = await ensureDemoEventContexts(client, visitorId);
  if (!demoEvents) return respond({ error: "Unable to prepare the approved demo event contexts." }, 500);
  const selectedEvent = selectEventForRequest(demoEvents, changeRequest);
  let conversationId = requestedConversationId as string | undefined;
  if (conversationId) {
    const { data: conversation, error } = await client.from("event_conversations").select("id").eq("id", conversationId).eq("visitor_id", visitorId).maybeSingle();
    if (error || !conversation) return respond({ error: "This conversation is not available in the current workspace." }, 404);
  } else {
    const { data: conversation, error } = await client.from("event_conversations").insert({ visitor_id: visitorId, event_id: selectedEvent?.id ?? null, title: changeRequest.slice(0, 96) }).select("id").single();
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

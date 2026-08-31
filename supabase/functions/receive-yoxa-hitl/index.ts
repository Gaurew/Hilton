import { serviceClient } from "../_shared/yoxa.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const equal = (left: string, right: string) => { if (left.length !== right.length) return false; let result = 0; for (let i = 0; i < left.length; i += 1) result |= left.charCodeAt(i) ^ right.charCodeAt(i); return result === 0; };
const hex = (value: ArrayBuffer) => Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");

async function validSignature(body: string, timestamp: string, signature: string) {
  const secret = Deno.env.get("YOXA_HITL_WEBHOOK_SIGNING_SECRET");
  const timestampMs = Date.parse(timestamp);
  if (!secret || !Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 300000) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp + "." + body)));
  return equal(signature.replace(/^v1=/, ""), expected);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);
  const rawBody = await request.text();
  if (!await validSignature(rawBody, request.headers.get("X-Yoxa-Webhook-Timestamp") ?? "", request.headers.get("X-Yoxa-Webhook-Signature") ?? "")) return respond({ error: "Invalid webhook signature." }, 401);
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); } catch { return respond({ error: "Invalid JSON payload." }, 400); }
  if (typeof payload.event_type !== "string") return respond({ error: "event_type is required." }, 400);
  const headerEventId = request.headers.get("X-Yoxa-Webhook-Id");
  const eventId = typeof payload.event_id === "string" && payload.event_id.length > 0 ? payload.event_id : headerEventId && headerEventId.length > 0 ? headerEventId : null;
  const client = serviceClient();
  if (payload.event_type === "hitl.webhook_test") {
    if (eventId) {
      const { error } = await client.from("yoxa_webhook_events").insert({ event_id: eventId, event_type: payload.event_type });
      if (error && error.code !== "23505") return respond({ error: "Unable to record webhook test." }, 500);
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (!eventId || payload.event_type !== "hitl.approval_requested" || !isUuid(payload.request_id) || typeof payload.workflow_run_id !== "string" || typeof payload.title !== "string" || typeof payload.description !== "string" || !Array.isArray(payload.options)) return respond({ error: "Invalid approval payload." }, 400);
  const { error: eventError } = await client.from("yoxa_webhook_events").insert({ event_id: eventId, event_type: payload.event_type });
  if (eventError?.code === "23505") return new Response(null, { status: 204, headers: corsHeaders });
  if (eventError) return respond({ error: "Unable to store webhook event." }, 500);
  const options = payload.options.filter((option): option is { option_id: string; title: string; description: string } => Boolean(option) && typeof option.option_id === "string" && typeof option.title === "string" && typeof option.description === "string");
  if (options.length !== payload.options.length) return respond({ error: "Invalid approval options." }, 400);
  const { data: conversation } = await client.from("event_conversations").select("id").eq("workflow_run_id", payload.workflow_run_id).maybeSingle();
  const { error: taskError } = await client.from("yoxa_approval_tasks").insert({ event_id: eventId, request_id: payload.request_id, workflow_run_id: payload.workflow_run_id, conversation_id: conversation?.id ?? null, title: payload.title, description: payload.description, options });
  if (taskError) return respond({ error: "Unable to store approval task." }, 500);
  return new Response(null, { status: 204, headers: corsHeaders });
});

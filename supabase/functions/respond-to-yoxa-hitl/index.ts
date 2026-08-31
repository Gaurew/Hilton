import { readJson, serviceClient } from "../_shared/yoxa.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))), (byte) => byte.toString(16).padStart(2, "0")).join("");
const equal = (left: string, right: string) => { if (left.length !== right.length) return false; let result = 0; for (let i = 0; i < left.length; i += 1) result |= left.charCodeAt(i) ^ right.charCodeAt(i); return result === 0; };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);
  const body = await readJson(request);
  const selectedOptionId = typeof body?.selected_option_id === "string" ? body.selected_option_id : null;
  const overrideMessage = typeof body?.override_message === "string" ? body.override_message.trim() : null;
  if (typeof body?.visitor_id !== "string" || typeof body?.conversation_id !== "string" || typeof body?.visitor_access_key !== "string" || typeof body?.approval_id !== "string" || Boolean(selectedOptionId) === Boolean(overrideMessage)) return respond({ error: "Submit exactly one approval choice." }, 400);
  const client = serviceClient();
  const { data: visitor } = await client.from("hilton_visitors").select("access_key_hash").eq("id", body.visitor_id).maybeSingle();
  if (!visitor?.access_key_hash || !equal(visitor.access_key_hash, await hash(body.visitor_access_key))) return respond({ error: "Workspace not found." }, 403);
  const { data: task, error } = await client.from("yoxa_approval_tasks").select("id, request_id, options, status, event_conversations!inner(id, visitor_id)").eq("id", body.approval_id).eq("conversation_id", body.conversation_id).eq("event_conversations.visitor_id", body.visitor_id).maybeSingle();
  if (error || !task) return respond({ error: "Approval task not found." }, 404);
  if (task.status === "answered") return respond({ status: "answered" });
  if (selectedOptionId && (!Array.isArray(task.options) || !task.options.some((option: { option_id?: string }) => option.option_id === selectedOptionId))) return respond({ error: "That approval option is no longer available." }, 400);
  const triggerUrl = Deno.env.get("YOXA_TRIGGER_URL");
  const responseSecret = Deno.env.get("YOXA_HITL_RESPONSE_SECRET");
  if (!triggerUrl || !responseSecret) return respond({ error: "The approval response service is not configured." }, 503);
  const responseUrl = new URL(triggerUrl);
  responseUrl.pathname = responseUrl.pathname.replace(/\/trigger$/, "/hitl/requests/" + task.request_id + "/respond");
  let yoxaResponse: Response;
  try { yoxaResponse = await fetch(responseUrl, { method: "POST", headers: { "Content-Type": "application/json", "X-Yoxa-HITL-Response-Secret": responseSecret }, body: JSON.stringify(selectedOptionId ? { selected_option_id: selectedOptionId } : { override_message: overrideMessage }) }); } catch { return respond({ error: "YOXA could not receive the decision. Please try again." }, 502); }
  if (!yoxaResponse.ok) return respond({ error: "YOXA could not accept the decision. Please try again." }, 502);
  const { error: updateError } = await client.from("yoxa_approval_tasks").update({ status: "answered", selected_option_id: selectedOptionId, override_message: overrideMessage, answered_at: new Date().toISOString() }).eq("id", task.id);
  if (updateError) return respond({ error: "YOXA accepted the decision, but the local status could not be saved." }, 202);
  return respond({ status: "answered" }, 202);
});

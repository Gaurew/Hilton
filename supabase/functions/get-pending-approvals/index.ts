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
  if (typeof body?.visitor_id !== "string" || typeof body?.conversation_id !== "string" || typeof body?.visitor_access_key !== "string") return respond({ error: "Workspace credentials are required." }, 400);
  const client = serviceClient();
  const { data: visitor } = await client.from("hilton_visitors").select("access_key_hash").eq("id", body.visitor_id).maybeSingle();
  if (!visitor?.access_key_hash || !equal(visitor.access_key_hash, await hash(body.visitor_access_key))) return respond({ error: "Workspace not found." }, 403);
  const { data: conversation } = await client.from("event_conversations").select("id").eq("id", body.conversation_id).eq("visitor_id", body.visitor_id).maybeSingle();
  if (!conversation) return respond({ error: "Conversation not found." }, 404);
  const { data, error } = await client.from("yoxa_approval_tasks").select("id, title, description, options, status, selected_option_id, override_message").eq("conversation_id", body.conversation_id).eq("status", "pending").order("created_at");
  if (error) return respond({ error: "Unable to retrieve approvals." }, 500);
  return respond({ approvals: data ?? [] });
});

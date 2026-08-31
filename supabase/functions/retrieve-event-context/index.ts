import { json, readJson, requireYoxaKey, serviceClient, unauthorized } from "../_shared/yoxa.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!requireYoxaKey(request)) return unauthorized();
  const body = await readJson(request);
  if (!body || typeof body.visitor_id !== "string" || typeof body.conversation_id !== "string" || typeof body.change_request !== "string") return json({ error: "visitor_id, conversation_id, and change_request are required." }, 400);
  const client = serviceClient();
  const { data: conversation } = await client.from("event_conversations").select("id").eq("id", body.conversation_id).eq("visitor_id", body.visitor_id).maybeSingle();
  if (!conversation) return json({ error: "Conversation does not belong to this visitor." }, 404);
  const { data, error } = await client.from("event_contexts").select("id, approved_context, updated_at, hilton_events!inner(id, event_name, property_name, event_date, status, visitor_id)").eq("hilton_events.visitor_id", body.visitor_id).eq("hilton_events.status", "approved");
  if (error) return json({ error: "Unable to retrieve approved event context." }, 500);
  return json({ conversation_id: body.conversation_id, change_request: body.change_request, event_contexts: data ?? [] });
});

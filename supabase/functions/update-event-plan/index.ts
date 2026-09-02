import { json, readJson, requireYoxaKey, serviceClient, unauthorized } from "../_shared/yoxa.ts";

const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!requireYoxaKey(request)) return unauthorized();
  const body = await readJson(request);
  let changes: unknown = body?.changes;
  if (typeof body?.changes_json === "string") {
    try { changes = JSON.parse(body.changes_json); } catch { return json({ error: "changes_json must be a valid JSON object." }, 400); }
  }
  if (!body || !isUuid(body.event_id) || !isUuid(body.conversation_id) || !isUuid(body.trigger_id) || typeof body.change_summary !== "string" || !body.change_summary.trim() || !changes || typeof changes !== "object" || Array.isArray(changes) || typeof body.markdown !== "string" || !body.markdown.trim()) return json({ error: "event_id, conversation_id, trigger_id, change_summary, changes_json, and markdown are required." }, 400);
  const { data, error } = await serviceClient().rpc("apply_yoxa_event_change", { p_event_id: body.event_id, p_conversation_id: body.conversation_id, p_trigger_id: body.trigger_id, p_change_summary: body.change_summary.trim(), p_changes: changes, p_markdown: body.markdown });
  if (error || !Array.isArray(data) || data.length !== 1) {
    if (error) console.error("Update Changes RPC failed", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    const message = error?.message ?? "Unable to apply the approved event change.";
    return json({ error: message }, /not found/i.test(message) ? 404 : /does not match/i.test(message) ? 409 : 500);
  }
  const result = data[0];
  return json({ application_id: result.application_id, message_id: result.message_id, revision_id: result.revision_id, revision_number: result.revision_number, status: result.already_applied ? "already_applied" : "applied" }, result.already_applied ? 200 : 201);
});

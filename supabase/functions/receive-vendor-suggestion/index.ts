import { json, persistAgentMessage, readJson, requireYoxaKey, unauthorized } from "../_shared/yoxa.ts";
Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405); if (!requireYoxaKey(request)) return unauthorized();
  const body = await readJson(request); if (!body || typeof body.conversation_id !== "string" || typeof body.markdown !== "string") return json({ error: "conversation_id and markdown are required." }, 400);
  try { const message = await persistAgentMessage(body.conversation_id, "vendor_suggestion", body.markdown); return json({ message_id: message.id, status: "stored" }, 201); } catch { return json({ error: "Unable to store vendor suggestion." }, 500); }
});

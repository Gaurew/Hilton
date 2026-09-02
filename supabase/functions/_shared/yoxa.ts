import { createClient } from "npm:@supabase/supabase-js@2";

const headers = { "Content-Type": "application/json" };
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
export const unauthorized = () => json({ error: "Unauthorized YOXA connector request." }, 401);

export function requireYoxaKey(request: Request) {
  const expected = Deno.env.get("HILTON_YOXA_CONNECTOR_API_KEY");
  const received = request.headers.get("x-hilton-yoxa-key");
  if (!expected || !received || expected.length !== received.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  return difference === 0;
}

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service configuration is missing.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function readJson(request: Request) { try { return await request.json(); } catch { return null; } }
export async function persistAgentMessage(conversationId: string, category: string, content: string) {
  const { data, error } = await serviceClient().from("conversation_messages").insert({ conversation_id: conversationId, role: "assistant", category, content_markdown: content }).select("id").single();
  if (error) throw error;
  return data;
}

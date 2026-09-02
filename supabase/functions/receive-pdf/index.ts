import { json, readJson, requireYoxaKey, serviceClient, unauthorized } from "../_shared/yoxa.ts";
const maxPdfBytes = 50 * 1024 * 1024;
Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405); if (!requireYoxaKey(request)) return unauthorized();
  let conversationId: unknown; let file: File | undefined;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData(); const raw = form.get("arguments_json"); const args = typeof raw === "string" ? JSON.parse(raw) : {};
    conversationId = form.get("conversation_id") ?? args.conversation_id; file = form.getAll("files").find((value): value is File => value instanceof File);
  } else { conversationId = (await readJson(request))?.conversation_id; }
  if (typeof conversationId !== "string") return json({ error: "conversation_id is required." }, 400);
  if (!file) return json({ asset_id: null, attachment_received: false, status: "accepted" });
  if (file.type !== "application/pdf" || file.size > maxPdfBytes) return json({ error: "Only PDFs up to 50 MiB are accepted." }, 400);
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_"); const storagePath = `${conversationId}/${crypto.randomUUID()}-${safeName}`; const client = serviceClient();
  const { error: uploadError } = await client.storage.from("hilton-event-assets").upload(storagePath, file, { contentType: "application/pdf", upsert: false }); if (uploadError) { console.error("PDF storage upload failed", uploadError); return json({ error: "Unable to store PDF." }, 500); }
  const { data, error } = await client.from("conversation_assets").insert({ conversation_id: conversationId, storage_path: storagePath, file_name: file.name, content_type: file.type }).select("id").single(); if (error) { console.error("PDF asset record failed", error); return json({ error: "Unable to record PDF." }, 500); }
  return json({ asset_id: data.id, attachment_received: true, status: "stored" }, 201);
});

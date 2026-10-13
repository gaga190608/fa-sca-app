// POST /api/stt  (multipart: file)  →  { text } transcrito e pontuado (ElevenLabs Scribe).
// Falha → { _fallback: true, reason }.

import { speechToText } from "@/lib/server/elevenlabs";
import { createRateLimiter } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // ~ alguns minutos de fala
const limited = createRateLimiter({ max: 40 });

export async function POST(req) {
  if (limited(req)) return Response.json({ _fallback: true, reason: "muitas requisições" });
  let file;
  try {
    file = (await req.formData()).get("file");
  } catch {}
  if (!file || typeof file === "string" || !file.size) return Response.json({ error: "Sem áudio." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Áudio grande demais." }, { status: 413 });

  try {
    const r = await speechToText(file, file.name || "fala.webm");
    if (!r.ok) return Response.json({ _fallback: true, reason: r.reason });
    return Response.json({ text: r.text });
  } catch (e) {
    console.error("[api/stt]", e);
    return Response.json({ _fallback: true, reason: "falha de rede" });
  }
}

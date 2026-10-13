// POST /api/tts  { text }  →  áudio mp3 com a voz da Faísca (ElevenLabs).
// Falha → JSON { _fallback: true, reason } e o app usa a voz do celular.

import { textToSpeech } from "@/lib/server/elevenlabs";
import { createRateLimiter } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_CHARS = 900; // protege os créditos: respostas da Faísca são curtas
const limited = createRateLimiter({ max: 60 });

export async function POST(req) {
  if (limited(req)) return Response.json({ _fallback: true, reason: "muitas requisições" });
  let text = "";
  try {
    text = String((await req.json()).text || "").trim();
  } catch {}
  if (!text) return Response.json({ error: "Sem texto." }, { status: 400 });

  try {
    const r = await textToSpeech(text.slice(0, MAX_CHARS));
    if (!r.ok) return Response.json({ _fallback: true, reason: r.reason });
    return new Response(r.res.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice": r.voice },
    });
  } catch (e) {
    console.error("[api/tts]", e);
    return Response.json({ _fallback: true, reason: "falha de rede" });
  }
}

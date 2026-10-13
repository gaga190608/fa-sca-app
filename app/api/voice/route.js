// GET /api/voice  →  o app pergunta se tem voz do ElevenLabs configurada.
// Também serve de diagnóstico: mostra o estado de cada chave (só os 4 últimos dígitos).

import { getKeys, keysReport, VOICE_ID, FALLBACK_VOICE_ID } from "@/lib/server/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const n = getKeys().length;
  return Response.json({
    configured: n > 0,
    chaves: n,
    voz: VOICE_ID,
    voz_reserva: FALLBACK_VOICE_ID,
    estado: keysReport(),
  });
}

// ════════════════════════════════════════════════════════════════════
//  ELEVENLABS (só no servidor)  ·  voz da Faísca + transcrição
//
//  Variáveis na Vercel:
//    ELEVENLABS_API_KEYS        chaves separadas por vírgula (ou ELEVENLABS_API_KEY)
//    ELEVENLABS_VOICE_ID        voz principal (padrão: a mesma do QuestHero)
//    ELEVENLABS_FALLBACK_VOICE  voz padrão do ElevenLabs, usada quando a conta
//                               é grátis (conta grátis não usa vozes da Voice Library)
//
//  RODÍZIO DE CHAVES: cada chave pode não ter permissão pra uma operação,
//  ficar sem cota ou estar inválida. A gente lembra disso (em memória) e
//  pula pra próxima. Se nenhuma servir, a rota avisa e o app usa a voz
//  do próprio celular.
// ════════════════════════════════════════════════════════════════════

const API = "https://api.elevenlabs.io/v1";

export const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "UgBBYS2sOqTuMpoF3BR0" // mesma do QuestHero; troque na Vercel;
export const FALLBACK_VOICE_ID = process.env.ELEVENLABS_FALLBACK_VOICE || "TX3LPaxmHKxFdv7VOQHJ";
const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5"; // rápido e gasta metade dos créditos
const STT_MODEL = process.env.ELEVENLABS_STT_MODEL || "scribe_v2";

const HOUR = 3_600_000;

export function getKeys() {
  const raw = [process.env.ELEVENLABS_API_KEYS, process.env.ELEVENLABS_API_KEY].filter(Boolean).join(",");
  return [...new Set(raw.split(/[\s,;]+/).map((k) => k.trim()).filter(Boolean))];
}

// estado por chave: { tts: bloqueadaAté, stt: bloqueadaAté, freeVoice: bool }
const state = new Map();
const keyState = (k) => {
  if (!state.has(k)) state.set(k, { tts: 0, stt: 0, freeVoice: false });
  return state.get(k);
};
const mask = (k) => `…${k.slice(-4)}`;

function block(key, op, ms, why) {
  const s = keyState(key);
  if (op === "all") { s.tts = s.stt = Date.now() + ms; } else s[op] = Date.now() + ms;
  console.warn(`[elevenlabs] chave ${mask(key)} bloqueada pra ${op} por ${Math.round(ms / 60000)} min: ${why}`);
}

async function readError(res) {
  const raw = await res.text();
  try {
    const d = JSON.parse(raw).detail || {};
    return { status: String(d.status || d.code || ""), message: String(d.message || raw).slice(0, 240) };
  } catch {
    return { status: "", message: raw.slice(0, 240) };
  }
}

// Decide o que fazer com um erro. Devolve "next" (tentar outra chave),
// "voice" (tentar a voz padrão na mesma chave) ou "stop" (erro do pedido em si).
function classify(key, op, httpStatus, err) {
  const t = `${err.status} ${err.message}`.toLowerCase();
  if (httpStatus === 402 && /library voice|upgrade/.test(t)) return "voice";
  if (/missing_permissions|missing the permission/.test(t)) { block(key, op, 24 * HOUR, "sem permissão"); return "next"; }
  if (/invalid_api_key|invalid api key/.test(t)) { block(key, "all", 24 * HOUR, "chave inválida"); return "next"; }
  if (/quota|credits|character limit|exceeds your/.test(t) || httpStatus === 402) { block(key, op, 6 * HOUR, "sem cota"); return "next"; }
  if (httpStatus === 429) { block(key, op, 20_000, "muitas requisições"); return "next"; }
  if (httpStatus === 401 || httpStatus === 403) { block(key, op, HOUR, err.message); return "next"; }
  if (httpStatus >= 500) return "next";
  return "stop";
}

function availableKeys(op) {
  const now = Date.now();
  return getKeys().filter((k) => keyState(k)[op] <= now);
}

/* ---------------- fala (texto → áudio mp3) ---------------- */
export async function textToSpeech(text) {
  const keys = availableKeys("tts");
  let last = { ok: false, reason: getKeys().length ? "nenhuma chave disponível pra voz agora" : "sem chaves configuradas" };
  for (const key of keys) {
    const s = keyState(key);
    const voices = s.freeVoice ? [FALLBACK_VOICE_ID] : [VOICE_ID, FALLBACK_VOICE_ID];
    for (const voice of voices) {
      const res = await fetch(`${API}/text-to-speech/${voice}?output_format=mp3_44100_64`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL,
          ...(TTS_MODEL.includes("multilingual_v2") ? {} : { language_code: "pt" }),
          voice_settings: { stability: 0.45, similarity_boost: 0.8, speed: 1.05 },
        }),
      });
      if (res.ok) return { ok: true, res, voice, key: mask(key) };
      const err = await readError(res);
      const action = classify(key, "tts", res.status, err);
      last = { ok: false, reason: err.message, status: res.status };
      if (action === "voice" && voice !== FALLBACK_VOICE_ID) {
        s.freeVoice = true; // conta grátis: daqui pra frente usa direto a voz padrão
        continue;
      }
      if (action === "stop") return last;
      break; // próxima chave
    }
  }
  return last;
}

/* ---------------- transcrição (áudio → texto pontuado) ---------------- */
export async function speechToText(file, filename) {
  const keys = availableKeys("stt");
  let last = { ok: false, reason: getKeys().length ? "nenhuma chave disponível pra transcrição agora" : "sem chaves configuradas" };
  for (const key of keys) {
    const form = new FormData();
    form.append("model_id", STT_MODEL);
    form.append("language_code", "por");
    form.append("tag_audio_events", "false");
    form.append("file", file, filename);
    const res = await fetch(`${API}/speech-to-text`, { method: "POST", headers: { "xi-api-key": key }, body: form });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, text: String(data.text || "").trim(), key: mask(key) };
    }
    const err = await readError(res);
    last = { ok: false, reason: err.message, status: res.status };
    if (classify(key, "stt", res.status, err) === "stop") return last;
  }
  return last;
}

/* ---------------- diagnóstico ---------------- */
export function keysReport() {
  const now = Date.now();
  return getKeys().map((k) => {
    const s = keyState(k);
    const left = (t) => (t > now ? `bloqueada por ${Math.ceil((t - now) / 60000)} min` : "ok");
    return { chave: mask(k), voz: left(s.tts), transcricao: left(s.stt), voz_padrao: s.freeVoice };
  });
}

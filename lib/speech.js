// ════════════════════════════════════════════════════════════════════
//  VOZ DO APP
//  • speak(texto)       → voz da Faísca pelo ElevenLabs (/api/tts); se não der,
//                          usa a voz do próprio celular (speechSynthesis).
//  • useVoiceInput()    → microfone: grava e transcreve com pontuação
//                          (/api/stt); se não der, usa o ditado do navegador.
//  • recordUtterance()  → grava UMA fala e para sozinho quando ela fica em
//                          silêncio (detector de voz) — usado no modo ligação.
// ════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";

const isBrowser = () => typeof window !== "undefined";

// Se o servidor disser que não tem chave configurada, para de tentar nesta sessão.
let cloudTts = true;
let cloudStt = true;
const noKeys = (reason = "") => /sem chaves configuradas/i.test(reason);

/* ---------------- a transcrição do servidor está disponível? ---------------- */
// Pergunta ao /api/voice UMA vez, antes do primeiro toque no microfone. Sem isso,
// a 1ª gravação ia pro servidor, voltava "sem chave" e o que ela falou se perdia.
let voiceCheck = null;
export function prepareVoice() {
  if (!isBrowser()) return Promise.resolve();
  if (!voiceCheck) {
    voiceCheck = fetch("/api/voice")
      .then((r) => r.json())
      .then((d) => {
        const sttOk = !!d.configured && (d.estado || []).some((k) => k.transcricao === "ok");
        if (!sttOk) cloudStt = false;
        if (!d.configured) cloudTts = false;
      })
      .catch(() => {}); // sem resposta: tenta o servidor e cai pro ditado se falhar
  }
  return voiceCheck;
}

// Erro com uma frase pronta pra mostrar pra ela.
export class VoiceError extends Error {
  constructor(userMessage, cause) {
    super(cause || userMessage);
    this.userMessage = userMessage;
  }
}
const MSG = {
  denied: "Libera o microfone pro Faísca nas permissões do navegador e tenta de novo.",
  silence: "Não ouvi nada. Tenta falar mais perto do celular?",
  retryDictation: "A transcrição do servidor falhou. Toca no microfone de novo: agora vai pelo ditado do celular.",
  serverDown: "Não consegui transcrever. A chave de voz pode estar sem cota (confira em /api/voice).",
  dictationBlocked: "O ditado está bloqueado aqui. No iPhone, abre pelo Safari ou ativa o Ditado em Ajustes > Geral > Teclado.",
  dictationNetwork: "O ditado do celular precisa de internet. Confere a conexão e tenta de novo.",
  generic: "Não consegui ouvir. Tenta de novo?",
};
function dictationError(code) {
  if (code === "not-allowed") return new VoiceError(MSG.denied, code);
  if (code === "service-not-allowed") return new VoiceError(MSG.dictationBlocked, code);
  if (code === "no-speech" || code === "aborted") return new VoiceError(MSG.silence, code);
  if (code === "network") return new VoiceError(MSG.dictationNetwork, code);
  return new VoiceError(MSG.generic, code);
}

/* ---------------- texto falável ---------------- */
function speakable(text) {
  return String(text || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------------- áudio compartilhado (iPhone exige "destravar") ---------------- */
let audioEl = null;
function audio() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "auto";
    audioEl.setAttribute("playsinline", "");
  }
  return audioEl;
}

function silentWavUrl() {
  const sr = 8000, n = 400;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

// Chamar dentro de um toque/clique: depois disso o iPhone deixa o app tocar áudio sozinho.
let unlocked = false;
export function unlockAudio() {
  if (unlocked || !isBrowser()) return;
  unlocked = true;
  try {
    const a = audio();
    a.src = silentWavUrl();
    a.play().catch(() => { unlocked = false; });
  } catch { unlocked = false; }
  if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
}

/* ---------------- falar ---------------- */
const cache = new Map(); // texto → URL do mp3 (não gasta crédito de novo)
let speakToken = 0;
let pendingResolve = null;

export const canSpeak = () => isBrowser() && (typeof Audio !== "undefined" || "speechSynthesis" in window);

function playUrl(url) {
  const a = audio();
  return new Promise((resolve) => {
    pendingResolve = resolve;
    a.onended = () => resolve("ended");
    a.onerror = () => resolve("error");
    a.src = url;
    a.play().catch(() => resolve("error"));
  });
}

function speakBrowser(text) {
  if (!isBrowser() || !("speechSynthesis" in window)) return Promise.resolve("ended");
  return new Promise((resolve) => {
    pendingResolve = resolve;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = 1.03;
    const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pt-br"));
    if (voice) u.voice = voice;
    u.onend = () => resolve("ended");
    u.onerror = () => resolve("error");
    synth.speak(u);
  });
}

async function fetchVoice(text) {
  if (cache.has(text)) return cache.get(text);
  if (!cloudTts) return null;
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (r.ok && (r.headers.get("content-type") || "").startsWith("audio")) {
      const url = URL.createObjectURL(await r.blob());
      cache.set(text, url);
      if (cache.size > 40) {
        const [oldText, oldUrl] = cache.entries().next().value;
        URL.revokeObjectURL(oldUrl);
        cache.delete(oldText);
      }
      return url;
    }
    const d = await r.json().catch(() => ({}));
    if (noKeys(d.reason)) cloudTts = false;
  } catch {}
  return null;
}

// Fala o texto. Devolve uma promessa que termina quando a fala acaba
// ("ended"), dá erro ("error") ou é interrompida ("stopped").
export async function speak(text, onEnd) {
  stopSpeaking();
  const my = ++speakToken;
  const clean = speakable(text);
  if (!clean) { onEnd?.(); return "ended"; }

  let result = "error";
  const url = await fetchVoice(clean);
  if (my !== speakToken) return "stopped";
  if (url) result = await playUrl(url);
  if (result === "error" && my === speakToken) result = await speakBrowser(clean);
  if (my !== speakToken) result = "stopped";
  onEnd?.();
  return result;
}

// Baixa o áudio antes (ex: enquanto mostra o texto), pra falar sem espera.
export function prefetchVoice(text) {
  const clean = speakable(text);
  if (clean) fetchVoice(clean);
}

export function stopSpeaking() {
  speakToken++;
  if (!isBrowser()) return;
  if (audioEl) { audioEl.pause(); audioEl.onended = audioEl.onerror = null; }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  pendingResolve?.("stopped");
  pendingResolve = null;
}

/* ---------------- gravar e transcrever ---------------- */
const Recognition = () => (isBrowser() ? window.SpeechRecognition || window.webkitSpeechRecognition : null);
export const canRecord = () =>
  isBrowser() && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== "undefined";
export const canDictate = () => !!Recognition();

export function pickMime() {
  if (!canRecord()) return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg;codecs=opus"].find((t) =>
    window.MediaRecorder.isTypeSupported?.(t)
  ) || "";
}
const extFor = (mime) => (mime.includes("mp4") || mime.includes("aac") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm");

export async function openMic() {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
}

// Manda o áudio pro ElevenLabs. Devolve o texto pontuado.
export async function transcribe(blob) {
  const form = new FormData();
  const mime = blob.type || "audio/webm";
  form.append("file", blob, `fala.${extFor(mime)}`);
  const r = await fetch("/api/stt", { method: "POST", body: form });
  const d = await r.json().catch(() => ({}));
  if (typeof d.text === "string") return d.text;
  // Falhou por qualquer motivo (sem chave, sem cota, sem permissão…): nesta sessão
  // passa a usar o ditado do celular — antes, com chave sem cota, falhava pra sempre.
  cloudStt = false;
  console.warn("[stt] servidor falhou:", d.reason || d.error || r.status);
  throw new VoiceError(canDictate() ? MSG.retryDictation : MSG.serverDown, d.reason || d.error || "transcrição falhou");
}

// Ditado do próprio navegador (plano B). Devolve o texto falado.
function dictateOnce() {
  return new Promise((resolve, reject) => {
    const R = Recognition();
    if (!R) return reject(new Error("sem ditado"));
    const rec = new R();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let text = "";
    rec.onresult = (e) => { text = Array.from(e.results).map((r) => r[0].transcript).join(" ").trim(); };
    rec.onerror = (e) => reject(dictationError(e.error || "ditado falhou"));
    rec.onend = () => resolve(text);
    rec.start();
    dictateOnce.current = rec;
  });
}

// Microfone de toque: toca → grava; toca de novo → transcreve.
// state: "idle" | "recording" | "transcribing"
export function useVoiceInput(onText, onError) {
  const [state, setState] = useState("idle");
  const recRef = useRef(null);
  const cbRef = useRef({ onText, onError });
  cbRef.current = { onText, onError };

  useEffect(() => { prepareVoice(); }, []);
  useEffect(() => () => {
    recRef.current?.stream?.getTracks().forEach((t) => t.stop());
    dictateOnce.current?.abort?.();
  }, []);

  const supported = canRecord() || canDictate();

  async function start() {
    if (state !== "idle") return;
    unlockAudio();
    stopSpeaking();
    // decide NA HORA do toque (a checagem do servidor e falhas anteriores mudam cloudStt)
    if (cloudStt && canRecord()) {
      try {
        const stream = await openMic();
        const mime = pickMime();
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        const chunks = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
          if (blob.size < 1200) { setState("idle"); return; } // toque acidental
          setState("transcribing");
          try {
            const text = (await transcribe(blob)).trim();
            if (text) cbRef.current.onText(text);
            else cbRef.current.onError?.(new VoiceError(MSG.silence));
          } catch (e) {
            cbRef.current.onError?.(e);
          } finally { setState("idle"); }
        };
        recRef.current = { rec, stream, timer: setTimeout(() => rec.state === "recording" && rec.stop(), 90_000) };
        rec.start(250);
        setState("recording");
        return;
      } catch (e) {
        const denied = e?.name === "NotAllowedError" || e?.name === "SecurityError";
        if (denied || !canDictate()) { cbRef.current.onError?.(new VoiceError(denied ? MSG.denied : MSG.generic, e?.name)); return; }
      }
    }
    // plano B: ditado do navegador
    setState("recording");
    try {
      const text = await dictateOnce();
      if (text) cbRef.current.onText(text);
      else cbRef.current.onError?.(new VoiceError(MSG.silence));
    } catch (e) {
      cbRef.current.onError?.(e);
    } finally { setState("idle"); }
  }

  function stop() {
    const r = recRef.current;
    if (r?.rec?.state === "recording") { clearTimeout(r.timer); r.rec.stop(); }
    else dictateOnce.current?.stop?.();
  }

  return { state, start, stop, supported };
}

/* ---------------- modo ligação: grava uma fala com detector de silêncio ---------------- */
// ctx: AudioContext já destravado (criado num toque). Devolve Blob ou null (ninguém falou).
// opts.onLevel(0..1) pra animar a tela; opts.signal pra cancelar.
export async function recordUtterance(ctx, opts = {}) {
  const { onLevel, onSpeech, signal, silenceMs = 1300, startTimeoutMs = 15_000, maxMs = 45_000 } = opts;
  const stream = await openMic();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const data = new Float32Array(analyser.fftSize);

  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  return new Promise((resolve) => {
    const t0 = performance.now();
    let floor = 0, floorN = 0, speaking = false, lastVoice = 0, done = false;

    const finish = (keep) => {
      if (done) return;
      done = true;
      clearInterval(loop);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        source.disconnect();
        resolve(keep && speaking ? new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" }) : null);
      };
      if (rec.state !== "inactive") rec.stop(); else rec.onstop();
    };
    signal?.addEventListener("abort", () => finish(false), { once: true });

    rec.start(200);
    const loop = setInterval(() => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      const now = performance.now();
      const elapsed = now - t0;
      // primeiros 400ms: mede o ruído do ambiente
      if (elapsed < 400) { floor += rms; floorN++; onLevel?.(0); return; }
      const threshold = Math.max(0.012, (floor / Math.max(1, floorN)) * 3);
      onLevel?.(Math.min(1, rms / (threshold * 4)));
      if (rms > threshold) {
        if (!speaking) onSpeech?.();
        speaking = true;
        lastVoice = now;
      }
      if (speaking && now - lastVoice > silenceMs) finish(true);
      else if (!speaking && elapsed > startTimeoutMs) finish(false);
      else if (elapsed > maxMs) finish(true);
    }, 80);
  });
}

// Plano B do modo ligação: ditado do navegador (para sozinho no silêncio).
export const dictateUtterance = () => dictateOnce();
export const stopDictation = () => dictateOnce.current?.abort?.();
export const cloudSttEnabled = () => cloudStt && canRecord();

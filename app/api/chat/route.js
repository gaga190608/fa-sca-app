// ════════════════════════════════════════════════════════════════════
//  ROTA SERVERLESS  ·  /api/chat   (usando GROQ — grátis, sem cartão)
//  Mesma rota do QuestHero. A chave vem de process.env.GROQ_API_KEY (fica só no servidor).
//  Groq usa o formato compatível com OpenAI.
//
//  POST  entrada: { system, messages:[{role,content}], max_tokens, json, creative?, reasoning? }
//        creative: true → temperatura alta (modo indicações: divergir)
//        reasoning: "low" (padrão) | "medium" | "high" → quanto o modelo pensa antes
//        saída OK: { text }
//        falhas (sempre status 200, pro front cair no modo offline):
//          { _noKey: true }  ·  { _apiError: true, kind, status, detail }
//  GET   diagnóstico: abre /api/chat no navegador pra ver se a IA responde.
// ════════════════════════════════════════════════════════════════════

import { createRateLimiter } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic"; // o GET de diagnóstico não pode ser cacheado no build

// GROQ_API_URL só existe pra testes locais (servidor falso); em produção fica o padrão.
const GROQ_URL = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";

// Modelos em ordem de preferência. O Groq desliga modelos de tempos em
// tempos (o llama-3.3-70b-versatile saiu em 16/08/2026 e derrubou o app):
// se um modelo sumir ou estourar a cota, a rota tenta o próximo.
// Dá pra forçar outro sem mexer no código com a variável GROQ_MODEL.
const MODELS = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
].filter(Boolean);

// Os gpt-oss "pensam" antes de responder e esse raciocínio gasta tokens
// do limite de saída — então damos uma folga além do que o app pediu.
// Mais raciocínio = mais folga (o raciocínio come o limite de saída).
const REASONING_HEADROOM = { low: 1500, medium: 3500, high: 6000 };

// Limites pra rota pública não virar porta aberta pra gastar a cota da chave.
const MAX_TOKENS_CAP = 2500;
const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 12000; // versões do trabalho (lib/ai.js corta em 10 mil)
const MAX_SYSTEM_CHARS = 9000;

const limited = createRateLimiter({ max: 40 });

function hasKey() {
  const k = process.env.GROQ_API_KEY;
  return !!k && k !== "cole-sua-chave-aqui";
}

// Mensagem de erro do Groq (curta, sem dados sensíveis) pra ajudar a diagnosticar.
function groqError(raw) {
  try {
    const e = JSON.parse(raw)?.error || {};
    return { code: String(e.code || e.type || ""), message: String(e.message || "").slice(0, 200) };
  } catch {
    return { code: "", message: raw.slice(0, 200) };
  }
}

const isModelGone = (status, err) =>
  status === 404 || /model_(not_found|decommissioned)|does not exist|decommissioned|not supported/i.test(`${err.code} ${err.message}`);
const isJsonFailure = (err) => /json_validate_failed|json/i.test(err.code);

// Uma chamada ao Groq com um modelo. Devolve { ok, text } ou { ok:false, status, err }.
async function callGroq(model, messages, maxTokens, json, opts) {
  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: maxTokens + REASONING_HEADROOM[opts.effort],
      temperature: opts.temperature,
      reasoning_effort: opts.effort,
      include_reasoning: false,
      // Modo JSON: garante que a resposta seja um objeto JSON válido.
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const raw = await r.text();
  if (!r.ok) return { ok: false, status: r.status, err: groqError(raw) };
  const data = JSON.parse(raw);
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text.trim()) return { ok: false, status: 502, err: { code: "empty", message: "resposta vazia do modelo" } };
  return { ok: true, text };
}

// Tenta os modelos em ordem. JSON inválido → repete sem o modo JSON
// (lib/ai.js já sabe extrair o JSON do texto).
async function complete(messages, maxTokens, json, opts = { temperature: 0.7, effort: "low" }) {
  let last = { status: 500, err: { code: "", message: "nenhum modelo disponível" } };
  for (const model of MODELS) {
    let res = await callGroq(model, messages, maxTokens, json, opts);
    if (!res.ok && json && res.status === 400 && isJsonFailure(res.err)) {
      res = await callGroq(model, messages, maxTokens, false, opts);
    }
    if (res.ok) return { ...res, model };
    console.error(`[api/chat] ${model} → ${res.status} ${res.err.code}: ${res.err.message}`);
    last = res;
    // vale tentar outro modelo: sumiu, cota estourada ou resposta vazia
    if (!(isModelGone(res.status, res.err) || res.status === 429 || res.err.code === "empty")) break;
  }
  return { ok: false, ...last };
}

function failure(status, err) {
  let kind = "api_error";
  if (status === 401 || status === 403) kind = "auth"; // chave errada/revogada
  if (status === 429) kind = "rate_limit"; // estourou a cota grátis
  return Response.json({ _apiError: true, kind, status, detail: err.message }, { status: 200 });
}

export async function POST(req) {
  if (!hasKey()) {
    return Response.json({ _noKey: true, error: "GROQ_API_KEY não configurada." }, { status: 200 });
  }

  if (limited(req)) {
    return Response.json({ _apiError: true, kind: "rate_limit", status: 429 }, { status: 200 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  // system vira a 1ª mensagem; mantém só as últimas mensagens da conversa.
  const messages = [];
  if (typeof body.system === "string" && body.system) {
    messages.push({ role: "system", content: body.system.slice(0, MAX_SYSTEM_CHARS) });
  }
  const history = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  for (const m of history) {
    messages.push({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: typeof m?.content === "string" ? m.content.slice(0, MAX_CHARS_PER_MESSAGE) : "",
    });
  }
  if (messages.length === 0) {
    return Response.json({ error: "Sem mensagens." }, { status: 400 });
  }

  const maxTokens = Math.min(Math.max(Number(body.max_tokens) || 1000, 1), MAX_TOKENS_CAP);
  const opts = {
    temperature: body.creative ? 1 : 0.7,
    effort: ["low", "medium", "high"].includes(body.reasoning) ? body.reasoning : "low",
  };

  try {
    const res = await complete(messages, maxTokens, !!body.json, opts);
    if (!res.ok) return failure(res.status, res.err);
    return Response.json({ text: res.text }, { status: 200 });
  } catch (e) {
    console.error("[api/chat] falha de rede:", e);
    return Response.json({ _apiError: true, kind: "network" }, { status: 200 });
  }
}

// Diagnóstico rápido: https://SEU-APP.vercel.app/api/chat
export async function GET() {
  if (!hasKey()) {
    return Response.json({ ok: false, problema: "GROQ_API_KEY não configurada na Vercel." });
  }
  try {
    const res = await complete([{ role: "user", content: "Responda só: ok" }], 20, false);
    if (res.ok) return Response.json({ ok: true, modelo: res.model, resposta: res.text.trim().slice(0, 40) });
    return Response.json({ ok: false, status: res.status, problema: res.err.message, modelos_tentados: MODELS });
  } catch (e) {
    return Response.json({ ok: false, problema: `falha de rede: ${String(e).slice(0, 120)}` });
  }
}

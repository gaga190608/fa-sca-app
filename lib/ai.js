// ════════════════════════════════════════════════════════════════════
//  CAMADA DE IA (Groq, pela rota /api/chat — a chave fica no servidor)
//  A Faísca NÃO entrega a resposta pronta: mostra os passos do caminho.
//  Exceção: na organização ("o que faço primeiro?") ela recomenda, sim.
//  Toda resposta da IA é validada aqui. Sem IA, cada função tem plano B.
// ════════════════════════════════════════════════════════════════════

import { routineSummary, tasksSummary, localPriority, ENERGY } from "./routine";
import { localISO } from "./dates";

export class OfflineError extends Error {
  constructor(kind = "network") {
    super("offline");
    this.kind = kind; // "no_key" | "rate_limit" | "auth" | "network" | "api_error"
  }
}

async function callAPI(payload) {
  let data;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    data = await res.json();
  } catch {
    throw new OfflineError("network");
  }
  if (data._noKey) throw new OfflineError("no_key");
  if (data._apiError) throw new OfflineError(data.kind || "network");
  if (data.error) throw new OfflineError("api_error");
  return typeof data.text === "string" ? data.text : "";
}

// Extrai o primeiro objeto JSON do texto (tolera ```json ... ``` e texto em volta).
function parseJSONObject(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("no json");
  return JSON.parse(clean.slice(s, e + 1));
}

const str = (v, d = "") => (typeof v === "string" && v.trim() ? v.trim() : d);
const strList = (v, max) => (Array.isArray(v) ? v.map((x) => str(typeof x === "object" ? x?.texto || x?.passo : x)).filter(Boolean).slice(0, max) : []);

/* ---------------- quem é a Faísca ---------------- */

function context({ name, tasks, routine, energy }) {
  const quem = name ? `a ${name}` : "ela";
  return {
    quem,
    block: `CONTEXTO (use quando ajudar; não despeje tudo):
${routineSummary(routine)}
Tarefas pendentes:
${tasksSummary(tasks)}
Energia dela agora: ${ENERGY[energy]?.label || "ok"}.`,
  };
}

const PRINCIPLES = `PRINCÍPIO: você não entrega a resposta pronta — você mostra o CAMINHO.
- Quando ela pedir ideias ("o que eu posso fazer pra X?", "me dá ideias de Y"), NÃO liste ideias prontas. Dê passos curtos e práticos que levem ela a chegar nas próprias ideias (ex.: "Anota 3 coisas que você já viu e gostou sobre…", "Pensa em quem vai receber isso e no que essa pessoa precisa", "Escolhe a que te dá mais vontade de começar"), e termine com uma pergunta que puxe o primeiro passo.
- Se ela insistir na resposta, explique com carinho que a ideia boa é a que sai dela, e ofereça uma pista mais concreta — um exemplo de OUTRA área, nunca a resposta pro caso dela.
- Se ela já trouxe uma ideia, elogie algo específico e ajude a lapidar com perguntas e próximos passos.
- Se ela estiver travada ou desanimada, acolha primeiro (1 frase) e proponha um passo minúsculo.
EXCEÇÃO — ORGANIZAÇÃO: quando ela perguntar o que fazer primeiro ou como encaixar as tarefas no dia, aí sim recomende com clareza, usando as tarefas e a rotina do contexto, e explique o porquê em poucas palavras. Os passos viram a ordem sugerida (com horário quando der). Se faltar informação (prazo, tamanho), pergunte.
Tom: mentora próxima — calorosa, direta, prática, que acredita nela. Português do Brasil.`;

export function buildChatSystem(ctx) {
  const { quem, block } = context(ctx);
  return `Você é a Faísca, uma assistente de IA que acende ideias e ajuda ${quem} a se organizar. Você conversa como uma boa professora: guia, não faz por ela.

${PRINCIPLES}

${block}

FORMATO: responda APENAS com um JSON válido: {"fala": string, "passos": [string], "pergunta": string}
- "fala": 1 a 3 frases, sem markdown e sem emojis.
- "passos": de 0 a 5 passos curtos (até ~14 palavras cada), começando com verbo, que ELA executa. Numa conversa simples, use [].
- "pergunta": uma pergunta curta pra ela continuar (ou "").`;
}

// Ligação: tudo vai ser falado em voz alta.
export function buildCallSystem(ctx) {
  const { quem, block } = context(ctx);
  return `Você é a Faísca, uma assistente de IA numa LIGAÇÃO DE VOZ com ${quem}. Você guia como uma boa professora, sem fazer por ela.

${PRINCIPLES}

${block}

Como você fala: frases curtas e naturais, no máximo 3 por vez. Nada de emojis, listas, asteriscos ou links — tudo vai ser lido em voz alta. Se for dar passos, diga no máximo 3, falando "primeiro… depois… e aí…". Sempre termine com uma pergunta ou convite pra ela continuar.`;
}

// O que a Faísca disse antes, em texto, pra IA lembrar da conversa.
export function toHistory(messages) {
  return messages.slice(-24).map((m) => {
    if (m.role !== "assistant") return { role: "user", content: m.content };
    const steps = (m.steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n");
    return { role: "assistant", content: [m.content, steps, m.ask].filter(Boolean).join("\n") };
  });
}

// Devolve { content, steps[], ask }.
export async function askFaisca(messages, ctx) {
  const raw = await callAPI({ max_tokens: 800, json: true, system: buildChatSystem(ctx), messages: toHistory(messages) });
  try {
    const d = parseJSONObject(raw);
    const content = str(d.fala), steps = strList(d.passos, 5), ask = str(d.pergunta);
    if (!content && !steps.length && !ask) throw new Error("vazio");
    return { content: content || "Bora por partes:", steps, ask };
  } catch {
    // veio texto solto: mostra como fala mesmo
    const text = raw.replace(/```json|```/g, "").trim();
    if (!text) throw new OfflineError("api_error");
    return { content: text.slice(0, 1200), steps: [], ask: "" };
  }
}

export async function callFaisca(history, system) {
  return callAPI({ max_tokens: 500, system, messages: history.slice(-20) });
}

// Sem IA: um roteiro que ainda segue o princípio (caminho, não resposta).
export function offlineReply(text) {
  const t = text.toLowerCase();
  if (/primeiro|come[cç]o|prioridad|organiz|ordem|tarefa/.test(t)) {
    return {
      content: "Tô sem a IA agora, mas a aba Organizar resolve isso sem internet.",
      steps: ["Abre Organizar e confere se suas tarefas estão lá", "Marca o prazo e o tamanho de cada uma", "Toca em \"Por onde eu começo?\""],
      ask: "",
      offline: true,
    };
  }
  return {
    content: "Tô sem a IA agora, mas dá pra começar o caminho assim:",
    steps: [
      "Escreve em uma frase o que você quer resolver",
      "Anota 3 ideias, até as que parecem bobas",
      "Pensa em quem vai ser impactado e no que essa pessoa precisa",
      "Circula a ideia que te dá mais vontade de começar",
      "Define o primeiro passo de 10 minutos",
    ],
    ask: "Qual dessas você consegue fazer agora?",
    offline: true,
  };
}

/* ---------------- despejar tarefas (texto/voz → lista) ---------------- */
// Devolve [{ title, size, due, important }].

export async function parseTasks(text) {
  const today = localISO();
  try {
    const raw = await callAPI({
      max_tokens: 900,
      json: true,
      system:
        `Você transforma o que a pessoa falou ou escreveu numa lista de tarefas. Hoje é ${today}. ` +
        "Separe cada tarefa (uma ação clara, começando com verbo, até 10 palavras, sem inventar tarefas). " +
        'Responda APENAS com JSON: {"tarefas":[{"titulo":string,"tamanho":"rapida"|"media"|"grande","prazo":string,"importante":boolean}]}. ' +
        '"tamanho": rapida ≈ 15 min, media ≈ 1 hora, grande = 2 horas ou mais (estime pelo bom senso). ' +
        '"prazo": "hoje", "amanha", "semana", uma data YYYY-MM-DD se ela disse o dia, ou "" se não falou. ' +
        '"importante": true só se ela indicar urgência/importância.',
      messages: [{ role: "user", content: text.slice(0, 3000) }],
    });
    const d = parseJSONObject(raw);
    const list = (Array.isArray(d.tarefas) ? d.tarefas : [])
      .map((t) => ({
        title: str(t?.titulo).slice(0, 200),
        size: ["rapida", "media", "grande"].includes(t?.tamanho) ? t.tamanho : "media",
        due: /^(hoje|amanha|semana|\d{4}-\d{2}-\d{2})$/.test(str(t?.prazo)) ? t.prazo : "",
        important: !!t?.importante,
      }))
      .filter((t) => t.title)
      .slice(0, 20);
    if (list.length) return list;
  } catch (e) {
    if (!(e instanceof OfflineError)) console.warn("[parseTasks]", e);
  }
  return splitLocal(text);
}

// Plano B: quebra por linha, vírgula, ";" e " e depois ".
function splitLocal(text) {
  return text
    .split(/\n|;|,| e depois | e também |(?:^|\s)\d+[.)]\s/i)
    .map((s) => s.replace(/^[-•*\s]+/, "").replace(/^(tenho que|preciso|eu preciso|tenho de)\s+/i, "").trim())
    .filter((s) => s.length > 2)
    .slice(0, 20)
    .map((s) => ({ title: s.charAt(0).toUpperCase() + s.slice(1), size: "media", due: /\bhoje\b/i.test(s) ? "hoje" : /amanh/i.test(s) ? "amanha" : "", important: false }));
}

/* ---------------- por onde eu começo? ---------------- */
// Devolve { first, why, order:[{ id, when, why }], tip, local? }.

export async function prioritize(tasks, routine, energy, name) {
  const open = tasks.filter((t) => !t.done);
  if (!open.length) return null;
  const local = localPriority(tasks, routine, energy);
  try {
    const raw = await callAPI({
      max_tokens: 1000,
      json: true,
      system:
        `Você é a Faísca, ajudando ${name ? `a ${name}` : "uma pessoa"} a decidir por qual tarefa começar, com base na rotina, nos horários livres de hoje, nos prazos e na energia dela. ` +
        "Pense como uma boa mentora: prazos curtos e importantes primeiro, tarefas grandes no horário em que ela rende mais, " +
        "e com energia baixa, comece por uma vitória rápida. Encaixe as tarefas nos horários livres de hoje (não nos compromissos). " +
        "Use exatamente os ids entre colchetes.\n" +
        `${routineSummary(routine)}\nEnergia agora: ${ENERGY[energy]?.label || "ok"}.\n` +
        'Responda APENAS com JSON: {"comece":string,"porque":string,"ordem":[{"id":string,"quando":string,"porque":string}],"dica":string}. ' +
        '"porque": 1-2 frases falando com ela. "quando": ex. "agora, até 15:30", "19:00–20:00", "amanhã de manhã". ' +
        '"ordem": até 8 tarefas, a primeira é a do "comece". "dica": 1 frase prática pra começar.',
      messages: [{ role: "user", content: `Minhas tarefas:\n${tasksSummary(tasks)}\n\nPor qual eu começo?` }],
    });
    const d = parseJSONObject(raw);
    const ids = new Set(open.map((t) => t.id));
    const order = (Array.isArray(d.ordem) ? d.ordem : [])
      .filter((o) => ids.has(String(o?.id)))
      .map((o) => ({ id: String(o.id), when: str(o.quando), why: str(o.porque) }));
    const first = ids.has(String(d.comece)) ? String(d.comece) : order[0]?.id;
    if (!first) return local;
    if (order[0]?.id !== first) order.unshift({ id: first, when: "agora", why: "" });
    const seen = new Set();
    return {
      first,
      why: str(d.porque, local.why),
      order: order.filter((o) => !seen.has(o.id) && seen.add(o.id)).slice(0, 8),
      tip: str(d.dica, local.tip),
    };
  } catch (e) {
    if (!(e instanceof OfflineError)) console.warn("[prioritize]", e);
    return e instanceof OfflineError ? { ...local, offlineKind: e.kind } : local;
  }
}

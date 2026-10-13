// ════════════════════════════════════════════════════════════════════
//  ROTINA E PRIORIDADE (funções puras — funcionam sem IA)
//  rotina: { wake:"07:00", sleep:"23:00", peak:"manha|tarde|noite",
//            blocks:[{ id, label, start:"HH:MM", end:"HH:MM", days:[0-6] }], notes }
//  tarefa: { id, title, size:"rapida|media|grande", due:"hoje|amanha|semana|"|YYYY-MM-DD,
//            important, done, createdAt, doneAt }
// ════════════════════════════════════════════════════════════════════

import { localISO } from "./dates";

export const SIZES = {
  rapida: { label: "rapidinha", min: 15 },
  media: { label: "~1 hora", min: 60 },
  grande: { label: "grande", min: 120 },
};

export const PEAKS = { manha: "de manhã", tarde: "à tarde", noite: "à noite" };
export const ENERGY = {
  baixa: { label: "baixa" },
  ok: { label: "ok" },
  alta: { label: "alta" },
};
export const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

export const toMin = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const toHHMM = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
export const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

export function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export const DEFAULT_ROUTINE = { wake: "07:00", sleep: "23:00", peak: "manha", blocks: [], notes: "" };

// Blocos ocupados de um dia da semana, ordenados.
export function busyBlocks(routine, day = new Date().getDay()) {
  return (routine.blocks || [])
    .filter((b) => (b.days || []).includes(day))
    .map((b) => ({ ...b, s: toMin(b.start), e: toMin(b.end) }))
    .filter((b) => b.e > b.s)
    .sort((a, b) => a.s - b.s);
}

// Janelas livres de hoje a partir de `from` (minutos), entre acordar e dormir.
export function freeWindows(routine, from = nowMin(), day = new Date().getDay()) {
  const wake = toMin(routine.wake), sleep = toMin(routine.sleep) || 1440;
  let cursor = Math.max(from, wake);
  const out = [];
  for (const b of busyBlocks(routine, day)) {
    if (b.s > cursor) out.push({ s: cursor, e: Math.min(b.s, sleep) });
    cursor = Math.max(cursor, b.e);
  }
  if (sleep > cursor) out.push({ s: cursor, e: sleep });
  return out.filter((w) => w.e - w.s >= 10);
}

// O que está acontecendo agora: bloco ocupado atual, ou janela livre atual/próxima.
export function nowStatus(routine, d = new Date()) {
  const m = nowMin(d);
  const busy = busyBlocks(routine, d.getDay()).find((b) => b.s <= m && m < b.e);
  if (busy) return { kind: "busy", block: busy, until: busy.e };
  if (m < toMin(routine.wake)) return { kind: "early" };
  if (m >= (toMin(routine.sleep) || 1440)) return { kind: "late" };
  const win = freeWindows(routine, m, d.getDay())[0];
  if (win && win.s <= m) return { kind: "free", until: win.e, left: win.e - m };
  return { kind: "free", until: win?.e ?? m, left: 0 };
}

export function periodOf(min) {
  if (min < 12 * 60) return "manha";
  if (min < 18 * 60) return "tarde";
  return "noite";
}

/* ---------------- prazo ---------------- */

// Dias até o prazo (0 = hoje, negativo = atrasada, null = sem prazo).
export function daysToDue(due, today = localISO()) {
  if (!due) return null;
  if (due === "hoje") return 0;
  if (due === "amanha") return 1;
  if (due === "semana") return 5;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return null;
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = due.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function dueLabel(due) {
  const d = daysToDue(due);
  if (d === null) return "";
  if (d < 0) return "atrasada";
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (due === "semana") return "essa semana";
  return `em ${d} dias`;
}

/* ---------------- plano B da prioridade (sem IA) ---------------- */
// Nota por tarefa: urgência + importância + encaixe na energia e no tempo livre de agora.

function score(t, { energy, freeNow, peakNow }) {
  const d = daysToDue(t.due);
  const size = SIZES[t.size] || SIZES.media;
  let s = 0;
  const why = [];
  if (d !== null && d <= 0) { s += 6; why.push(d < 0 ? "já está atrasada" : "o prazo é hoje"); }
  else if (d === 1) { s += 4; why.push("o prazo é amanhã"); }
  else if (d !== null && d <= 5) { s += 2; why.push("vence essa semana"); }
  if (t.important) { s += 3; why.push("você marcou como importante"); }
  if (energy === "baixa") {
    if (t.size === "rapida") { s += 2; why.push("é rapidinha, boa pra energia baixa"); }
    if (t.size === "grande") s -= 2;
  } else if (energy === "alta" || peakNow) {
    if (t.size === "grande") { s += 1.5; why.push("pede foco e você está com energia"); }
  }
  if (freeNow > 0 && size.min <= freeNow) s += 1;
  if (freeNow > 0 && size.min > freeNow + 30) s -= 1;
  return { s, why };
}

// Devolve { first, why, order:[{ id, when, why }], tip } — mesmo formato da IA.
export function localPriority(tasks, routine, energy = "ok", d = new Date()) {
  const open = tasks.filter((t) => !t.done);
  if (!open.length) return null;
  const m = nowMin(d);
  const status = nowStatus(routine, d);
  const freeNow = status.kind === "free" ? status.left : 0;
  const peakNow = periodOf(m) === routine.peak;

  const ranked = open
    .map((t) => ({ t, ...score(t, { energy, freeNow, peakNow }) }))
    .sort((a, b) => b.s - a.s || (SIZES[a.t.size]?.min || 60) - (SIZES[b.t.size]?.min || 60));

  // encaixa em ordem nas janelas livres de hoje
  const wins = freeWindows(routine, m, d.getDay()).map((w) => ({ ...w }));
  const order = ranked.slice(0, 8).map(({ t, why }) => {
    const need = SIZES[t.size]?.min || 60;
    const w = wins.find((x) => x.e - x.s >= Math.min(need, 45));
    let when = "amanhã";
    if (w) {
      const start = w.s, end = Math.min(w.e, start + need);
      when = start <= m + 5 ? `agora, até ${toHHMM(end)}` : `${toHHMM(start)}–${toHHMM(end)}`;
      w.s = end + 10; // respiro entre uma e outra
    }
    return { id: t.id, when, why: why[0] ? cap(why[0]) : "Dá pra encaixar sem pressa." };
  });

  const top = ranked[0];
  const reasons = top.why.length ? top.why.slice(0, 2).join(" e ") : "ela destrava o resto do dia";
  return {
    first: top.t.id,
    why: `Começa por ela porque ${reasons}.`,
    order,
    tip: energy === "baixa"
      ? "Energia baixa não é preguiça: começa pela menor e deixa o embalo trabalhar por você."
      : "Faz só os primeiros 10 minutos. Começar é a parte mais difícil — depois fica leve.",
    local: true,
  };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------------- texto pra IA ---------------- */

export function routineSummary(routine, d = new Date()) {
  const blocks = busyBlocks(routine, d.getDay()).map((b) => `${b.start}–${b.end} ${b.label}`);
  const wins = freeWindows(routine, nowMin(d), d.getDay()).map((w) => `${toHHMM(w.s)}–${toHHMM(w.e)}`);
  return [
    `Agora são ${toHHMM(nowMin(d))} (${["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][d.getDay()]}).`,
    `Acorda ${routine.wake}, dorme ${routine.sleep}. Rende mais ${PEAKS[routine.peak] || "de manhã"}.`,
    `Compromissos fixos de hoje: ${blocks.join("; ") || "nenhum cadastrado"}.`,
    `Horários livres que ainda restam hoje: ${wins.join(", ") || "nenhum"}.`,
    routine.notes ? `Sobre a rotina dela: ${routine.notes.slice(0, 400)}` : "",
  ].filter(Boolean).join("\n");
}

export function tasksSummary(tasks) {
  const open = tasks.filter((t) => !t.done);
  if (!open.length) return "Nenhuma tarefa pendente.";
  return open
    .slice(0, 25)
    .map((t) => `[${t.id}] ${t.title} · ${SIZES[t.size]?.label || "~1 hora"}${t.due ? ` · prazo: ${dueLabel(t.due)}` : ""}${t.important ? " · importante" : ""}`)
    .join("\n");
}

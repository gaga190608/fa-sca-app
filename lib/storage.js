// ════════════════════════════════════════════════════════════════════
//  ARMAZENAMENTO LOCAL (localStorage)
//  fa:profile  → { name, theme, autoSpeak, energy:{ level, day } }
//  fa:tasks    → [tarefa]          (formato em lib/routine.js)
//  fa:routine  → rotina            (formato em lib/routine.js)
//  fa:chats    → [{ id, title, at, messages:[{ role, content, steps?, ask? }] }]
//  Mudou o formato? Migre nos normalize* — senão some o que ela salvou.
// ════════════════════════════════════════════════════════════════════

import { DEFAULT_ROUTINE } from "./routine";

const K = { profile: "fa:profile", tasks: "fa:tasks", routine: "fa:routine", chats: "fa:chats" };
const CHATS_KEEP = 30;
const MSGS_KEEP = 80;

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // cota cheia ou navegação privada
  }
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const DEFAULT_PROFILE = { name: "", theme: "auto", autoSpeak: false, energy: { level: "ok", day: "" } };

const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

export const loadProfile = () => ({ ...DEFAULT_PROFILE, ...obj(read(K.profile, {})) });
export const saveProfile = (p) => write(K.profile, p);

function normalizeTask(t) {
  if (!t || typeof t.title !== "string" || !t.title.trim()) return null;
  return {
    id: String(t.id || uid()),
    title: t.title.trim().slice(0, 200),
    size: ["rapida", "media", "grande"].includes(t.size) ? t.size : "media",
    due: typeof t.due === "string" ? t.due : "",
    important: !!t.important,
    done: !!t.done,
    createdAt: Number(t.createdAt) || Date.now(),
    doneAt: Number(t.doneAt) || 0,
  };
}
export const loadTasks = () => (Array.isArray(read(K.tasks, [])) ? read(K.tasks, []).map(normalizeTask).filter(Boolean) : []);
export const saveTasks = (list) => write(K.tasks, list);
export const makeTask = (data) => normalizeTask({ ...data, id: uid(), createdAt: Date.now() });

function normalizeRoutine(r) {
  const o = obj(r);
  const hhmm = (v, d) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : d);
  return {
    wake: hhmm(o.wake, DEFAULT_ROUTINE.wake),
    sleep: hhmm(o.sleep, DEFAULT_ROUTINE.sleep),
    peak: ["manha", "tarde", "noite"].includes(o.peak) ? o.peak : DEFAULT_ROUTINE.peak,
    notes: typeof o.notes === "string" ? o.notes : "",
    blocks: (Array.isArray(o.blocks) ? o.blocks : [])
      .filter((b) => b && typeof b.label === "string")
      .map((b) => ({
        id: String(b.id || uid()),
        label: b.label.slice(0, 60),
        start: hhmm(b.start, "08:00"),
        end: hhmm(b.end, "09:00"),
        days: Array.isArray(b.days) ? b.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [1, 2, 3, 4, 5],
      })),
  };
}
export const loadRoutine = () => normalizeRoutine(read(K.routine, null));
export const saveRoutine = (r) => write(K.routine, r);
export const hasRoutine = () => !!read(K.routine, null);

function normalizeChat(c) {
  if (!c || !Array.isArray(c.messages)) return null;
  return {
    id: String(c.id || uid()),
    title: typeof c.title === "string" ? c.title : "Conversa",
    at: Number(c.at) || Date.now(),
    messages: c.messages.filter((m) => m && typeof m.content === "string").slice(-MSGS_KEEP),
  };
}
export const loadChats = () => (Array.isArray(read(K.chats, [])) ? read(K.chats, []).map(normalizeChat).filter(Boolean) : []);
export const saveChats = (list) => write(K.chats, list.slice(0, CHATS_KEEP));

/* ---------------- backup ---------------- */

export function exportBackup() {
  return JSON.stringify(
    { app: "faisca", v: 1, at: new Date().toISOString(), profile: loadProfile(), tasks: loadTasks(), routine: loadRoutine(), chats: loadChats() },
    null, 2
  );
}

export function parseBackup(text) {
  const d = JSON.parse(text);
  if (!d || d.app !== "faisca") throw new Error("Esse arquivo não é um backup do Faísca.");
  return {
    profile: { ...DEFAULT_PROFILE, ...obj(d.profile) },
    tasks: (Array.isArray(d.tasks) ? d.tasks : []).map(normalizeTask).filter(Boolean),
    routine: normalizeRoutine(d.routine),
    chats: (Array.isArray(d.chats) ? d.chats : []).map(normalizeChat).filter(Boolean),
  };
}

"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useApp } from "@/components/AppContext";
import { uid } from "@/lib/storage";
import { PEAKS, WEEK, busyBlocks, freeWindows, nowMin, toMin, toHHMM, formatDuration } from "@/lib/routine";

const PRESETS = [
  { label: "Escola", start: "07:00", end: "12:30", days: [1, 2, 3, 4, 5] },
  { label: "Trabalho", start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] },
  { label: "Almoço", start: "12:30", end: "13:30", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Academia", start: "18:00", end: "19:00", days: [1, 3, 5] },
  { label: "Curso", start: "19:00", end: "21:00", days: [2, 4] },
];

// Linha do dia: compromissos, horários livres e o "agora".
function DayStrip({ routine }) {
  const wake = toMin(routine.wake), sleep = toMin(routine.sleep) || 1440;
  const span = Math.max(60, sleep - wake);
  const pos = (m) => `${((Math.min(Math.max(m, wake), sleep) - wake) / span) * 100}%`;
  const blocks = busyBlocks(routine);
  const free = freeWindows(routine, wake);
  const m = nowMin();
  const left = freeWindows(routine, m).reduce((a, w) => a + (w.e - w.s), 0);
  return (
    <div className="fa-strip-wrap">
      <div className="fa-strip">
        {free.map((w, i) => <span key={`f${i}`} className="free" style={{ left: pos(w.s), width: `calc(${pos(w.e)} - ${pos(w.s)})` }} />)}
        {blocks.map((b) => (
          <span key={b.id} className="busy" style={{ left: pos(b.s), width: `calc(${pos(b.e)} - ${pos(b.s)})` }} title={`${b.label} ${b.start}–${b.end}`}>
            <em>{b.label}</em>
          </span>
        ))}
        {m >= wake && m <= sleep && <i className="now" style={{ left: pos(m) }} />}
      </div>
      <div className="fa-strip-scale"><span>{routine.wake}</span><span>{routine.sleep}</span></div>
      <p className="fa-note">Hoje ainda sobram <b>{formatDuration(left)}</b> livres.</p>
    </div>
  );
}

export default function Routine() {
  const { routine, setRoutine } = useApp();
  const [draft, setDraft] = useState({ label: "", start: "08:00", end: "09:00", days: [1, 2, 3, 4, 5] });

  const set = (patch) => setRoutine((r) => ({ ...r, ...patch }));
  const setBlock = (id, patch) => set({ blocks: routine.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const toggleDay = (days, d) => (days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort());

  function addBlock(b = draft) {
    if (!b.label.trim() || toMin(b.end) <= toMin(b.start)) return;
    set({ blocks: [...routine.blocks, { ...b, label: b.label.trim(), id: uid() }].sort((x, y) => toMin(x.start) - toMin(y.start)) });
    setDraft({ label: "", start: b.end, end: toHHMM(toMin(b.end) + 60), days: b.days });
  }

  const draftBad = draft.label.trim() && toMin(draft.end) <= toMin(draft.start);

  return (
    <div className="fa-routine">
      <DayStrip routine={routine} />

      <div className="fa-grid2">
        <label className="fa-card fa-timecard">
          <small>acordo</small>
          <input type="time" value={routine.wake} onChange={(e) => e.target.value && set({ wake: e.target.value })} />
        </label>
        <label className="fa-card fa-timecard">
          <small>durmo</small>
          <input type="time" value={routine.sleep} onChange={(e) => e.target.value && set({ sleep: e.target.value })} />
        </label>
      </div>

      <div className="fa-label">Quando você rende mais?</div>
      <div className="fa-chips">
        {Object.entries(PEAKS).map(([k, v]) => (
          <button key={k} className={`fa-chip ${routine.peak === k ? "on" : ""}`} onClick={() => set({ peak: k })}>
            {k === "manha" ? "🌅" : k === "tarde" ? "☀️" : "🌙"} {v}
          </button>
        ))}
      </div>

      <h2 className="fa-h2">Compromissos fixos</h2>
      {routine.blocks.length === 0 && <p className="fa-note">Coisas que já têm horário: escola, trabalho, curso, academia…</p>}
      <ul className="fa-blocks">
        {routine.blocks.map((b) => (
          <li key={b.id} className="fa-block">
            <div className="fa-block-top">
              <input className="fa-inline" value={b.label} aria-label="Nome" onChange={(e) => setBlock(b.id, { label: e.target.value })} />
              <input type="time" value={b.start} aria-label="Começa" onChange={(e) => e.target.value && setBlock(b.id, { start: e.target.value })} />
              <span>–</span>
              <input type="time" value={b.end} aria-label="Termina" onChange={(e) => e.target.value && setBlock(b.id, { end: e.target.value })} />
              <button className="fa-icon fa-icon-sm" aria-label="Apagar" onClick={() => set({ blocks: routine.blocks.filter((x) => x.id !== b.id) })}><Trash2 size={14} /></button>
            </div>
            <div className="fa-days">
              {WEEK.map((d, i) => (
                <button key={i} className={b.days.includes(i) ? "on" : ""} aria-pressed={b.days.includes(i)}
                  onClick={() => setBlock(b.id, { days: toggleDay(b.days, i) })}>{d}</button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="fa-card fa-newblock">
        <div className="fa-block-top">
          <input className="fa-inline" value={draft.label} placeholder="Novo compromisso" aria-label="Nome do compromisso"
            onChange={(e) => setDraft({ ...draft, label: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addBlock()} />
          <input type="time" value={draft.start} aria-label="Começa" onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
          <span>–</span>
          <input type="time" value={draft.end} aria-label="Termina" onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
        </div>
        <div className="fa-days">
          {WEEK.map((d, i) => (
            <button key={i} className={draft.days.includes(i) ? "on" : ""} aria-pressed={draft.days.includes(i)}
              onClick={() => setDraft({ ...draft, days: toggleDay(draft.days, i) })}>{d}</button>
          ))}
        </div>
        {draftBad && <p className="fa-note" style={{ color: "var(--hot)" }}>O fim precisa ser depois do começo.</p>}
        <button className="fa-btn" style={{ marginTop: 10 }} disabled={!draft.label.trim() || draftBad} onClick={() => addBlock()}>
          <Plus size={15} /> adicionar
        </button>
        <div className="fa-presets">
          {PRESETS.filter((p) => !routine.blocks.some((b) => b.label === p.label)).map((p) => (
            <button key={p.label} className="fa-chip" onClick={() => addBlock(p)}>+ {p.label}</button>
          ))}
        </div>
      </div>

      <label className="fa-label" htmlFor="rn">Algo mais sobre seu dia?</label>
      <textarea id="rn" className="fa-field" rows={3} value={routine.notes} maxLength={400}
        placeholder="Ex.: chego cansada da escola; à noite cuido do meu irmão; quarta é corrida"
        onChange={(e) => set({ notes: e.target.value })} />
      <p className="fa-note">A Faísca usa isso pra sugerir a ordem das suas tarefas.</p>
    </div>
  );
}

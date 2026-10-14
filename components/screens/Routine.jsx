"use client";

import { useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon } from "@/components/icons";
import { Segmented } from "@/components/ui";
import { uid } from "@/lib/storage";
import { PEAKS, WEEK, busyBlocks, freeWindows, nowMin, toMin, toHHMM, formatDuration } from "@/lib/routine";

const PRESETS = [
  { label: "Escola", start: "07:00", end: "12:30", days: [1, 2, 3, 4, 5] },
  { label: "Trabalho", start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] },
  { label: "Almoço", start: "12:30", end: "13:30", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Academia", start: "18:00", end: "19:00", days: [1, 3, 5] },
  { label: "Curso", start: "19:00", end: "21:00", days: [2, 4] },
];
const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// O dia de hoje numa linha: compromissos, tempo livre e o "agora".
function Today({ routine }) {
  const wake = toMin(routine.wake), sleep = toMin(routine.sleep) || 1440;
  const span = Math.max(60, sleep - wake);
  const pct = (m) => ((Math.min(Math.max(m, wake), sleep) - wake) / span) * 100;
  const m = nowMin();
  const left = freeWindows(routine, m).reduce((a, w) => a + (w.e - w.s), 0);
  return (
    <div className="fa-day">
      <small className="fa-eyebrow">Livre no resto de hoje</small>
      <div className="fa-day-big">{formatDuration(left)}</div>
      <div className="fa-strip" role="img" aria-label={`Seu dia de ${routine.wake} a ${routine.sleep}`}>
        {busyBlocks(routine).map((b) => (
          <span key={b.id} className="busy" style={{ left: `${pct(b.s)}%`, width: `${pct(b.e) - pct(b.s)}%` }} title={`${b.label} ${b.start}–${b.end}`}>
            {b.label}
          </span>
        ))}
        {m >= wake && m <= sleep && <span className="now" style={{ left: `${pct(m)}%` }} />}
      </div>
      <div className="fa-strip-scale"><span>{routine.wake}</span><span>{routine.sleep}</span></div>
    </div>
  );
}

function Days({ days, onToggle }) {
  return (
    <div className="fa-days" role="group" aria-label="Dias da semana">
      {WEEK.map((d, i) => (
        <button key={i} className={days.includes(i) ? "on" : ""} aria-pressed={days.includes(i)} aria-label={DAY_NAMES[i]} onClick={() => onToggle(i)}>{d}</button>
      ))}
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
    <div style={{ paddingBottom: 24 }}>
      <Today routine={routine} />

      <p className="fa-group-title">Seu dia</p>
      <ul className="fa-list">
        <li className="fa-row">
          <label htmlFor="wake" className="fa-row-main">Acordo</label>
          <input id="wake" className="fa-time" type="time" value={routine.wake} onChange={(e) => e.target.value && set({ wake: e.target.value })} />
        </li>
        <li className="fa-row">
          <label htmlFor="sleep" className="fa-row-main">Durmo</label>
          <input id="sleep" className="fa-time" type="time" value={routine.sleep} onChange={(e) => e.target.value && set({ sleep: e.target.value })} />
        </li>
      </ul>

      <p className="fa-group-title">Quando você rende mais</p>
      <Segmented label="Quando você rende mais" value={routine.peak} onChange={(v) => set({ peak: v })}
        options={Object.entries(PEAKS).map(([k, v]) => ({ value: k, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />

      <p className="fa-group-title">Compromissos fixos</p>
      {routine.blocks.length > 0 && (
        <ul className="fa-list" style={{ marginBottom: 12 }}>
          {routine.blocks.map((b) => (
            <li key={b.id} className="fa-block">
              <div className="fa-block-top">
                <input className="fa-inline-input" value={b.label} aria-label="Nome do compromisso" onChange={(e) => setBlock(b.id, { label: e.target.value })} />
                <input className="fa-time" type="time" value={b.start} aria-label={`${b.label} começa`} onChange={(e) => e.target.value && setBlock(b.id, { start: e.target.value })} />
                <input className="fa-time" type="time" value={b.end} aria-label={`${b.label} termina`} onChange={(e) => e.target.value && setBlock(b.id, { end: e.target.value })} />
                <button className="fa-icon-btn" aria-label={`Apagar ${b.label}`} onClick={() => set({ blocks: routine.blocks.filter((x) => x.id !== b.id) })}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
              <Days days={b.days} onToggle={(i) => setBlock(b.id, { days: toggleDay(b.days, i) })} />
            </li>
          ))}
        </ul>
      )}

      <div className="fa-list fa-block">
        <div className="fa-block-top">
          <input className="fa-inline-input" value={draft.label} placeholder="Novo compromisso" aria-label="Nome do novo compromisso"
            onChange={(e) => setDraft({ ...draft, label: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addBlock()} />
          <input className="fa-time" type="time" value={draft.start} aria-label="Novo compromisso começa" onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
          <input className="fa-time" type="time" value={draft.end} aria-label="Novo compromisso termina" onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
        </div>
        <Days days={draft.days} onToggle={(i) => setDraft({ ...draft, days: toggleDay(draft.days, i) })} />
        {draftBad && <p className="fa-caption" style={{ color: "var(--accent-ink)" }}>O fim precisa ser depois do começo.</p>}
        <button className="fa-btn fa-press" style={{ marginTop: 12, minHeight: 40, fontSize: 15 }} disabled={!draft.label.trim() || draftBad} onClick={() => addBlock()}>
          Adicionar
        </button>
        <div className="fa-presets">
          {PRESETS.filter((p) => !routine.blocks.some((b) => b.label === p.label)).map((p) => (
            <button key={p.label} className="fa-press" onClick={() => addBlock(p)}>{p.label} {p.start}–{p.end}</button>
          ))}
        </div>
      </div>

      <p className="fa-group-title"><label htmlFor="rn">Algo mais sobre seu dia</label></p>
      <textarea id="rn" className="fa-field" rows={3} value={routine.notes} maxLength={400}
        placeholder="Ex.: chego cansada da escola; à noite cuido do meu irmão; quarta é corrida"
        onChange={(e) => set({ notes: e.target.value })} />
      <p className="fa-caption" style={{ marginLeft: 16 }}>A Faísca usa isso pra sugerir a ordem das suas tarefas.</p>
    </div>
  );
}

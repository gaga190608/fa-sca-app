"use client";

import { useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon } from "@/components/icons";
import { MicButton, OfflineBanner } from "@/components/ui";
import Routine from "@/components/screens/Routine";
import { parseTasks, prioritize } from "@/lib/ai";
import { SIZES, ENERGY, dueLabel, daysToDue } from "@/lib/routine";

const SIZE_ORDER = ["rapida", "media", "grande"];
const DUE_ORDER = ["", "hoje", "amanha", "semana"];
const SIZE_SHORT = { rapida: "15 min", media: "1 h", grande: "2 h+" };

// Lista com mais de um item? (vírgula, quebra de linha, "e depois"…) → passa pela IA.
const looksLikeList = (t) => /\n|,|;| e depois | e também |\d[.)]\s/i.test(t) || t.length > 70;

export default function Organize() {
  const { route } = useApp();
  const [tab, setTab] = useState(route.params.tab || "tasks");
  return (
    <main className="fa-screen">
      <OfflineBanner />
      <div className="fa-subtabs">
        <button className={tab === "tasks" ? "on" : ""} onClick={() => setTab("tasks")}>Tarefas</button>
        <button className={tab === "routine" ? "on" : ""} onClick={() => setTab("routine")}>Rotina</button>
      </div>
      {tab === "tasks" ? <Tasks onRoutine={() => setTab("routine")} /> : <Routine />}
    </main>
  );
}

function Tasks({ onRoutine }) {
  const app = useApp();
  const { tasks, routine, energy, setEnergy, profile, go } = app;
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [plan, setPlan] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const open = tasks.filter((t) => !t.done).sort((a, b) => (daysToDue(a.due) ?? 99) - (daysToDue(b.due) ?? 99));
  const done = tasks.filter((t) => t.done).sort((a, b) => b.doneAt - a.doneAt);
  const byId = (id) => tasks.find((t) => t.id === id);

  async function add(raw = text) {
    const t = raw.trim();
    if (!t || adding) return;
    if (!looksLikeList(t)) {
      app.addTasks([{ title: t, size: "media", due: /\bhoje\b/i.test(t) ? "hoje" : "" }]);
      setText("");
      setPlan(null);
      return;
    }
    setAdding(true);
    const list = await parseTasks(t);
    const made = app.addTasks(list);
    setAdding(false);
    setText("");
    setPlan(null);
    app.toast(made.length ? `${made.length} ${made.length === 1 ? "tarefa anotada" : "tarefas anotadas"}` : "Não achei tarefas aí");
  }

  async function whereToStart() {
    if (planning) return;
    setPlanning(true);
    const p = await prioritize(tasks, routine, energy, profile.name);
    if (p?.offlineKind) app.markOffline(p.offlineKind);
    else if (p && !p.local) app.markOnline();
    setPlan(p);
    setPlanning(false);
  }

  const cycle = (arr, v) => arr[(arr.indexOf(v) + 1) % arr.length];
  const first = plan && byId(plan.first);

  return (
    <>
      <label className="fa-label">Sua energia agora</label>
      <div className="fa-seg" role="radiogroup" aria-label="Sua energia agora">
        {Object.entries(ENERGY).map(([k, v]) => (
          <button key={k} role="radio" aria-checked={energy === k} className={energy === k ? "on" : ""} onClick={() => { setEnergy(k); setPlan(null); }}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="fa-dump">
        <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Suas tarefas"
          placeholder="Despeja tudo que você tem pra fazer. Ex.: estudar pra prova de quinta, lavar a louça e responder a Ju"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(hover: hover)").matches) { e.preventDefault(); add(); }
          }} />
        <div className="fa-dump-row">
          <MicButton disabled={adding} onText={(t) => setText((v) => (v ? `${v}, ${t}` : t))} />
          <button className="fa-line" disabled={!text.trim() || adding} onClick={() => add()}>
            {adding ? <span className="fa-busy">separando…</span> : "Anotar"}
          </button>
        </div>
      </div>

      {open.length > 0 && (
        <button className="fa-start" disabled={planning} onClick={whereToStart}>
          <span className={planning ? "fa-busy" : ""}>{planning ? "Olhando sua rotina…" : "Por onde eu começo?"}</span>
          <Icon name="right" size={26} />
        </button>
      )}

      {routine.blocks.length === 0 && open.length > 1 && (
        <button className="fa-hintline" onClick={onRoutine}>
          Cadastra sua rotina (escola, trabalho, horários) e eu encaixo as tarefas nos seus horários livres.
        </button>
      )}

      {plan && first && (
        <section className="fa-plan" aria-live="polite">
          <span className="fa-kicker">Comece por</span>
          <h3 className="fa-display">{first.title}</h3>
          <p>{plan.why}</p>
          {plan.order.length > 1 && (
            <ol className="fa-order">
              {plan.order.map((o) => {
                const t = byId(o.id);
                if (!t) return null;
                return (
                  <li key={o.id}>
                    <span className="fa-mono">{o.when || "—"}</span>
                    <span><b>{t.title}</b>{o.why && <small>{o.why}</small>}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {plan.tip && <p className="fa-tip">{plan.tip}</p>}
          <div className="fa-plan-actions">
            <button className="fa-btn" onClick={() => go("chat", { prompt: `Vou começar por "${first.title}". Me ajuda a dar o primeiro passo?` })}>
              Me ajuda a começar
            </button>
            <button className="fa-text" onClick={() => setPlan(null)}>fechar</button>
          </div>
          {plan.local && <p className="fa-note">Calculado aqui no celular, sem IA: prazo, importância, tamanho, energia e horários livres.</p>}
        </section>
      )}

      {open.length === 0 ? (
        <div className="fa-emptybox" style={{ marginTop: 18 }}>
          <p>Lista vazia. Anota o que tá na sua cabeça aí em cima — eu separo em tarefas e te ajudo a escolher a primeira.</p>
        </div>
      ) : (
        <ul className="fa-tasks">
          {open.map((t) => {
            const d = daysToDue(t.due);
            return (
              <li key={t.id} className={`fa-task ${plan?.first === t.id ? "first" : ""}`}>
                <button className="fa-check" aria-label={`Marcar "${t.title}" como feita`} onClick={() => { app.toggleTask(t.id); setPlan(null); }} />
                <div>
                  <div className="fa-task-t">{t.title}</div>
                  <div className="fa-meta">
                    <button title="Tamanho (toca pra mudar)" onClick={() => app.updateTask(t.id, { size: cycle(SIZE_ORDER, t.size) })}>
                      {SIZE_SHORT[t.size] || SIZES.media.label}
                    </button>
                    <button className={d !== null && d <= 0 ? "hot" : ""} title="Prazo (toca pra mudar)"
                      onClick={() => app.updateTask(t.id, { due: cycle(DUE_ORDER, DUE_ORDER.includes(t.due) ? t.due : "") })}>
                      {dueLabel(t.due) || "sem prazo"}
                    </button>
                    <button className={t.important ? "star" : ""} aria-pressed={t.important} onClick={() => app.updateTask(t.id, { important: !t.important })}>
                      {t.important ? "★ importante" : "☆ normal"}
                    </button>
                  </div>
                </div>
                <div className="fa-task-tools">
                  <button className="fa-text" onClick={() => go("chat", { prompt: `Me ajuda a quebrar essa tarefa em passos pequenos: "${t.title}"` })}>passos</button>
                  <button className="fa-text" aria-label={`Apagar "${t.title}"`} onClick={() => { app.removeTask(t.id); setPlan(null); }}><Icon name="x" size={13} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <button className="fa-text" style={{ marginTop: 14 }} onClick={() => setShowDone((v) => !v)}>
            {showDone ? "esconder" : "mostrar"} {done.length} {done.length === 1 ? "feita" : "feitas"}
          </button>
          {showDone && (
            <ul className="fa-tasks fa-done">
              {done.slice(0, 30).map((t) => (
                <li key={t.id} className="fa-task">
                  <button className="fa-check on" aria-label={`Desmarcar "${t.title}"`} onClick={() => app.toggleTask(t.id)}><Icon name="check" size={14} /></button>
                  <div className="fa-task-t">{t.title}</div>
                  <button className="fa-text" aria-label={`Apagar "${t.title}"`} onClick={() => app.removeTask(t.id)}><Icon name="x" size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

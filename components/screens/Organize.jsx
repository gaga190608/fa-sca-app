"use client";

import { useState } from "react";
import { Star, Trash2, Loader2, MessageCircle, Plus, ChevronDown, Flame } from "lucide-react";

import { useApp } from "@/components/AppContext";
import { MicButton, OfflineBanner } from "@/components/ui";
import Routine from "@/components/screens/Routine";
import { parseTasks, prioritize } from "@/lib/ai";
import { SIZES, ENERGY, dueLabel, daysToDue } from "@/lib/routine";

const SIZE_ORDER = ["rapida", "media", "grande"];
const DUE_ORDER = ["", "hoje", "amanha", "semana"];

// Lista com mais de um item? (vírgula, quebra de linha, "e depois"…) → passa pela IA.
const looksLikeList = (t) => /\n|,|;| e depois | e também |\d[.)]\s/i.test(t) || t.length > 70;

export default function Organize() {
  const { route } = useApp();
  const [tab, setTab] = useState(route.params.tab || "tasks");
  return (
    <main className="fa-screen fa-in">
      <OfflineBanner />
      <div className="fa-seg">
        <button className={tab === "tasks" ? "on" : ""} onClick={() => setTab("tasks")}>Tarefas</button>
        <button className={tab === "routine" ? "on" : ""} onClick={() => setTab("routine")}>Minha rotina</button>
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
    app.toast(made.length ? `${made.length} ${made.length === 1 ? "tarefa anotada" : "tarefas anotadas"} ✔` : "Não achei tarefas aí 🤔");
  }

  async function whereToStart() {
    if (planning) return;
    setPlanning(true);
    const p = await prioritize(tasks, routine, energy, profile.name);
    if (p?.offlineKind) app.markOffline(p.offlineKind);
    else if (p && !p.local) app.markOnline();
    setPlan(p);
    setPlanning(false);
    if (p) app.celebrate();
  }

  const cycle = (arr, v) => arr[(arr.indexOf(v) + 1) % arr.length];
  const first = plan && byId(plan.first);

  return (
    <>
      <div className="fa-energy">
        <span>Sua energia agora:</span>
        {Object.entries(ENERGY).map(([k, v]) => (
          <button key={k} className={`fa-chip ${energy === k ? "on" : ""}`} onClick={() => { setEnergy(k); setPlan(null); }}>
            {v.emoji} {v.label}
          </button>
        ))}
      </div>

      <div className="fa-dump">
        <textarea className="fa-field" rows={2} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Despeja tudo que você tem pra fazer — pode ser uma lista ou falando: “estudar pra prova de quinta, lavar a louça e responder a Ju”"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(hover: hover)").matches) { e.preventDefault(); add(); }
          }} />
        <div className="fa-dump-actions">
          <MicButton disabled={adding} onText={(t) => setText((v) => (v ? `${v}, ${t}` : t))} />
          <button className="fa-btn" disabled={!text.trim() || adding} onClick={() => add()}>
            {adding ? <><Loader2 size={15} className="fa-spin" /> separando…</> : <><Plus size={15} /> anotar</>}
          </button>
        </div>
      </div>

      {open.length > 0 && (
        <button className="fa-bigcta" disabled={planning} onClick={whereToStart}>
          {planning ? <Loader2 size={20} className="fa-spin" /> : <Flame size={20} />}
          {planning ? "Olhando sua rotina…" : "Por onde eu começo?"}
        </button>
      )}

      {routine.blocks.length === 0 && open.length > 1 && (
        <button className="fa-hintline" onClick={onRoutine}>
          Dica: cadastra sua rotina (escola, trabalho, horários) e eu encaixo as tarefas nos seus horários livres →
        </button>
      )}

      {plan && first && (
        <section className="fa-plan fa-in">
          <small>comece por</small>
          <h3>{first.title}</h3>
          <p>{plan.why}</p>
          {plan.order.length > 1 && (
            <ol className="fa-order">
              {plan.order.map((o) => {
                const t = byId(o.id);
                if (!t) return null;
                return (
                  <li key={o.id}>
                    <span className="fa-when">{o.when || "—"}</span>
                    <span><b>{t.title}</b>{o.why && <small>{o.why}</small>}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {plan.tip && <p className="fa-tip">💬 {plan.tip}</p>}
          <div className="fa-plan-actions">
            <button className="fa-btn" onClick={() => go("chat", { prompt: `Vou começar por "${first.title}". Me ajuda a dar o primeiro passo?` })}>
              <MessageCircle size={15} /> me ajuda a começar
            </button>
            <button className="fa-ghost" onClick={() => setPlan(null)}>fechar</button>
          </div>
          {plan.local && <p className="fa-note">Calculado aqui no celular (sem IA): prazo, importância, tamanho, energia e horários livres.</p>}
        </section>
      )}

      <section style={{ marginTop: 18 }}>
        {open.length === 0 && (
          <div className="fa-emptybox">
            <b>Lista vazia ✨</b>
            <p>Anota o que tá na sua cabeça ali em cima. Eu separo em tarefas e te ajudo a escolher a primeira.</p>
          </div>
        )}
        <ul className="fa-tasks">
          {open.map((t) => (
            <li key={t.id} className={`fa-task ${plan?.first === t.id ? "first" : ""}`}>
              <button className="fa-check" aria-label="Marcar como feita" onClick={() => { app.toggleTask(t.id); app.celebrate(); setPlan(null); }} />
              <div className="fa-task-main">
                <span className="fa-task-title">{t.title}</span>
                <div className="fa-task-meta">
                  <button className="fa-tag" title="Tamanho (toca pra mudar)" onClick={() => app.updateTask(t.id, { size: cycle(SIZE_ORDER, t.size) })}>
                    {SIZES[t.size].emoji} {SIZES[t.size].label}
                  </button>
                  <button className={`fa-tag ${daysToDue(t.due) !== null && daysToDue(t.due) <= 0 ? "hot" : ""}`} title="Prazo (toca pra mudar)"
                    onClick={() => app.updateTask(t.id, { due: cycle(DUE_ORDER, DUE_ORDER.includes(t.due) ? t.due : "") })}>
                    📅 {dueLabel(t.due) || "sem prazo"}
                  </button>
                  <button className={`fa-tag ${t.important ? "star" : ""}`} aria-pressed={t.important} title="Importante"
                    onClick={() => app.updateTask(t.id, { important: !t.important })}>
                    <Star size={12} fill={t.important ? "currentColor" : "none"} /> {t.important ? "importante" : "normal"}
                  </button>
                </div>
              </div>
              <div className="fa-task-tools">
                <button className="fa-icon fa-icon-sm" aria-label="Quebrar em passos com a Faísca"
                  onClick={() => go("chat", { prompt: `Me ajuda a quebrar essa tarefa em passos pequenos: "${t.title}"` })}>
                  <MessageCircle size={14} />
                </button>
                <button className="fa-icon fa-icon-sm" aria-label="Apagar tarefa" onClick={() => { app.removeTask(t.id); setPlan(null); }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {done.length > 0 && (
          <>
            <button className="fa-donetoggle" onClick={() => setShowDone((v) => !v)}>
              <ChevronDown size={15} style={{ transform: showDone ? "rotate(180deg)" : "none" }} /> {done.length} {done.length === 1 ? "feita" : "feitas"}
            </button>
            {showDone && (
              <ul className="fa-tasks done">
                {done.slice(0, 30).map((t) => (
                  <li key={t.id} className="fa-task">
                    <button className="fa-check on" aria-label="Desmarcar" onClick={() => app.toggleTask(t.id)}>✓</button>
                    <div className="fa-task-main"><span className="fa-task-title">{t.title}</span></div>
                    <button className="fa-icon fa-icon-sm" aria-label="Apagar tarefa" onClick={() => app.removeTask(t.id)}><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}

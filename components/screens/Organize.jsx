"use client";

import { useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon } from "@/components/icons";
import { MicButton, OfflineBanner, Segmented } from "@/components/ui";
import Routine from "@/components/screens/Routine";
import { parseTasks, prioritize } from "@/lib/ai";
import { ENERGY, dueLabel, daysToDue } from "@/lib/routine";

const SIZE_ORDER = ["rapida", "media", "grande"];
const DUE_ORDER = ["", "hoje", "amanha", "semana"];
const SIZE_SHORT = { rapida: "15 min", media: "1 hora", grande: "2 horas ou mais" };

// Lista com mais de um item? (vírgula, quebra de linha, "e depois"…) → passa pela IA.
const looksLikeList = (t) => /\n|,|;| e depois | e também |\d[.)]\s/i.test(t) || t.length > 70;

export default function Organize() {
  const { route } = useApp();
  const [tab, setTab] = useState(route.params.tab || "tasks");
  return (
    <main className="fa-screen fa-wrap" style={{ paddingTop: 18 }}>
      <h1 className="fa-title">Organizar</h1>
      <div style={{ marginTop: 14 }}>
        <Segmented label="Seção" value={tab} onChange={setTab}
          options={[{ value: "tasks", label: "Tarefas" }, { value: "routine", label: "Rotina" }]} />
      </div>
      <OfflineBanner />
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
      <p className="fa-group-title">Sua energia agora</p>
      <Segmented label="Sua energia agora" value={energy} onChange={(v) => { setEnergy(v); setPlan(null); }}
        options={Object.entries(ENERGY).map(([k, v]) => ({ value: k, label: v.label.charAt(0).toUpperCase() + v.label.slice(1) }))} />

      <div className="fa-dump fa-glow" style={{ borderRadius: 18 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Suas tarefas"
          placeholder="Despeja tudo que você tem pra fazer. Ex.: estudar pra prova de quinta, lavar a louça e responder a Ju"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(hover: hover)").matches) { e.preventDefault(); add(); }
          }} />
        <div className="fa-dump-row">
          <MicButton disabled={adding} onText={(t) => setText((v) => (v ? `${v}, ${t}` : t))} />
          <button className="fa-btn fa-btn-ghost fa-press" style={{ minHeight: 36, padding: "0 16px", fontSize: 15 }} disabled={!text.trim() || adding} onClick={() => add()}>
            {adding ? <span className="fa-thinking">Separando…</span> : "Anotar"}
          </button>
        </div>
      </div>

      {open.length > 0 && (
        <div className={`fa-glow ${planning ? "live" : ""}`} style={{ borderRadius: 980, marginTop: 14 }}>
          <button className="fa-start fa-press" style={{ marginTop: 0 }} disabled={planning} onClick={whereToStart}>
            <Icon name="sparkle" size={22} /> {planning ? "Olhando sua rotina…" : "Por onde eu começo?"}
          </button>
        </div>
      )}

      {routine.blocks.length === 0 && open.length > 1 && (
        <button className="fa-hint" onClick={onRoutine}>Cadastre sua rotina e eu encaixo as tarefas nos seus horários livres.</button>
      )}

      {plan && first && (
        <section className="fa-plan" aria-live="polite">
          <small>Comece por</small>
          <h3><span className="fa-spark-text">{first.title}</span></h3>
          <p>{plan.why}</p>
          {plan.order.length > 1 && (
            <ol className="fa-timeline">
              {plan.order.map((o) => {
                const t = byId(o.id);
                if (!t) return null;
                return (
                  <li key={o.id}>
                    <time>{o.when || "—"}</time>
                    <span><span>{t.title}</span>{o.why && <small>{o.why}</small>}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {plan.tip && <p className="fa-tip">{plan.tip}</p>}
          <div className="fa-plan-actions">
            <button className="fa-btn fa-btn-light fa-press" onClick={() => go("chat", { prompt: `Vou começar por "${first.title}". Me ajuda a dar o primeiro passo?` })}>
              Me ajuda a começar
            </button>
            <button className="fa-link" onClick={() => setPlan(null)}>Fechar</button>
          </div>
          {plan.local && <p className="fa-caption">Calculado aqui no celular, sem IA: prazo, importância, tamanho, energia e horários livres.</p>}
        </section>
      )}

      <p className="fa-group-title">A fazer · {open.length}</p>
      {open.length === 0 ? (
        <div className="fa-emptycard">
          <b>Nada por aqui.</b>
          Anota o que tá na sua cabeça ali em cima. Eu separo em tarefas e te ajudo a escolher a primeira.
        </div>
      ) : (
        <ul className="fa-list">
          {open.map((t) => {
            const d = daysToDue(t.due);
            return (
              <li key={t.id} className={`fa-task ${plan?.first === t.id ? "first" : ""}`}>
                <button className="fa-circle" aria-label={`Concluir "${t.title}"`} onClick={() => { app.toggleTask(t.id); setPlan(null); }}>
                  <Icon name="check" size={15} />
                </button>
                <div className="fa-task-body">
                  <div className="fa-task-t">{t.title}</div>
                  <div className="fa-meta">
                    <button aria-label={`Tamanho: ${SIZE_SHORT[t.size]}. Toque pra mudar`} onClick={() => app.updateTask(t.id, { size: cycle(SIZE_ORDER, t.size) })}>
                      {SIZE_SHORT[t.size]}
                    </button>
                    <button className={d !== null && d <= 0 ? "hot" : ""} aria-label={`Prazo: ${dueLabel(t.due) || "sem prazo"}. Toque pra mudar`}
                      onClick={() => app.updateTask(t.id, { due: cycle(DUE_ORDER, DUE_ORDER.includes(t.due) ? t.due : "") })}>
                      {dueLabel(t.due) || "Sem prazo"}
                    </button>
                    <button className={t.important ? "star" : ""} aria-pressed={t.important} onClick={() => app.updateTask(t.id, { important: !t.important })}>
                      <Icon name="star" size={13} filled={t.important} /> {t.important ? "Importante" : "Normal"}
                    </button>
                  </div>
                </div>
                <div className="fa-task-tools">
                  <button className="fa-icon-btn" aria-label={`Quebrar "${t.title}" em passos`}
                    onClick={() => go("chat", { prompt: `Me ajuda a quebrar essa tarefa em passos pequenos: "${t.title}"` })}>
                    <Icon name="sparkle" size={18} />
                  </button>
                  <button className="fa-icon-btn" aria-label={`Apagar "${t.title}"`} onClick={() => { app.removeTask(t.id); setPlan(null); }}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <button className="fa-link small" style={{ marginTop: 12, marginLeft: 16 }} onClick={() => setShowDone((v) => !v)}>
            {showDone ? "Esconder concluídas" : `Mostrar concluídas (${done.length})`}
          </button>
          {showDone && (
            <ul className="fa-list fa-done" style={{ marginTop: 6 }}>
              {done.slice(0, 30).map((t) => (
                <li key={t.id} className="fa-task">
                  <button className="fa-circle on" aria-label={`Reabrir "${t.title}"`} onClick={() => app.toggleTask(t.id)}><Icon name="check" size={15} /></button>
                  <div className="fa-task-body"><div className="fa-task-t">{t.title}</div></div>
                  <button className="fa-icon-btn" aria-label={`Apagar "${t.title}"`} onClick={() => app.removeTask(t.id)}><Icon name="trash" size={18} /></button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div style={{ height: 24 }} />
    </>
  );
}

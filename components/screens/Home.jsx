"use client";

import { useMemo, useState } from "react";
import { Phone, ChevronRight, Trash2 } from "lucide-react";

import { useApp } from "@/components/AppContext";
import Brasa from "@/components/Brasa";
import { Composer, OfflineBanner } from "@/components/ui";
import { nowStatus, localPriority, toHHMM, formatDuration } from "@/lib/routine";
import { relativeDay } from "@/lib/dates";

const STARTERS = [
  { emoji: "💡", label: "Ter ideias", text: "Me ajuda a ter ideias pra " },
  { emoji: "🧭", label: "Por onde eu começo?", send: "Olhando minhas tarefas e minha rotina, por qual eu começo agora?" },
  { emoji: "🧱", label: "Tô travada", text: "Tô travada em " },
  { emoji: "🪜", label: "Quebrar em passos", text: "Me ajuda a dividir em passos: " },
];

function hello() {
  const h = new Date().getHours();
  return h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default function Home() {
  const { profile, setProfile, tasks, routine, energy, chats, removeChat, go } = useApp();
  const [text, setText] = useState("");
  const [name, setName] = useState("");

  const now = useMemo(() => nowStatus(routine), [routine]);
  const pick = useMemo(() => localPriority(tasks, routine, energy), [tasks, routine, energy]);
  const pickTask = pick && tasks.find((t) => t.id === pick.first);
  const open = tasks.filter((t) => !t.done).length;

  const nowLabel =
    now.kind === "busy" ? `Agora: ${now.block.label} até ${toHHMM(now.until)}`
      : now.kind === "early" ? "Ainda é cedo — seu dia começa daqui a pouco"
        : now.kind === "late" ? "Já passou da hora de descansar 🌙"
          : now.left > 0 ? `Livre agora · ${formatDuration(now.left)} até ${toHHMM(now.until)}` : "Dia livre pela frente";

  function start(t) {
    if (!t.trim()) return;
    go("chat", { prompt: t.trim() });
  }

  return (
    <main className="fa-screen fa-home fa-in">
      <OfflineBanner />

      <section className="fa-hero">
        <Brasa size={132} />
        <h1 className="fa-display">
          {hello()}{profile.name ? `, ${profile.name}` : ""}.
          <em>No que você tá pensando?</em>
        </h1>
        <p className="fa-sub">Eu não te dou a resposta pronta — te mostro o caminho pra você chegar lá.</p>
      </section>

      {!profile.name && (
        <div className="fa-card fa-namecard">
          <label className="fa-label" htmlFor="nm">Como posso te chamar?</label>
          <div className="fa-row-input">
            <input id="nm" className="fa-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
              onKeyDown={(e) => e.key === "Enter" && name.trim() && setProfile((p) => ({ ...p, name: name.trim() }))} />
            <button className="fa-btn" disabled={!name.trim()} onClick={() => setProfile((p) => ({ ...p, name: name.trim() }))}>Pronto</button>
          </div>
        </div>
      )}

      <Composer value={text} onChange={setText} onSend={start} placeholder="Ex.: o que eu posso fazer pro aniversário da minha mãe?" />

      <div className="fa-starters">
        {STARTERS.map((s) => (
          <button key={s.label} className="fa-chip" onClick={() => (s.send ? start(s.send) : setText(s.text))}>
            <span>{s.emoji}</span> {s.label}
          </button>
        ))}
      </div>

      <button className="fa-callcta" onClick={() => go("call")}>
        <span className="fa-callcta-icon"><Phone size={18} /></span>
        <span><b>Ligar pra Faísca</b><small>conversa por voz, sem digitar</small></span>
        <ChevronRight size={18} />
      </button>

      <button className="fa-now" onClick={() => go("organize")}>
        <div className="fa-now-head">
          <span className={`fa-dot ${now.kind === "busy" ? "busy" : ""}`} />
          {nowLabel}
        </div>
        {pickTask ? (
          <div className="fa-now-body">
            <small>sugestão pra agora</small>
            <b>{pickTask.title}</b>
            <span>{open} {open === 1 ? "tarefa aberta" : "tarefas abertas"} · toca pra organizar</span>
          </div>
        ) : (
          <div className="fa-now-body">
            <b>Nada na lista ainda</b>
            <span>Despeja suas tarefas e eu te ajudo a decidir por onde começar →</span>
          </div>
        )}
      </button>

      {chats.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 className="fa-h2">Conversas</h2>
          <div className="fa-list">
            {chats.slice(0, 6).map((c) => (
              <div key={c.id} className="fa-listrow">
                <button className="fa-listmain" onClick={() => go("chat", { id: c.id })}>
                  <b>{c.title}</b>
                  <small>{relativeDay(c.at)} · {c.messages.length} mensagens</small>
                </button>
                <button className="fa-icon fa-icon-sm" aria-label="Apagar conversa" onClick={() => removeChat(c.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

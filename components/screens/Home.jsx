"use client";

import { useMemo, useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon } from "@/components/icons";
import { MicButton, OfflineBanner } from "@/components/ui";
import { nowStatus, localPriority, toHHMM, formatDuration, nowMin } from "@/lib/routine";
import { relativeDay } from "@/lib/dates";
import { unlockAudio } from "@/lib/speech";

// Atalhos: os de "text" completam o campo; os de "send" já perguntam.
const STARTERS = [
  { label: "Me ajuda a ter ideias pra…", text: "Me ajuda a ter ideias pra " },
  { label: "Por onde eu começo hoje?", send: "Olhando minhas tarefas e minha rotina, por qual eu começo agora?" },
  { label: "Tô travada em…", text: "Tô travada em " },
  { label: "Quebra isso em passos:", text: "Me ajuda a dividir em passos: " },
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

  // número grande + legenda do "agora"
  const big = now.kind === "busy" ? toHHMM(now.until) : now.kind === "free" && now.left > 0 ? formatDuration(now.left) : toHHMM(nowMin());
  const caption =
    now.kind === "busy" ? `${now.block.label} até ${toHHMM(now.until)}`
      : now.kind === "early" ? "seu dia ainda não começou"
        : now.kind === "late" ? "hora de descansar"
          : now.left > 0 ? `livre até ${toHHMM(now.until)}` : "dia livre";

  function start(t) {
    if (!t.trim()) return;
    unlockAudio();
    go("chat", { prompt: t.trim() });
  }
  const saveName = () => name.trim() && setProfile((p) => ({ ...p, name: name.trim() }));

  return (
    <main className="fa-screen">
      <OfflineBanner />

      <section className="fa-hero">
        <span className="fa-kicker">{hello()}{profile.name ? `, ${profile.name}` : ""}</span>
        <h1 className="fa-display">No que você tá <i>pensando</i>?</h1>
        <p className="fa-lead">Eu não te dou a resposta pronta. Te mostro o caminho — quem chega lá é você.</p>
      </section>

      <div className="fa-ask-box">
        <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Sua pergunta"
          placeholder="Ex.: o que eu posso fazer pro aniversário da minha mãe?"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(hover: hover)").matches) { e.preventDefault(); start(text); }
          }} />
        <div className="fa-ask-row">
          <MicButton onText={(t) => setText((v) => (v ? `${v} ${t}` : t))} />
          <button className="fa-btn" disabled={!text.trim()} onClick={() => start(text)}>
            Mostrar o caminho <Icon name="right" size={18} />
          </button>
        </div>
      </div>

      <h2 className="fa-h2"><span>Comece por aqui</span></h2>
      <ul className="fa-rows">
        {STARTERS.map((s, i) => (
          <li key={s.label}>
            <button className="fa-rowbtn" style={{ borderBottom: "none" }} onClick={() => (s.send ? start(s.send) : setText(s.text))}>
              <span className="fa-num">{String(i + 1).padStart(2, "0")}</span>
              <span>{s.label}</span>
              <Icon name="right" size={16} className="fa-arrow" />
            </button>
          </li>
        ))}
      </ul>

      {!profile.name && (
        <div className="fa-namebox">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como posso te chamar?" aria-label="Seu nome"
            onKeyDown={(e) => e.key === "Enter" && saveName()} />
          <button className="fa-btn" disabled={!name.trim()} onClick={saveName}>Salvar</button>
        </div>
      )}

      <button className="fa-call-block" onClick={() => { unlockAudio(); go("call"); }}>
        <span className="fa-callicon"><Icon name="phone" size={24} /></span>
        <span><b>Ligar pra Faísca</b><small>fala que ela escuta e responde</small></span>
      </button>

      <h2 className="fa-h2"><span>Agora</span><span style={{ color: "var(--muted)" }}>{open} {open === 1 ? "tarefa" : "tarefas"}</span></h2>
      <button className="fa-now" onClick={() => go("organize")}>
        <span className={`fa-now-big ${now.kind === "busy" ? "busy" : ""}`}>{big}</span>
        <span className="fa-mono">{caption}</span>
        <b>{pickTask ? <>Sugestão: {pickTask.title}</> : "Despeja suas tarefas e eu te digo por onde começar →"}</b>
      </button>

      {chats.length > 0 && (
        <>
          <h2 className="fa-h2"><span>Conversas</span></h2>
          <ul className="fa-rows">
            {chats.slice(0, 6).map((c) => (
              <li key={c.id} className="fa-histrow">
                <button className="fa-rowbtn" onClick={() => go("chat", { id: c.id })}>
                  <span>{c.title}</span>
                  <span className="fa-mono" style={{ color: "var(--muted)" }}>{relativeDay(c.at)} · {c.messages.length} msgs</span>
                </button>
                <button className="fa-text" aria-label={`Apagar conversa ${c.title}`} onClick={() => removeChat(c.id)}><Icon name="x" size={14} /></button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

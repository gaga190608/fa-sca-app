"use client";

import { Fragment, useMemo, useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon } from "@/components/icons";
import FaiscaIcon from "@/components/FaiscaIcon";
import { MicButton, OfflineBanner } from "@/components/ui";
import { nowStatus, localPriority, toHHMM, formatDuration, nowMin } from "@/lib/routine";
import { relativeDay } from "@/lib/dates";
import { unlockAudio } from "@/lib/speech";

// Atalhos: os de "text" completam o campo; os de "send" já perguntam.
const STARTERS = [
  { label: "Ter ideias pra…", text: "Me ajuda a ter ideias pra " },
  { label: "Por onde eu começo?", send: "Olhando minhas tarefas e minha rotina, por qual eu começo agora?" },
  { label: "Tô travada em…", text: "Tô travada em " },
  { label: "Quebrar em passos", text: "Me ajuda a dividir em passos: " },
];

function hello() {
  const h = new Date().getHours();
  return h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

// Título que entra palavra por palavra (o atraso vai em cada palavra).
function Words({ text, from = 0, className }) {
  // o espaço fica FORA do span: espaço no fim de inline-block some
  return text.split(" ").map((w, i) => (
    <Fragment key={i}><span className={className} style={{ animationDelay: `${from + i * 70}ms` }}>{w}</span>{" "}</Fragment>
  ));
}

export default function Home() {
  const { profile, setProfile, tasks, routine, energy, chats, removeChat, go } = useApp();
  const [text, setText] = useState("");
  const [name, setName] = useState("");

  const now = useMemo(() => nowStatus(routine), [routine]);
  const pick = useMemo(() => localPriority(tasks, routine, energy), [tasks, routine, energy]);
  const pickTask = pick && tasks.find((t) => t.id === pick.first);
  const open = tasks.filter((t) => !t.done).length;

  const free = now.kind === "free" && now.left > 0;
  const big = now.kind === "busy" ? toHHMM(now.until) : free ? formatDuration(now.left) : toHHMM(nowMin());
  const bigLabel = now.kind === "busy" ? "Ocupada até" : free ? "Livre agora" : "Agora";
  const bigNote =
    now.kind === "busy" ? now.block.label
      : now.kind === "early" ? "Seu dia ainda não começou."
        : now.kind === "late" ? "Hora de descansar."
          : free ? `até ${toHHMM(now.until)}` : "Dia livre pela frente.";

  function start(t) {
    if (!t.trim()) return;
    unlockAudio();
    go("chat", { prompt: t.trim() });
  }
  const saveName = () => name.trim() && setProfile((p) => ({ ...p, name: name.trim() }));

  return (
    <main className="fa-screen">
      <section className="fa-hero">
        <div className="fa-mesh" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="fa-hero-inner">
          <FaiscaIcon size={92} ignite label="Faísca" className="fa-hero-icon" />
          <div className="fa-eyebrow fa-word-in"><span style={{ animationDelay: "250ms" }}>{hello()}{profile.name ? `, ${profile.name}` : ""}.</span></div>
          <h1 className="fa-hero-title fa-word-in" style={{ marginTop: 10 }}>
            <Words text="No que você tá" from={330} />
            <span className="fa-spark-text" style={{ animationDelay: "610ms" }}>pensando?</span>
          </h1>
          <p className="fa-sub fa-word-in"><span style={{ animationDelay: "730ms" }}>Eu não te dou a resposta pronta. Te mostro o caminho — quem chega lá é você.</span></p>

          <OfflineBanner />

          <div className="fa-ask fa-glow">
            <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Sua pergunta"
              placeholder="Ex.: o que eu posso fazer pro aniversário da minha mãe?"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(hover: hover)").matches) { e.preventDefault(); start(text); }
              }} />
            <div className="fa-ask-row">
              <MicButton onText={(t) => setText((v) => (v ? `${v} ${t}` : t))} />
              <button className="fa-btn fa-press" disabled={!text.trim()} onClick={() => start(text)}>
                Mostrar o caminho
              </button>
            </div>
          </div>

          <div className="fa-chips" role="list" aria-label="Atalhos">
            {STARTERS.map((s) => (
              <button key={s.label} role="listitem" className="fa-chip fa-press" onClick={() => (s.send ? start(s.send) : setText(s.text))}>{s.label}</button>
            ))}
          </div>
        </div>
      </section>

      <div className="fa-wrap" style={{ paddingTop: 36 }}>
        {!profile.name && (
          <div className="fa-reveal" style={{ marginBottom: 28 }}>
            <p className="fa-group-title" style={{ marginTop: 0 }}>Como posso te chamar?</p>
            <div className="fa-list"><div className="fa-row">
              <input className="fa-inline-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" aria-label="Seu nome"
                onKeyDown={(e) => e.key === "Enter" && saveName()} />
              <button className="fa-link" disabled={!name.trim()} onClick={saveName}>Salvar</button>
            </div></div>
          </div>
        )}

        <h2 className="fa-section fa-reveal">Agora. <span>Seu dia num relance.</span></h2>
        <div className="fa-bento">
          <button className="fa-tile fa-reveal fa-press" onClick={() => go("organize", { tab: "routine" })}>
            <small>{bigLabel}</small>
            <span className="fa-big">{big}</span>
            <span className="fa-caption" style={{ marginTop: 0 }}>{bigNote}</span>
          </button>
          <button className="fa-tile fa-reveal fa-press" onClick={() => go("organize")}>
            <small>{pickTask ? "Comece por" : `${open} ${open === 1 ? "tarefa" : "tarefas"}`}</small>
            <b>{pickTask ? pickTask.title : "Despeja suas tarefas."}</b>
            <span className="fa-more">Organizar <Icon name="chevron" size={15} /></span>
          </button>
          <button className="fa-tile night wide fa-reveal fa-press" onClick={() => { unlockAudio(); go("call"); }}>
            <FaiscaIcon size={150} className="fa-tile-icon" />
            <small>Por voz</small>
            <b style={{ fontSize: 28 }}>Fala que ela escuta.</b>
            <span className="fa-more">Ligar pra Faísca <Icon name="chevron" size={15} /></span>
          </button>
        </div>

        {chats.length > 0 && (
          <section className="fa-reveal">
            <p className="fa-group-title">Conversas</p>
            <ul className="fa-list">
              {chats.slice(0, 6).map((c) => (
                <li key={c.id} className="fa-row" style={{ padding: 0 }}>
                  <button className="fa-row fa-row-btn" onClick={() => go("chat", { id: c.id })}>
                    <span className="fa-row-main"><b>{c.title}</b><small>{relativeDay(c.at)} · {c.messages.length} mensagens</small></span>
                    <Icon name="chevron" size={16} className="fa-row-chev" />
                  </button>
                  <button className="fa-icon-btn" style={{ marginRight: 8 }} aria-label={`Apagar conversa ${c.title}`} onClick={() => removeChat(c.id)}>
                    <Icon name="trash" size={17} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

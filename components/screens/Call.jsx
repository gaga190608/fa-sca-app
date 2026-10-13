"use client";

// ════════════════════════════════════════════════════════════════════
//  LIGAÇÃO COM A FAÍSCA (mesmo motor de voz do QuestHero)
//  Ciclo: ouvir (para sozinho no silêncio) → transcrever → pensar →
//  falar → ouvir de novo… sem apertar nada.
// ════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon, Mark } from "@/components/icons";
import { buildCallSystem, callFaisca, toHistory, OfflineError } from "@/lib/ai";
import {
  speak, stopSpeaking, prefetchVoice, unlockAudio, recordUtterance, transcribe,
  cloudSttEnabled, canDictate, dictateUtterance, stopDictation,
} from "@/lib/speech";

const STATUS = {
  connecting: "Ligando…",
  listening: "Tô ouvindo.",
  hearing: "Ouvindo…",
  transcribing: "Entendendo…",
  thinking: "Pensando no caminho…",
  speaking: "Falando.",
  paused: "Microfone pausado.",
};

const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function Call() {
  const app = useApp();
  const { profile, tasks, routine, energy, route, go } = app;
  const fromChat = Array.isArray(route.params.history) ? route.params.history : [];

  const [phase, setPhase] = useState("intro"); // intro | live | ended
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("connecting");
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState(0);
  const [lines, setLines] = useState([]); // [{ who: "fa"|"eu", text }]
  const [startedAt, setStartedAt] = useState(0);
  const [endedAt, setEndedAt] = useState(0);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");

  const liveRef = useRef(false);
  const pausedRef = useRef(false);
  const abortRef = useRef(null);
  const ctxRef = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => () => hangUp(true), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const pushLine = (who, text) => setLines((l) => [...l, { who, text }].slice(-40));

  async function say(text) {
    setStatus("speaking");
    await speak(text);
  }

  async function listenOnce() {
    if (cloudSttEnabled() && ctxRef.current) {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const blob = await recordUtterance(ctxRef.current, { signal: ctrl.signal, onLevel: setLevel, onSpeech: () => setStatus("hearing") });
      setLevel(0);
      if (!blob || !liveRef.current) return "";
      setStatus("transcribing");
      try {
        return (await transcribe(blob)).trim();
      } catch {
        if (!canDictate()) throw new Error("stt");
        return "";
      }
    }
    if (canDictate()) return (await dictateUtterance()).trim();
    throw new Error("sem microfone");
  }

  async function loop(system) {
    let silent = 0;
    while (liveRef.current) {
      if (pausedRef.current) {
        setStatus("paused");
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      setStatus("listening");
      let text = "";
      try {
        text = await listenOnce();
      } catch {
        setError("Não consegui usar o microfone. Confere a permissão do navegador.");
        break;
      }
      if (!liveRef.current) break;
      if (pausedRef.current) continue;
      if (!text) {
        silent++;
        if (silent === 2) { const n = "Ainda tá aí? Pode falar quando quiser."; pushLine("fa", n); await say(n); }
        else if (silent >= 4) { pausedRef.current = true; setPaused(true); }
        continue;
      }
      silent = 0;
      pushLine("eu", text);
      historyRef.current = [...historyRef.current, { role: "user", content: text }];
      setStatus("thinking");
      let reply;
      try {
        reply = (await callFaisca(historyRef.current, system)).trim();
        app.markOnline();
      } catch (e) {
        if (e instanceof OfflineError) app.markOffline(e.kind);
        reply = e instanceof OfflineError && e.kind === "no_key"
          ? "A minha inteligência ainda não foi ligada no servidor. Mas a aba Organizar funciona sem mim!"
          : "Opa, minha conexão falhou um pouquinho. Pode repetir?";
      }
      if (!liveRef.current) break;
      historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];
      prefetchVoice(reply);
      pushLine("fa", reply);
      await say(reply);
    }
  }

  async function startCall() {
    unlockAudio(); // precisa ser dentro do toque (iPhone)
    const AC = window.AudioContext || window.webkitAudioContext;
    ctxRef.current = AC ? new AC() : null;
    await ctxRef.current?.resume?.();
    if (!ctxRef.current && !canDictate()) {
      setError("Seu navegador não deixa usar o microfone aqui 😕");
      return;
    }
    const tt = topic.trim();
    setLines([]); setError(""); setPaused(false);
    pausedRef.current = false;
    liveRef.current = true;
    setStartedAt(Date.now());
    setPhase("live");
    setStatus("connecting");

    const hi = profile.name ? `Oi, ${profile.name}!` : "Oi!";
    const greet = fromChat.length
      ? `${hi} Bora continuar a nossa conversa por voz. Onde a gente parou?`
      : tt
        ? `${hi} Bora pensar juntas sobre ${tt}. Me conta: o que você já pensou até agora?`
        : `${hi} Tô aqui. Quer ter ideias pra alguma coisa ou organizar o seu dia?`;
    historyRef.current = [...toHistory(fromChat).slice(-12), { role: "assistant", content: greet }];
    pushLine("fa", greet);
    const system = buildCallSystem({ name: profile.name, tasks, routine, energy });
    await say(greet);
    if (liveRef.current) loop(system);
  }

  function hangUp(silent = false) {
    const was = liveRef.current;
    liveRef.current = false;
    abortRef.current?.abort();
    stopDictation();
    stopSpeaking();
    ctxRef.current?.close?.().catch(() => {});
    ctxRef.current = null;
    if (!silent && was) { setEndedAt(Date.now()); setPhase("ended"); }
  }

  function togglePause() {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (next) { abortRef.current?.abort(); stopDictation(); }
  }

  // Leva a ligação pro chat escrito (com o que foi dito).
  function toChat() {
    const messages = lines.map((l) => (l.who === "eu" ? { role: "user", content: l.text } : { role: "assistant", content: l.text, steps: [], ask: "" }));
    const id = app.saveChat(null, messages);
    go("chat", { id });
  }

  if (phase === "intro") {
    return (
      <main className="fa-call">
        <div className="fa-call-top">
          <button className="fa-text" style={{ color: "inherit" }} onClick={() => go("home")}><Icon name="left" size={14} /> voltar</button>
          <span className="fa-word"><Mark size={16} /> Faísca</span>
        </div>
        <div className="fa-call-main">
          <span className="fa-kicker">Ligação</span>
          <h1 className="fa-display" style={{ marginTop: 10 }}>Fala que eu <i>escuto</i>.</h1>
          <p className="fa-lead">Você fala, faz uma pausa, e a Faísca responde em voz alta — sempre te devolvendo uma pergunta.</p>
          {!fromChat.length && (
            <input className="fa-call-field" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Assunto"
              placeholder="Sobre o quê? (opcional)" onKeyDown={(e) => e.key === "Enter" && startCall()} />
          )}
          {error && <div className="fa-error">{error}</div>}
          <button className="fa-go" onClick={startCall}>Ligar agora <Icon name="phone" size={26} /></button>
          <p className="fa-note" style={{ color: "inherit", opacity: 0.6 }}>O navegador vai pedir permissão pro microfone.</p>
        </div>
      </main>
    );
  }

  if (phase === "ended") {
    return (
      <main className="fa-call">
        <div className="fa-call-top">
          <span className="fa-mono">Encerrada · {clock(endedAt - startedAt)}</span>
          <span className="fa-word"><Mark size={16} /> Faísca</span>
        </div>
        <h1 className="fa-display" style={{ marginTop: 24 }}>Boa <i>conversa</i>.</h1>
        <div className="fa-transcript">
          {lines.map((l, i) => <p key={i} className={l.who === "eu" ? "me" : ""}><b>{l.who === "eu" ? "Você" : "Faísca"}:</b> {l.text}</p>)}
        </div>
        <div className="fa-plan-actions">
          <button className="fa-btn" onClick={startCall}>Ligar de novo</button>
          {lines.length > 1 && <button className="fa-line" onClick={toChat}>Continuar escrevendo</button>}
          <button className="fa-text" style={{ color: "inherit" }} onClick={() => go("home")}>início</button>
        </div>
      </main>
    );
  }

  const listening = !paused && (status === "listening" || status === "hearing");
  const speaking = !paused && status === "speaking";
  const lastFa = [...lines].reverse().find((l) => l.who === "fa");
  const lastMe = [...lines].reverse().find((l) => l.who === "eu");

  return (
    <main className="fa-call">
      <div className="fa-call-top">
        <span className="fa-mono" data-tick={tick}>{clock(Date.now() - startedAt)}</span>
        <span className="fa-word"><Mark size={16} /> Faísca</span>
      </div>
      <div className="fa-call-main">
        <h1 className="fa-display" aria-live="polite">{paused ? STATUS.paused : STATUS[status]}</h1>
        <Meter level={listening ? level : 0} mode={listening ? "on" : speaking ? "speak" : ""} />
      </div>
      <div className="fa-captions">
        {lastMe && <p className="me">{lastMe.text}</p>}
        {lastFa && <p>{lastFa.text}</p>}
      </div>
      {error && <div className="fa-error">{error}</div>}
      <div className="fa-callbar">
        <button className={paused ? "off" : ""} aria-label={paused ? "Ligar microfone" : "Pausar microfone"} onClick={togglePause}>
          <Icon name={paused ? "mic" : "pause"} size={18} /> {paused ? "voltar" : "pausar"}
        </button>
        <button className="end" aria-label="Desligar" onClick={() => hangUp()}><Icon name="hang" size={22} /> desligar</button>
        <button aria-label="Pular a fala" disabled={!speaking} onClick={stopSpeaking}><Icon name="skip" size={18} /> pular</button>
      </div>
    </main>
  );
}

// Medidor de voz: ouvindo = barras seguem o volume; falando = barras pulsam.
const SHAPE = Array.from({ length: 28 }, (_, i) => 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)));
function Meter({ level, mode }) {
  return (
    <div className={`fa-meter ${mode}`} aria-hidden="true">
      {SHAPE.map((k, i) => (
        <i key={i}
          style={{ height: mode === "on" ? `${8 + level * 88 * k}%` : mode === "speak" ? `${30 + 60 * k}%` : "6%", animationDelay: `${(i % 7) * 0.09}s` }} />
      ))}
    </div>
  );
}

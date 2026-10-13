"use client";

// ════════════════════════════════════════════════════════════════════
//  LIGAÇÃO COM A FAÍSCA (mesmo motor de voz do QuestHero)
//  Ciclo: ouvir (para sozinho no silêncio) → transcrever → pensar →
//  falar → ouvir de novo… sem apertar nada.
// ════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, SkipForward, ArrowLeft } from "lucide-react";

import { useApp } from "@/components/AppContext";
import Brasa from "@/components/Brasa";
import { buildCallSystem, callFaisca, toHistory, OfflineError } from "@/lib/ai";
import {
  speak, stopSpeaking, prefetchVoice, unlockAudio, recordUtterance, transcribe,
  cloudSttEnabled, canDictate, dictateUtterance, stopDictation,
} from "@/lib/speech";

const STATUS = {
  connecting: "ligando…",
  listening: "pode falar, tô ouvindo",
  hearing: "ouvindo…",
  transcribing: "entendendo…",
  thinking: "pensando no caminho…",
  speaking: "falando",
  paused: "microfone pausado",
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
    if (!silent && was) setPhase("ended");
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
      <main className="fa-call fa-in">
        <button className="fa-icon fa-call-back" aria-label="Voltar" onClick={() => go("home")}><ArrowLeft size={18} /></button>
        <div className="fa-call-center">
          <Brasa size={190} />
          <h1 className="fa-display fa-call-title">Ligar pra Faísca</h1>
          <p className="fa-sub">Você fala, ela escuta, responde em voz alta e te devolve uma pergunta. Faz uma pausa quando terminar de falar.</p>
        </div>
        {!fromChat.length && (
          <input className="fa-field fa-call-field" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Sobre o quê? (opcional)" onKeyDown={(e) => e.key === "Enter" && startCall()} />
        )}
        {error && <div className="fa-error">{error}</div>}
        <button className="fa-callbtn go" aria-label="Ligar" onClick={startCall}><Phone size={28} fill="currentColor" /></button>
        <p className="fa-note" style={{ textAlign: "center" }}>O navegador vai pedir permissão pro microfone.</p>
      </main>
    );
  }

  if (phase === "ended") {
    return (
      <main className="fa-call fa-in">
        <div className="fa-call-center">
          <Brasa size={120} />
          <h1 className="fa-display fa-call-title">Ligação encerrada</h1>
        </div>
        <div className="fa-transcript">
          {lines.map((l, i) => <p key={i} className={l.who === "eu" ? "me" : ""}><b>{l.who === "eu" ? "Você" : "Faísca"}:</b> {l.text}</p>)}
        </div>
        <div className="fa-plan-actions" style={{ justifyContent: "center" }}>
          <button className="fa-ghost" onClick={() => go("home")}>início</button>
          {lines.length > 1 && <button className="fa-ghost" onClick={toChat}>continuar escrevendo</button>}
          <button className="fa-btn" onClick={startCall}>ligar de novo</button>
        </div>
      </main>
    );
  }

  const listening = !paused && (status === "listening" || status === "hearing");
  const orbState = paused ? "idle" : status === "speaking" ? "speaking" : listening ? "listening" : "thinking";
  const lastFa = [...lines].reverse().find((l) => l.who === "fa");
  const lastMe = [...lines].reverse().find((l) => l.who === "eu");

  return (
    <main className="fa-call">
      <div className="fa-call-top">
        <div><b>Faísca</b><small data-tick={tick}>{clock(Date.now() - startedAt)}</small></div>
        <span className={`fa-callstatus ${listening ? "on" : ""}`}>{paused ? STATUS.paused : STATUS[status]}</span>
      </div>
      <div className="fa-call-center grow"><Brasa size={230} state={orbState} level={level} /></div>
      <div className="fa-captions">
        {lastMe && <p className="me">{lastMe.text}</p>}
        {lastFa && <p>{lastFa.text}</p>}
      </div>
      {error && <div className="fa-error">{error}</div>}
      <div className="fa-callcontrols">
        <button className={`fa-callbtn ${paused ? "off" : ""}`} aria-label={paused ? "Ligar microfone" : "Pausar microfone"} onClick={togglePause}>
          {paused ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <button className="fa-callbtn end" aria-label="Desligar" onClick={() => hangUp()}><PhoneOff size={28} /></button>
        <button className="fa-callbtn" aria-label="Pular a fala" disabled={status !== "speaking"} onClick={stopSpeaking}><SkipForward size={24} /></button>
      </div>
    </main>
  );
}

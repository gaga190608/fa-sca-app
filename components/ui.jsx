"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square, Loader2, Volume2, WifiOff, Settings, Check, ListPlus } from "lucide-react";

import { useApp } from "@/components/AppContext";
import Brasa from "@/components/Brasa";
import { useVoiceInput, speak, stopSpeaking, canSpeak, unlockAudio } from "@/lib/speech";

/* ------------------------------ topo ------------------------------ */

export function TopBar() {
  const { route, go } = useApp();
  const tab = route.tab === "organize" ? "organize" : route.tab === "settings" ? "" : "home";
  return (
    <header className="fa-top">
      <button className="fa-logo" onClick={() => go("home")} aria-label="Início">
        <Brasa size={26} />
        <span>faísca</span>
      </button>
      <div className="fa-switch" role="tablist">
        <button role="tab" aria-selected={tab === "home"} className={tab === "home" ? "on" : ""} onClick={() => go("home")}>Conversar</button>
        <button role="tab" aria-selected={tab === "organize"} className={tab === "organize" ? "on" : ""} onClick={() => go("organize")}>Organizar</button>
      </div>
      <button className="fa-icon" aria-label="Ajustes" onClick={() => go("settings")}><Settings size={18} /></button>
    </header>
  );
}

export const OFFLINE_MSG = {
  no_key: "A IA ainda não foi configurada — por enquanto, roteiros prontos e a organização offline.",
  rate_limit: "Muitas mensagens seguidas — espera um minutinho.",
  auth: "A chave da IA foi recusada — confira a GROQ_API_KEY na Vercel.",
  api_error: "A IA respondeu com erro — tenta de novo daqui a pouco.",
  network: "Sem conexão com a IA agora.",
};

export function OfflineBanner() {
  const { offline } = useApp();
  if (!offline) return null;
  return <div className="fa-offline"><WifiOff size={13} /> {OFFLINE_MSG[offline] || OFFLINE_MSG.network}</div>;
}

/* ------------------------------ voz ------------------------------ */

export function SpeakButton({ text }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => on && stopSpeaking(), [on]);
  if (!canSpeak()) return null;
  return (
    <button className="fa-mini" aria-label={on ? "Parar leitura" : "Ouvir"}
      onClick={() => {
        if (on) { stopSpeaking(); setOn(false); }
        else { unlockAudio(); setOn(true); speak(text, () => setOn(false)); }
      }}>
      {on ? <Square size={11} /> : <Volume2 size={13} />} {on ? "parar" : "ouvir"}
    </button>
  );
}

// Toca → grava. Toca de novo → transcreve (ElevenLabs; plano B: ditado do navegador).
export function MicButton({ onText, disabled, big }) {
  const { toast } = useApp();
  const { state, start, stop, supported } = useVoiceInput(onText, () => toast("Não consegui ouvir direito 😕 tenta de novo?"));
  if (!supported) return null;
  const label = state === "recording" ? "Parar e transcrever" : state === "transcribing" ? "Transcrevendo" : "Falar";
  return (
    <button className={`fa-mic ${big ? "fa-mic-big" : ""} ${state === "recording" ? "rec" : ""}`}
      disabled={disabled || state === "transcribing"} aria-label={label} title={label}
      onClick={state === "recording" ? stop : start}>
      {state === "recording" ? <Square size={big ? 18 : 14} fill="currentColor" />
        : state === "transcribing" ? <Loader2 size={big ? 20 : 16} className="fa-spin" />
          : <Mic size={big ? 22 : 17} />}
    </button>
  );
}

/* ------------------------------ escrever ------------------------------ */

// Campo que cresce + microfone + enviar. Enter envia no computador; no celular, o botão.
export function Composer({ value, onChange, onSend, disabled, placeholder = "Escreve ou fala…", autoFocus }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [value]);
  const send = () => { unlockAudio(); onSend(value); };
  return (
    <div className="fa-composer">
      <textarea ref={ref} rows={1} value={value} placeholder={placeholder} aria-label="Mensagem" autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(hover: hover)").matches) {
            e.preventDefault();
            if (!disabled && value.trim()) send();
          }
        }} />
      <MicButton disabled={disabled} onText={(t) => onChange(value ? `${value} ${t}` : t)} />
      <button className="fa-send" aria-label="Enviar" disabled={disabled || !value.trim()} onClick={send}>
        <ArrowUp size={18} strokeWidth={2.6} />
      </button>
    </div>
  );
}

/* ------------------------------ o caminho ------------------------------ */

// Passos que a Faísca sugeriu: dá pra ir marcando e mandar pra lista de tarefas.
export function PathSteps({ steps, checked = [], onToggle, onToTasks }) {
  if (!steps?.length) return null;
  return (
    <div className="fa-path">
      <div className="fa-path-label">o caminho</div>
      <ol>
        {steps.map((s, i) => {
          const on = checked.includes(i);
          return (
            <li key={i} className={on ? "on" : ""}>
              <button className="fa-path-node" aria-label={on ? `Desmarcar passo ${i + 1}` : `Marcar passo ${i + 1} como feito`}
                onClick={() => onToggle?.(i)} disabled={!onToggle}>
                {on ? <Check size={12} strokeWidth={3} /> : i + 1}
              </button>
              <span>{s}</span>
            </li>
          );
        })}
      </ol>
      {onToTasks && (
        <button className="fa-ghost" onClick={onToTasks}><ListPlus size={14} /> virar tarefas</button>
      )}
    </div>
  );
}

/* ------------------------------ avisos ------------------------------ */

export function Toasts() {
  const { toasts, sparkle } = useApp();
  return (
    <>
      {sparkle > 0 && <Sparks key={sparkle} />}
      <div className="fa-toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="fa-toast">{t.text}</div>)}
      </div>
    </>
  );
}

// Faíscas subindo do pé da tela (tarefa feita, plano pronto…)
function Sparks() {
  const [pieces] = useState(() =>
    Array.from({ length: 28 }, () => ({
      left: 10 + Math.random() * 80,
      delay: Math.random() * 0.4,
      dur: 1.1 + Math.random() * 0.9,
      drift: (Math.random() - 0.5) * 120,
      size: 3 + Math.random() * 5,
    }))
  );
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 2400);
    return () => clearTimeout(t);
  }, []);
  if (!on) return null;
  return (
    <div className="fa-sparks" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, "--dx": `${p.drift}px` }} />
      ))}
    </div>
  );
}

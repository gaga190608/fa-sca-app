"use client";

import { useEffect, useRef, useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon, Mark } from "@/components/icons";
import { useVoiceInput, speak, stopSpeaking, canSpeak, unlockAudio } from "@/lib/speech";

const WEEKDAY = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
export function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${WEEKDAY[d.getDay()]} ${p(d.getDate())}.${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ------------------------------ topo ------------------------------ */

export function TopBar() {
  const { route, go } = useApp();
  const tab = route.tab;
  return (
    <header className="fa-top">
      <div className="fa-bar">
        <div className="fa-bar-in">
          <button className="fa-word" onClick={() => go("home")} aria-label="Início"><Mark size={18} /> Faísca</button>
          <span className="fa-mono">{stamp()}</span>
        </div>
      </div>
      <nav className="fa-tabs">
        <button className={tab === "home" ? "on" : ""} aria-current={tab === "home" ? "page" : undefined} onClick={() => go("home")}>Conversar</button>
        <button className={tab === "organize" ? "on" : ""} aria-current={tab === "organize" ? "page" : undefined} onClick={() => go("organize")}>Organizar</button>
        <button className={tab === "settings" ? "on" : ""} aria-current={tab === "settings" ? "page" : undefined} onClick={() => go("settings")}>Ajustes</button>
      </nav>
    </header>
  );
}

export const OFFLINE_MSG = {
  no_key: "A IA ainda não foi ligada. Enquanto isso: caminhos prontos na conversa e a organização calculada aqui no celular.",
  rate_limit: "Muitas mensagens seguidas. Espera um minutinho.",
  auth: "A chave da IA foi recusada. Confira a GROQ_API_KEY na Vercel.",
  api_error: "A IA respondeu com erro. Tenta de novo daqui a pouco.",
  network: "Sem conexão com a IA agora.",
};

export function OfflineBanner() {
  const { offline } = useApp();
  if (!offline) return null;
  return <div className="fa-offline"><b>MODO SEM IA</b>{OFFLINE_MSG[offline] || OFFLINE_MSG.network}</div>;
}

/* ------------------------------ voz ------------------------------ */

export function SpeakButton({ text }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => on && stopSpeaking(), [on]);
  if (!canSpeak()) return null;
  return (
    <button className="fa-text" onClick={() => {
      if (on) { stopSpeaking(); setOn(false); }
      else { unlockAudio(); setOn(true); speak(text, () => setOn(false)); }
    }}>
      <Icon name={on ? "stop" : "speaker"} size={14} /> {on ? "parar" : "ouvir"}
    </button>
  );
}

// Toca → grava. Toca de novo → transcreve (ElevenLabs; plano B: ditado do navegador).
export function MicButton({ onText, disabled }) {
  const { toast } = useApp();
  const { state, start, stop, supported } = useVoiceInput(onText, () => toast("Não consegui ouvir. Tenta de novo?"));
  if (!supported) return null;
  const label = state === "recording" ? "Parar e transcrever" : state === "transcribing" ? "Transcrevendo" : "Falar";
  return (
    <button className={`fa-mic ${state === "recording" ? "rec" : ""}`} disabled={disabled || state === "transcribing"}
      aria-label={label} title={label} onClick={state === "recording" ? stop : start}>
      <Icon name={state === "recording" ? "stop" : "mic"} size={20} className={state === "transcribing" ? "fa-busy" : ""} />
    </button>
  );
}

/* ------------------------------ escrever ------------------------------ */

// Campo que cresce + microfone + enviar. Enter envia no computador; no celular, o botão.
export function Composer({ value, onChange, onSend, disabled, placeholder = "Escreve ou fala…" }) {
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
      <textarea ref={ref} rows={1} value={value} placeholder={placeholder} aria-label="Mensagem"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(hover: hover)").matches) {
            e.preventDefault();
            if (!disabled && value.trim()) send();
          }
        }} />
      <MicButton disabled={disabled} onText={(t) => onChange(value ? `${value} ${t}` : t)} />
      <button className="fa-send" aria-label="Enviar" disabled={disabled || !value.trim()} onClick={send}>
        <Icon name="up" size={20} />
      </button>
    </div>
  );
}

/* ------------------------------ o caminho ------------------------------ */

// Passos que a Faísca sugeriu: numerais grandes, dá pra marcar e mandar pra lista de tarefas.
export function PathSteps({ steps, checked = [], onToggle, onToTasks }) {
  if (!steps?.length) return null;
  return (
    <div className="fa-path">
      <div className="fa-path-head">
        <span className="fa-kicker">O caminho · {checked.length}/{steps.length}</span>
        {onToTasks && <button className="fa-text" onClick={onToTasks}>virar tarefas <Icon name="right" size={13} /></button>}
      </div>
      <ol>
        {steps.map((s, i) => {
          const on = checked.includes(i);
          return (
            <li key={i}>
              <button className={`fa-step ${on ? "on" : ""}`} onClick={() => onToggle?.(i)} disabled={!onToggle}
                aria-pressed={on} aria-label={`Passo ${i + 1}: ${s}${on ? " (feito)" : ""}`}>
                <span className="fa-step-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="fa-step-t">{s}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------ avisos ------------------------------ */

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="fa-toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className="fa-toast">{t.text}</div>)}
    </div>
  );
}

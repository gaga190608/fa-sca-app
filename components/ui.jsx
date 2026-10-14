"use client";

import { useEffect, useRef, useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon, Mark } from "@/components/icons";
import { useVoiceInput, speak, stopSpeaking, canSpeak, unlockAudio } from "@/lib/speech";

/* ------------------------------ navegação ------------------------------ */

// Barra global de vidro (como a do site da Apple). dark = sobre capítulo preto.
export function GlobalNav({ dark }) {
  const { go } = useApp();
  return (
    <header className={`fa-gnav ${dark ? "dark" : ""}`}>
      <div className="fa-gnav-in">
        <button className="fa-logo" onClick={() => go("home")} aria-label="Faísca, início"><Mark size={20} /> Faísca</button>
        <span className="fa-gnav-sp" />
        <button className="fa-round" aria-label="Ligar pra Faísca" onClick={() => { unlockAudio(); go("call"); }}><Icon name="phone" size={19} /></button>
      </div>
    </header>
  );
}

const TABS = [
  { id: "home", icon: "bubble", label: "Conversar" },
  { id: "organize", icon: "list", label: "Organizar" },
  { id: "settings", icon: "gear", label: "Ajustes" },
];

// Barra de abas de vidro, embaixo (como no iPhone).
export function TabBar() {
  const { route, go } = useApp();
  return (
    <nav className="fa-tabbar" aria-label="Seções">
      <div className="fa-tabbar-in">
        {TABS.map((t) => {
          const on = route.tab === t.id;
          return (
            <button key={t.id} className={`fa-tab ${on ? "on" : ""}`} aria-current={on ? "page" : undefined} onClick={() => go(t.id)}>
              <Icon name={t.icon} size={24} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------ controles ------------------------------ */

// Controle segmentado do iOS: o marcador desliza até a opção escolhida.
export function Segmented({ options, value, onChange, label }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="fa-seg" role="radiogroup" aria-label={label}>
      <span className="fa-seg-thumb" aria-hidden="true"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={o.value === value} className={o.value === value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }) {
  return (
    <button className={`fa-switch ${on ? "on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export const OFFLINE_MSG = {
  no_key: "A IA ainda não foi ligada. Enquanto isso, a conversa usa caminhos prontos e a organização é calculada aqui no celular.",
  rate_limit: "Muitas mensagens seguidas. Espera um minutinho.",
  auth: "A chave da IA foi recusada. Confira a GROQ_API_KEY na Vercel.",
  api_error: "A IA respondeu com erro. Tenta de novo daqui a pouco.",
  network: "Sem conexão com a IA agora.",
};

export function OfflineBanner() {
  const { offline } = useApp();
  if (!offline) return null;
  return <div className="fa-offline" role="status"><Icon name="sparkle" size={18} /><span>{OFFLINE_MSG[offline] || OFFLINE_MSG.network}</span></div>;
}

/* ------------------------------ voz ------------------------------ */

export function SpeakButton({ text }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => on && stopSpeaking(), [on]);
  if (!canSpeak()) return null;
  return (
    <button className="fa-link small" onClick={() => {
      if (on) { stopSpeaking(); setOn(false); }
      else { unlockAudio(); setOn(true); speak(text, () => setOn(false)); }
    }}>
      <Icon name={on ? "stop" : "speaker"} size={16} /> {on ? "Parar" : "Ouvir"}
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
    <button className={`fa-mic fa-press ${state === "recording" ? "rec" : ""}`} disabled={disabled || state === "transcribing"}
      aria-label={label} title={label} onClick={state === "recording" ? stop : start}>
      <Icon name={state === "recording" ? "stop" : "mic"} size={19} className={state === "transcribing" ? "fa-busy" : ""} />
    </button>
  );
}

/* ------------------------------ escrever ------------------------------ */

// Campo da conversa: cresce, microfone, enviar. Brilha enquanto a Faísca pensa.
export function Composer({ value, onChange, onSend, disabled, thinking, placeholder = "Escreve ou fala…" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [value]);
  const send = () => { unlockAudio(); onSend(value); };
  return (
    <div className={`fa-composer fa-glow ${thinking ? "live" : ""}`}>
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
        <Icon name="up" size={19} />
      </button>
    </div>
  );
}

/* ------------------------------ o caminho ------------------------------ */

// Passos que a Faísca sugeriu, no jeito do app Lembretes: marca e o círculo enche.
export function PathSteps({ steps, checked = [], onToggle, onToTasks }) {
  if (!steps?.length) return null;
  return (
    <div className="fa-steps">
      <div className="fa-steps-head"><span>O caminho</span><span>{checked.length} de {steps.length}</span></div>
      <ul className="fa-list">
        {steps.map((s, i) => {
          const on = checked.includes(i);
          return (
            <li key={i}>
              <button className={`fa-step ${on ? "on" : ""}`} onClick={() => onToggle?.(i)} disabled={!onToggle} aria-pressed={on}>
                <span className="fa-circle"><Icon name="check" size={14} /></span>
                <span>{s}</span>
              </button>
            </li>
          );
        })}
        {onToTasks && (
          <li>
            <button className="fa-step fa-steps-action" onClick={onToTasks}>
              <Icon name="plus" size={22} />
              <span>Adicionar às tarefas</span>
            </button>
          </li>
        )}
      </ul>
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

"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Phone, Sparkles } from "lucide-react";

import { useApp } from "@/components/AppContext";
import Brasa from "@/components/Brasa";
import { Composer, PathSteps, SpeakButton, OfflineBanner } from "@/components/ui";
import { askFaisca, offlineReply, OfflineError } from "@/lib/ai";
import { speak, stopSpeaking } from "@/lib/speech";

// Texto que vai pra voz: fala + passos + pergunta.
const spoken = (m) => [m.content, ...(m.steps || []).map((s, i) => `${i + 1}: ${s}.`), m.ask].filter(Boolean).join(" ");

export default function Chat() {
  const app = useApp();
  const { route, chats, profile, tasks, routine, energy, go } = app;
  const existing = route.params.id ? chats.find((c) => c.id === route.params.id) : null;

  const chatId = useRef(existing?.id || null);
  const [messages, setMessages] = useState(existing?.messages || []);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => () => stopSpeaking(), []);

  // veio do início com uma pergunta: já manda
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (route.params.prompt && !existing) send(route.params.prompt);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function persist(list) {
    setMessages(list);
    chatId.current = app.saveChat(chatId.current, list);
  }

  async function send(t) {
    const content = t.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user", content }];
    persist(next);
    setText("");
    setLoading(true);
    let reply;
    try {
      reply = await askFaisca(next, { name: profile.name, tasks, routine, energy });
      app.markOnline();
    } catch (e) {
      if (e instanceof OfflineError) app.markOffline(e.kind);
      reply = e instanceof OfflineError && e.kind === "rate_limit"
        ? { content: "Muitas mensagens seguidas 😅 espera um minutinho e manda de novo?", steps: [], ask: "" }
        : offlineReply(content);
    }
    const msg = { role: "assistant", ...reply, checked: [] };
    persist([...next, msg]);
    setLoading(false);
    if (profile.autoSpeak) speak(spoken(msg));
  }

  function toggleStep(i, s) {
    const list = messages.map((m, k) => {
      if (k !== i) return m;
      const checked = m.checked?.includes(s) ? m.checked.filter((x) => x !== s) : [...(m.checked || []), s];
      return { ...m, checked };
    });
    persist(list);
    if (!messages[i].checked?.includes(s)) app.celebrate();
  }

  function toTasks(m) {
    const made = app.addTasks(m.steps.map((title) => ({ title, size: "rapida" })));
    app.toast(`${made.length} passos viraram tarefas ✔`);
  }

  return (
    <main className="fa-screen fa-chatscreen">
      <div className="fa-chathead">
        <button className="fa-icon" aria-label="Voltar" onClick={() => go("home")}><ArrowLeft size={18} /></button>
        <div className="fa-chathead-title">
          <Brasa size={30} state={loading ? "thinking" : "idle"} />
          <div>
            <b>Faísca</b>
            <small>{loading ? "pensando no caminho…" : "te guia, não responde por você"}</small>
          </div>
        </div>
        <button className="fa-icon" aria-label="Continuar por voz" onClick={() => go("call", { history: messages })}><Phone size={17} /></button>
      </div>

      <div className="fa-chat" ref={scrollRef}>
        <OfflineBanner />
        {messages.length === 0 && !loading && (
          <div className="fa-empty">
            <Brasa size={90} />
            <p>Me conta o que você quer resolver, criar ou organizar.</p>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="fa-msg me"><div className="fa-bubble-me">{m.content}</div></div>
          ) : (
            <div key={i} className="fa-msg ai fa-in">
              <p className="fa-ai-text">{m.content}</p>
              <PathSteps steps={m.steps} checked={m.checked} onToggle={(s) => toggleStep(i, s)} onToTasks={() => toTasks(m)} />
              {m.ask && <p className="fa-ask"><Sparkles size={14} /> {m.ask}</p>}
              <div className="fa-msgtools"><SpeakButton text={spoken(m)} /></div>
            </div>
          )
        )}
        {loading && <div className="fa-msg ai"><div className="fa-typing"><i /><i /><i /></div></div>}
      </div>

      <div className="fa-chatfoot">
        <Composer value={text} onChange={setText} onSend={send} disabled={loading} placeholder="Responde ou pergunta…" />
      </div>
    </main>
  );
}

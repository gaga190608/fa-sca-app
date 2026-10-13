"use client";

import { useEffect, useRef, useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon, Mark } from "@/components/icons";
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
        ? { content: "Muitas mensagens seguidas. Espera um minutinho e manda de novo?", steps: [], ask: "" }
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
  }

  function toTasks(m) {
    const made = app.addTasks(m.steps.map((title) => ({ title, size: "rapida" })));
    app.toast(`${made.length} passos viraram tarefas`);
  }

  return (
    <main className="fa-screen fa-chatscreen">
      <div className="fa-chathead">
        <button onClick={() => go("home")} aria-label="Voltar"><Icon name="left" size={16} /> voltar</button>
        <span className="fa-word"><Mark size={15} /> Faísca</span>
        <button onClick={() => go("call", { history: messages })} aria-label="Continuar por voz"><Icon name="phone" size={16} /> ligar</button>
      </div>

      <div className="fa-chat" ref={scrollRef}>
        <OfflineBanner />
        {messages.length === 0 && !loading && (
          <div className="fa-empty">
            <p className="fa-lead">Me conta o que você quer resolver, criar ou organizar.</p>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="fa-me">{m.content}</div>
          ) : (
            <div key={i} className="fa-ai">
              <span className="fa-kicker">Faísca</span>
              <p className="fa-say">{m.content}</p>
              <PathSteps steps={m.steps} checked={m.checked} onToggle={(s) => toggleStep(i, s)} onToTasks={() => toTasks(m)} />
              {m.ask && <div className="fa-question"><span className="fa-mono">Pra você pensar</span>{m.ask}</div>}
              <div className="fa-tools"><SpeakButton text={spoken(m)} /></div>
            </div>
          )
        )}
        {loading && <div className="fa-typing">pensando no caminho<span>_</span></div>}
      </div>

      <div className="fa-chatfoot">
        <Composer value={text} onChange={setText} onSend={send} disabled={loading} placeholder="Responde ou pergunta…" />
      </div>
    </main>
  );
}

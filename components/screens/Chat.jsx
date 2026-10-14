"use client";

import { useEffect, useRef, useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon, Mark } from "@/components/icons";
import FaiscaIcon from "@/components/FaiscaIcon";
import { Composer, PathSteps, SpeakButton, OfflineBanner, ModeChoice, IdeaCards, Segmented } from "@/components/ui";
import { askFaisca, offlineReply, OfflineError, CHOICE_TEXT } from "@/lib/ai";
import { generateIdeas, offlineIdeas, isIdeaRequest } from "@/lib/ideas";
import { speak, stopSpeaking } from "@/lib/speech";

// Texto que vai pra voz: fala + passos/ideias + pergunta.
const spoken = (m) => [
  m.content,
  ...(m.steps || []).map((s, i) => `${i + 1}: ${s}.`),
  ...(m.ideas || []).map((d) => `${d.titulo}. ${d.ideia}`),
  m.ask,
].filter(Boolean).join(" ");

const STAGE_LABEL = {
  diverge: "Mapeando o óbvio pra fugir dele…",
  curate: "Escolhendo só o que é inédito…",
};
const lastUserText = (list) => [...list].reverse().find((m) => m.role === "user")?.content || "";

export default function Chat() {
  const app = useApp();
  const { route, chats, profile, tasks, routine, energy, go } = app;
  const existing = route.params.id ? chats.find((c) => c.id === route.params.id) : null;

  const chatId = useRef(existing?.id || null);
  const [messages, setMessages] = useState(existing?.messages || []);
  const [mode, setMode] = useState(existing?.mode || null); // null | "guide" | "ideas"
  const modeRef = useRef(mode);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(null);
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

  function persist(list, m = modeRef.current) {
    setMessages(list);
    chatId.current = app.saveChat(chatId.current, list, m);
  }
  function setChatMode(m) {
    modeRef.current = m;
    setMode(m);
  }

  async function send(t) {
    const content = t.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user", content }];
    setText("");
    // pediu ideias e ainda não disse como quer ajuda: pergunta antes (sem gastar IA)
    if (!modeRef.current && isIdeaRequest(content)) {
      persist([...next, { role: "assistant", content: CHOICE_TEXT, choice: "pending" }]);
      return;
    }
    persist(next);
    await reply(next);
  }

  // No modo indicações, só gera uma nova leva de ideias quando ela pede ideias;
  // o resto ("gostei da segunda, como faço?") vira conversa direta sobre elas.
  async function reply(history, { avoid, forceIdeas } = {}) {
    setLoading(true);
    const ideasNow = modeRef.current === "ideas" && (forceIdeas || isIdeaRequest(lastUserText(history)));
    const msg = ideasNow ? await replyIdeas(history, avoid) : await replyGuide(history);
    persist([...history, msg]);
    setLoading(false);
    setStage(null);
    if (profile.autoSpeak) speak(spoken(msg));
  }

  async function replyGuide(history) {
    try {
      const r = await askFaisca(history, { name: profile.name, tasks, routine, energy }, modeRef.current);
      app.markOnline();
      if (r.choice) return { role: "assistant", content: CHOICE_TEXT, choice: "pending" };
      return { role: "assistant", ...r, checked: [] };
    } catch (e) {
      if (e instanceof OfflineError) app.markOffline(e.kind);
      if (e instanceof OfflineError && e.kind === "rate_limit") return { role: "assistant", content: "Muitas mensagens seguidas. Espera um minutinho e manda de novo?", steps: [], ask: "" };
      return { role: "assistant", ...offlineReply(lastUserText(history)), checked: [] };
    }
  }

  async function replyIdeas(history, avoid = []) {
    try {
      const r = await generateIdeas(history, { name: profile.name, avoid, onStage: setStage });
      app.markOnline();
      return { role: "assistant", ...r };
    } catch (e) {
      if (e instanceof OfflineError) app.markOffline(e.kind);
      if (e instanceof OfflineError && e.kind === "rate_limit") return { role: "assistant", content: "Muitas mensagens seguidas. Espera um minutinho e pede de novo?", ideas: [], ask: "" };
      return { role: "assistant", ...offlineIdeas(lastUserText(history.filter((m) => !/^Quero (indicações|mais ideias)/.test(m.content)))) };
    }
  }

  // ela escolheu: indicações ou pensar junto
  function choose(i, kind) {
    if (loading) return;
    setChatMode(kind);
    const list = messages.map((m, k) => (k === i ? { ...m, choice: kind } : m));
    const next = [...list, { role: "user", content: kind === "ideas" ? "Quero indicações suas." : "Me ajuda a pensar." }];
    persist(next, kind);
    reply(next, { forceIdeas: kind === "ideas" });
  }

  function switchMode(kind) {
    setChatMode(kind);
    persist(messages, kind);
  }

  function moreIdeas() {
    if (loading) return;
    const avoid = messages.flatMap((m) => (m.ideas || []).map((d) => d.titulo));
    const next = [...messages, { role: "user", content: "Quero mais ideias, diferentes dessas." }];
    persist(next);
    reply(next, { avoid, forceIdeas: true });
  }

  function develop(d) {
    if (loading) return;
    setChatMode("guide");
    const next = [...messages, { role: "user", content: `Quero desenvolver a ideia "${d.titulo}": ${d.ideia} Me ajuda a pensar nos detalhes?` }];
    persist(next, "guide");
    reply(next);
  }

  function ideaToTask(d) {
    app.addTasks([{ title: d.primeiro_passo || d.titulo, size: "rapida" }]);
    app.toast("Virou tarefa");
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

  const lastIdeasIndex = messages.reduce((acc, m, i) => (m.ideas?.length ? i : acc), -1);

  return (
    <main className="fa-screen fa-chatscreen">
      <div className="fa-navbar">
        <button className="fa-link" onClick={() => go("home")}><Icon name="back" size={22} /> Início</button>
        <span className="fa-navbar-title"><Mark size={18} /> Faísca</span>
        <button className="fa-round" style={{ color: "var(--accent-ink)" }} aria-label="Continuar por voz" onClick={() => go("call", { history: messages })}>
          <Icon name="phone" size={20} />
        </button>
      </div>

      <div className="fa-chat" ref={scrollRef}>
        <div className="fa-chat-in">
          <OfflineBanner />
          {messages.length === 0 && !loading && (
            <div className="fa-empty">
              <FaiscaIcon size={80} ignite className="fa-empty-icon" />
              <h1 className="fa-section">Me conta. <span>O que você quer resolver, criar ou organizar?</span></h1>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="fa-me">{m.content}</div>
            ) : (
              <div key={i} className="fa-ai">
                <div className="fa-ai-who"><Mark size={14} /> Faísca</div>
                <p className="fa-ai-text">{m.content}</p>
                {m.choice === "pending" && !mode && <ModeChoice onPick={(k) => choose(i, k)} />}
                <PathSteps steps={m.steps} checked={m.checked} onToggle={(s) => toggleStep(i, s)} onToTasks={() => toTasks(m)} />
                <IdeaCards ideas={m.ideas} onTask={ideaToTask} onDevelop={develop} />
                {m.ask && (
                  <div className="fa-question">
                    <small><Icon name="sparkle" size={15} /> Pra você pensar</small>
                    <p>{m.ask}</p>
                  </div>
                )}
                {i === lastIdeasIndex && !loading && (
                  <button className="fa-btn fa-btn-ghost fa-press fa-more-ideas" onClick={moreIdeas}><Icon name="sparkle" size={18} /> Quero mais ideias</button>
                )}
                {!m.choice && <div className="fa-tools"><SpeakButton text={spoken(m)} /></div>}
              </div>
            )
          )}
          {loading && (
            <div className="fa-typing" role="status">
              <div className="fa-ai-who"><Mark size={16} flicker /> Faísca</div>
              <span className="fa-thinking">{STAGE_LABEL[stage] || "Pensando no caminho…"}</span>
            </div>
          )}
        </div>
      </div>

      <div className="fa-chatfoot">
        {mode && (
          <div className="fa-modebar">
            <Segmented label="Como a Faísca ajuda" value={mode} onChange={switchMode}
              options={[{ value: "guide", label: "Pensar junto" }, { value: "ideas", label: "Indicações" }]} />
          </div>
        )}
        <Composer value={text} onChange={setText} onSend={send} disabled={loading} thinking={loading} placeholder="Responde ou pergunta…" />
      </div>
    </main>
  );
}

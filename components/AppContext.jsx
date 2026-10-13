"use client";

// Todo o estado global do Faísca: perfil, tarefas, rotina, conversas,
// navegação e avisos. Cada go() incrementa route.key e remonta a tela.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  loadProfile, saveProfile, loadTasks, saveTasks, loadRoutine, saveRoutine,
  loadChats, saveChats, makeTask, uid,
} from "@/lib/storage";
import { localISO } from "@/lib/dates";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(loadProfile);
  const [tasks, setTasks] = useState(loadTasks);
  const [routine, setRoutine] = useState(loadRoutine);
  const [chats, setChats] = useState(loadChats);
  const [route, setRoute] = useState({ tab: "home", params: {}, key: 0 });
  const [toasts, setToasts] = useState([]);
  const [sparkle, setSparkle] = useState(0);
  const [offline, setOffline] = useState(null); // null | kind do OfflineError

  const toast = useCallback((text) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => { if (!saveTasks(tasks)) toast("Não consegui salvar 😕 o armazenamento está cheio."); }, [tasks, toast]);
  useEffect(() => { saveRoutine(routine); }, [routine]);
  useEffect(() => { saveChats(chats); }, [chats]);

  // tema: auto segue o sistema; light/dark força
  useEffect(() => {
    const el = document.documentElement;
    if (profile.theme === "light" || profile.theme === "dark") el.dataset.theme = profile.theme;
    else delete el.dataset.theme;
  }, [profile.theme]);

  const go = useCallback((tab, params = {}) => {
    setRoute((r) => ({ tab, params, key: r.key + 1 }));
    window.scrollTo?.(0, 0);
  }, []);

  const celebrate = useCallback(() => setSparkle((s) => s + 1), []);

  // energia vale só pro dia em que foi marcada
  const energy = profile.energy?.day === localISO() ? profile.energy.level : "ok";
  const setEnergy = useCallback((level) => setProfile((p) => ({ ...p, energy: { level, day: localISO() } })), []);

  /* ---------------- tarefas ---------------- */
  const addTasks = useCallback((list) => {
    const made = list.map(makeTask).filter(Boolean);
    setTasks((t) => [...made, ...t]);
    return made;
  }, []);
  const updateTask = useCallback((id, patch) => setTasks((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t))), []);
  const toggleTask = useCallback((id) => {
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? 0 : Date.now() } : t)));
  }, []);
  const removeTask = useCallback((id) => setTasks((list) => list.filter((t) => t.id !== id)), []);

  /* ---------------- conversas ---------------- */
  // Salva (ou cria) a conversa e devolve o id.
  const saveChat = useCallback((id, messages) => {
    const cid = id || uid();
    const firstUser = messages.find((m) => m.role === "user")?.content || "Conversa";
    const title = firstUser.length > 48 ? `${firstUser.slice(0, 48)}…` : firstUser;
    setChats((list) => [{ id: cid, title, at: Date.now(), messages }, ...list.filter((c) => c.id !== cid)]);
    return cid;
  }, []);
  const removeChat = useCallback((id) => setChats((list) => list.filter((c) => c.id !== id)), []);

  const value = useMemo(() => ({
    profile, setProfile, energy, setEnergy,
    tasks, setTasks, addTasks, updateTask, toggleTask, removeTask,
    routine, setRoutine,
    chats, setChats, saveChat, removeChat,
    route, go, toasts, toast, sparkle, celebrate,
    offline, markOffline: setOffline, markOnline: () => setOffline(null),
  }), [profile, energy, setEnergy, tasks, addTasks, updateTask, toggleTask, removeTask, routine, chats, saveChat, removeChat,
    route, go, toasts, toast, sparkle, celebrate, offline]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

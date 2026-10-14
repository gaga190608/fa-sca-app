"use client";

import { useRef, useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon } from "@/components/icons";
import { Segmented, Switch } from "@/components/ui";
import { exportBackup, parseBackup } from "@/lib/storage";
import { speak, unlockAudio } from "@/lib/speech";

export default function Settings() {
  const app = useApp();
  const { profile, setProfile } = app;
  const [name, setName] = useState(profile.name);
  const fileRef = useRef(null);

  function download() {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `faisca-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function restore(file) {
    if (!file) return;
    try {
      const d = parseBackup(await file.text());
      if (!window.confirm("Trocar tudo que está aqui pelo backup?")) return;
      setProfile(d.profile); app.setTasks(d.tasks); app.setRoutine(d.routine); app.setChats(d.chats);
      setName(d.profile.name);
      app.toast("Backup restaurado");
    } catch (e) {
      app.toast(e.message?.includes("Faísca") ? e.message : "Não consegui ler esse arquivo");
    }
  }

  return (
    <main className="fa-screen fa-wrap" style={{ paddingTop: 18, paddingBottom: 24 }}>
      <h1 className="fa-title">Ajustes</h1>

      <p className="fa-group-title">Você</p>
      <ul className="fa-list">
        <li className="fa-row">
          <label htmlFor="nm2" style={{ flexShrink: 0 }}>Nome</label>
          <input id="nm2" className="fa-inline-input" style={{ textAlign: "right", color: "var(--ink-2)" }} value={name}
            onChange={(e) => setName(e.target.value)} onBlur={() => setProfile((p) => ({ ...p, name: name.trim() }))} placeholder="Como a Faísca te chama" />
        </li>
      </ul>

      <p className="fa-group-title">Aparência</p>
      <Segmented label="Aparência" value={profile.theme} onChange={(v) => setProfile((p) => ({ ...p, theme: v }))}
        options={[{ value: "auto", label: "Automático" }, { value: "light", label: "Claro" }, { value: "dark", label: "Escuro" }]} />

      <p className="fa-group-title">Voz</p>
      <ul className="fa-list">
        <li className="fa-row">
          <span className="fa-row-main">Ler respostas em voz alta</span>
          <Switch on={profile.autoSpeak} label="Ler respostas em voz alta" onChange={(v) => { unlockAudio(); setProfile((p) => ({ ...p, autoSpeak: v })); }} />
        </li>
        <li style={{ padding: 0 }}>
          <button className="fa-row fa-row-btn" onClick={() => { unlockAudio(); speak(`Oi${profile.name ? `, ${profile.name}` : ""}! Eu sou a Faísca. Bora acender umas ideias?`); }}>
            <span className="fa-row-main" style={{ color: "var(--accent-ink)" }}>Ouvir a voz da Faísca</span>
            <Icon name="speaker" size={20} className="fa-row-chev" />
          </button>
        </li>
      </ul>

      <p className="fa-group-title">Seus dados</p>
      <ul className="fa-list">
        <li style={{ padding: 0 }}>
          <button className="fa-row fa-row-btn" onClick={download}>
            <span className="fa-row-main">Baixar backup</span><Icon name="chevron" size={16} className="fa-row-chev" />
          </button>
        </li>
        <li style={{ padding: 0 }}>
          <button className="fa-row fa-row-btn" onClick={() => fileRef.current?.click()}>
            <span className="fa-row-main">Restaurar backup</span><Icon name="chevron" size={16} className="fa-row-chev" />
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ""; }} />
        </li>
        <li style={{ padding: 0 }}>
          <button className="fa-row fa-row-btn" onClick={() => window.confirm("Apagar todas as conversas?") && app.setChats([])}>
            <span className="fa-row-main" style={{ color: "var(--accent-ink)" }}>Apagar conversas</span>
          </button>
        </li>
      </ul>
      <p className="fa-caption" style={{ marginLeft: 16 }}>Tudo fica só neste aparelho. Faça um backup pra levar pra outro celular.</p>

      <section className="fa-about fa-reveal">
        <b><span className="fa-spark-text">Como a Faísca pensa.</span></b>
        <p>Quando você pede ideias, ela não entrega a resposta: mostra os passos do caminho e te devolve uma pergunta. Na hora de se organizar, aí sim ela diz por onde começar — olhando seus prazos, sua energia e sua rotina.</p>
      </section>
    </main>
  );
}

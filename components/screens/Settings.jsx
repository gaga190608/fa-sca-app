"use client";

import { useRef, useState } from "react";

import { useApp } from "@/components/AppContext";
import { Icon } from "@/components/icons";
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
    <main className="fa-screen">
      <section className="fa-hero">
        <span className="fa-kicker">Ajustes</span>
        <h1 className="fa-display">Do <i>seu</i> jeito.</h1>
      </section>

      <label className="fa-label" htmlFor="nm2">Seu nome</label>
      <input id="nm2" className="fa-field" value={name} onChange={(e) => setName(e.target.value)}
        onBlur={() => setProfile((p) => ({ ...p, name: name.trim() }))} placeholder="Como a Faísca te chama" />

      <label className="fa-label">Tema</label>
      <div className="fa-seg" role="radiogroup" aria-label="Tema">
        {[["auto", "Automático"], ["light", "Papel"], ["dark", "Noite"]].map(([k, v]) => (
          <button key={k} role="radio" aria-checked={profile.theme === k} className={profile.theme === k ? "on" : ""}
            onClick={() => setProfile((p) => ({ ...p, theme: k }))}>{v}</button>
        ))}
      </div>

      <h2 className="fa-h2"><span>Voz</span></h2>
      <div className="fa-setrow">
        <span>Ler as respostas em voz alta sozinha</span>
        <button className={`fa-toggle ${profile.autoSpeak ? "on" : ""}`} role="switch" aria-checked={profile.autoSpeak}
          aria-label="Ler as respostas em voz alta"
          onClick={() => { unlockAudio(); setProfile((p) => ({ ...p, autoSpeak: !p.autoSpeak })); }}><span /></button>
      </div>
      <div className="fa-setrow">
        <span>Ouvir a voz da Faísca</span>
        <button className="fa-line" onClick={() => { unlockAudio(); speak(`Oi${profile.name ? `, ${profile.name}` : ""}! Eu sou a Faísca. Bora acender umas ideias?`); }}>
          <Icon name="speaker" size={16} /> Testar
        </button>
      </div>

      <h2 className="fa-h2"><span>Seus dados</span></h2>
      <p className="fa-note">Tudo fica só neste aparelho. Faz um backup pra levar pra outro celular.</p>
      <div className="fa-plan-actions">
        <button className="fa-line" onClick={download}>Baixar backup</button>
        <button className="fa-line" onClick={() => fileRef.current?.click()}>Restaurar</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ""; }} />
        <button className="fa-line danger" onClick={() => window.confirm("Apagar todas as conversas?") && app.setChats([])}>Apagar conversas</button>
      </div>

      <section className="fa-about">
        <span className="fa-kicker">Como a Faísca pensa</span>
        <p>Quando você pede ideias, ela não entrega a resposta: mostra os passos do caminho e te devolve uma pergunta. Na hora de se organizar, aí sim ela diz por onde começar — olhando seus prazos, sua energia e sua rotina.</p>
      </section>
    </main>
  );
}

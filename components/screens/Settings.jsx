"use client";

import { useRef, useState } from "react";
import { Download, Upload, Volume2, ArrowLeft } from "lucide-react";

import { useApp } from "@/components/AppContext";
import { exportBackup, parseBackup } from "@/lib/storage";
import { speak, unlockAudio } from "@/lib/speech";

export default function Settings() {
  const app = useApp();
  const { profile, setProfile, go } = app;
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
      app.toast("Backup restaurado ✔");
    } catch (e) {
      app.toast(e.message?.includes("Faísca") ? e.message : "Não consegui ler esse arquivo 😕");
    }
  }

  return (
    <main className="fa-screen fa-in">
      <button className="fa-ghost" style={{ alignSelf: "flex-start" }} onClick={() => go("home")}><ArrowLeft size={14} /> voltar</button>
      <h1 className="fa-display" style={{ fontSize: 28, marginTop: 14 }}>Ajustes</h1>

      <label className="fa-label" htmlFor="nm2">Seu nome</label>
      <input id="nm2" className="fa-field" value={name} onChange={(e) => setName(e.target.value)}
        onBlur={() => setProfile((p) => ({ ...p, name: name.trim() }))} placeholder="Como a Faísca te chama" />

      <div className="fa-label">Tema</div>
      <div className="fa-chips">
        {[["auto", "automático"], ["dark", "brasa (escuro)"], ["light", "claro"]].map(([k, v]) => (
          <button key={k} className={`fa-chip ${profile.theme === k ? "on" : ""}`} onClick={() => setProfile((p) => ({ ...p, theme: k }))}>{v}</button>
        ))}
      </div>

      <div className="fa-label">Voz</div>
      <div className="fa-setrow">
        <span>Ler as respostas em voz alta sozinha</span>
        <button className={`fa-toggle ${profile.autoSpeak ? "on" : ""}`} role="switch" aria-checked={profile.autoSpeak}
          onClick={() => { unlockAudio(); setProfile((p) => ({ ...p, autoSpeak: !p.autoSpeak })); }}><span /></button>
      </div>
      <button className="fa-ghost" style={{ marginTop: 8 }} onClick={() => { unlockAudio(); speak(`Oi${profile.name ? `, ${profile.name}` : ""}! Eu sou a Faísca. Bora acender umas ideias?`); }}>
        <Volume2 size={14} /> testar a voz
      </button>

      <div className="fa-label">Seus dados</div>
      <p className="fa-note">Tudo fica só neste aparelho. Faz um backup pra levar pra outro celular.</p>
      <div className="fa-chips">
        <button className="fa-ghost" onClick={download}><Download size={14} /> baixar backup</button>
        <button className="fa-ghost" onClick={() => fileRef.current?.click()}><Upload size={14} /> restaurar</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <button className="fa-ghost danger" style={{ marginTop: 10, alignSelf: "flex-start" }}
        onClick={() => window.confirm("Apagar todas as conversas?") && app.setChats([])}>apagar conversas</button>

      <div className="fa-about">
        <b>Como a Faísca pensa</b>
        <p>Quando você pede ideias, ela não te entrega a resposta pronta: te mostra os passos do caminho e te devolve uma pergunta — como uma boa professora. Na hora de se organizar, aí sim ela diz por onde começar, olhando seus prazos, sua energia e sua rotina.</p>
      </div>
    </main>
  );
}

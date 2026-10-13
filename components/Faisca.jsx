"use client";

// Casca do app: mapa tab → tela. Telas em components/screens/.

import { AppProvider, useApp } from "@/components/AppContext";
import { TopBar, Toasts } from "@/components/ui";
import Home from "@/components/screens/Home";
import Chat from "@/components/screens/Chat";
import Organize from "@/components/screens/Organize";
import Call from "@/components/screens/Call";
import Settings from "@/components/screens/Settings";

const SCREENS = { home: Home, chat: Chat, organize: Organize, call: Call, settings: Settings };
const FULLSCREEN = new Set(["chat", "call"]); // sem a barra do topo

function Shell() {
  const { route } = useApp();
  const Screen = SCREENS[route.tab] || Home;
  return (
    <div className={`fa-root ${route.tab === "call" ? "fa-root-call" : ""}`}>
      {!FULLSCREEN.has(route.tab) && <TopBar />}
      <Screen key={route.key} />
      <Toasts />
    </div>
  );
}

export default function Faisca() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

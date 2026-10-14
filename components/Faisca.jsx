"use client";

// Casca do app: mapa tab → tela. Telas em components/screens/.

import { AppProvider, useApp } from "@/components/AppContext";
import { GlobalNav, TabBar, Toasts } from "@/components/ui";
import Home from "@/components/screens/Home";
import Chat from "@/components/screens/Chat";
import Organize from "@/components/screens/Organize";
import Call from "@/components/screens/Call";
import Settings from "@/components/screens/Settings";

const SCREENS = { home: Home, chat: Chat, organize: Organize, call: Call, settings: Settings };
const FULLSCREEN = new Set(["chat", "call"]); // sem barras: a tela é toda dela

function Shell() {
  const { route } = useApp();
  const Screen = SCREENS[route.tab] || Home;
  const full = FULLSCREEN.has(route.tab);
  return (
    <div className={`fa-root ${full ? "fa-root-full" : ""} ${route.tab === "home" ? "fa-root-home" : ""}`}>
      {!full && <GlobalNav dark={route.tab === "home"} />}
      <Screen key={route.key} />
      {!full && <TabBar />}
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

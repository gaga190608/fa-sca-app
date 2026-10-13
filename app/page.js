"use client";

import dynamic from "next/dynamic";

// Só no navegador — o app usa localStorage, microfone e áudio.
const Faisca = dynamic(() => import("@/components/Faisca"), { ssr: false });

export default function Page() {
  return <Faisca />;
}

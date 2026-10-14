"use client";

// ════════════════════════════════════════════════════════════════════
//  A CARA DO FAÍSCA: uma faísca (o fogo) com uma lâmpada acesa dentro
//  (a ideia). Versão grande e animada — pra tamanhos ≥ 48px.
//  Pra ícone pequeno (barra, rótulos) use <Mark /> de icons.jsx.
//
//  state:  idle   chama tremulando, luz da lâmpada respirando, faíscas subindo
//          think  tremula rápido e a lâmpada irradia (a ideia vindo)
//          listen o fogo cresce com a voz (level 0..1)
//          speak  pulsa no ritmo da fala
//          off    quase apagada (microfone pausado)
//  ignite: ao montar, o fogo sobe da base e a lâmpada acende com um estouro de raios.
//  Movimento só em transform/opacity; com "reduzir movimento" tudo para e ela
//  aparece já acesa (nada depende da animação pra existir).
// ════════════════════════════════════════════════════════════════════

import { useId } from "react";

// Fogo: ponta em cima, lambida à esquerda, base larga.
const FLAME_OUT = "M60 6 C68 22 92 36 94 66 C96 92 80 112 60 112 C40 112 24 94 26 70 C27 54 36 44 42 36 C42 48 47 56 53 58 C49 42 52 24 60 6 Z";
const FLAME_MID = "M60 28 C66 40 84 52 84 74 C84 92 73 105 60 105 C47 105 36 93 36 77 C36 64 44 56 50 48 C51 57 55 62 58 62 C56 51 56 39 60 28 Z";
// Lâmpada (dentro do fogo): vidro redondo + soquete em anéis.
const BULB = "M54 84 C54 80 46 76 46 68 A14 14 0 1 1 74 68 C74 76 66 80 66 84 Z";
// No lugar do filamento: uma mini faísca de 4 pontas (cintila).
const SPARK = "M60 60.5 C60.7 65 62 66.3 66.5 67 C62 67.7 60.7 69 60 73.5 C59.3 69 58 67.7 53.5 67 C58 66.3 59.3 65 60 60.5 Z";
// Raios saindo da lâmpada (sem o de baixo, que cairia no soquete).
const RAYS = [0, 1, 2, 3, 5, 6, 7].map((i) => {
  const a = (i * Math.PI) / 4 - Math.PI / 2;
  const p = (r) => [60 + Math.cos(a) * r, 68 + Math.sin(a) * r].map((n) => n.toFixed(1));
  const [x1, y1] = p(18), [x2, y2] = p(24);
  return `M${x1} ${y1}L${x2} ${y2}`;
}).join("");

export default function FaiscaIcon({ size = 96, state = "idle", level = 0, ignite = false, className = "", label }) {
  const uid = useId().replace(/:/g, "");
  const id = (n) => `fi-${n}-${uid}`;
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`fi fi-${state} ${ignite ? "fi-ignite" : ""} ${className}`}
      style={{ "--lvl": level }} {...a11y}>
      <defs>
        <radialGradient id={id("halo")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FF9F0A" stopOpacity=".55" />
          <stop offset=".5" stopColor="#FF453A" stopOpacity=".22" />
          <stop offset="1" stopColor="#FF3B30" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("out")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFA20A" />
          <stop offset=".5" stopColor="#FF4F1F" />
          <stop offset="1" stopColor="#D9142B" />
        </linearGradient>
        <linearGradient id={id("mid")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD24A" />
          <stop offset=".6" stopColor="#FF8A1F" />
          <stop offset="1" stopColor="#FF5A1F" />
        </linearGradient>
        <radialGradient id={id("light")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFFBEA" stopOpacity=".95" />
          <stop offset=".45" stopColor="#FFF1C2" stopOpacity=".5" />
          <stop offset="1" stopColor="#FFE08A" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="fi-halo-in"><circle className="fi-halo" cx="60" cy="64" r="60" fill={`url(#${id("halo")})`} /></g>

      {size >= 64 && (
        <g className="fi-sparks" fill="#FFC21A">
          <circle cx="58" cy="9" r="2" style={{ "--dx": "-7px" }} />
          <circle cx="62" cy="11" r="1.5" style={{ "--dx": "8px", animationDelay: ".9s" }} />
          <circle cx="60" cy="10" r="1.3" style={{ "--dx": "1px", animationDelay: "1.7s" }} />
        </g>
      )}

      <g className="fi-flame">
        <g className="fi-flame-in">
          <path className="fi-f1" d={FLAME_OUT} fill={`url(#${id("out")})`} />
          <path className="fi-f2" d={FLAME_MID} fill={`url(#${id("mid")})`} />
        </g>

        <g className="fi-bulb">
          <circle className="fi-light" cx="60" cy="68" r="26" fill={`url(#${id("light")})`} />
          <path className="fi-rays" d={RAYS} stroke="#FFF6E0" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d={BULB} fill="#FFF6E0" />
          <path className="fi-spark" d={SPARK} fill="#FF6A1A" />
          <path d="M51.5 64 A9 9 0 0 1 56 58.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
          <g fill="#FFE7C2">
            <rect x="53" y="86" width="14" height="3.4" rx="1.7" />
            <rect x="54" y="90.8" width="12" height="3.4" rx="1.7" />
            <rect x="56.5" y="95.6" width="7" height="3" rx="1.5" />
          </g>
        </g>
      </g>
    </svg>
  );
}

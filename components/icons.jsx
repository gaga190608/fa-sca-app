import { useId } from "react";

// Ícones próprios no espírito dos SF Symbols: grade 24, traço 1.8, pontas redondas.
// Cor sempre currentColor (ver DESIGN.md). Sem emoji em lugar nenhum.

const PATHS = {
  up: "M12 19V5M6 11l6-6 6 6",
  back: "M15 5l-7 7 7 7",
  chevron: "M9 5l7 7-7 7",
  mic: "M12 3.5a3 3 0 0 0-3 3V12a3 3 0 0 0 6 0V6.5a3 3 0 0 0-3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21",
  micOff: "M9 6.5a3 3 0 0 1 6 0V12M15 14a3 3 0 0 1-6-2M5.5 11a6.5 6.5 0 0 0 10.6 5M18.5 11a6.4 6.4 0 0 1-.4 2.2M12 17.5V21M4 4l16 16",
  stop: "M7 7h10v10H7z",
  phone: "M6.6 3.5h2.6l1.6 4.2-2 1.4a10.5 10.5 0 0 0 6.1 6.1l1.4-2 4.2 1.6v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z",
  hang: "M3.5 13.5c4.6-4.4 12.4-4.4 17 0l-1.6 2.7-3.4-.9v-2.6a9.6 9.6 0 0 0-7 0v2.6l-3.4.9z",
  speaker: "M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  forward: "M5 6l7 6-7 6zM12 6l7 6-7 6z",
  pause: "M9 5.5v13M15 5.5v13",
  plus: "M12 5v14M5 12h14",
  trash: "M4.5 7h15M10 7V4.5h4V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5",
  star: "M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-1.9 1.1l-.3 2H11l-.3-2a7.6 7.6 0 0 1-1.9-1.1l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 0 1 0-2.9L4.9 9.3l2-3.4 1.9.7a7.6 7.6 0 0 1 1.9-1.1l.3-2h4l.3 2a7.6 7.6 0 0 1 1.9 1.1l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 0 1 0 2.9z",
  bubble: "M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 16h-6l-4.5 4v-4H7a2.5 2.5 0 0 1-2.5-2.5z",
  list: "M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01",
  sparkle: "M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7zM18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z",
};

export function Icon({ name, size = 20, className, filled }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}

// A marca: faísca de 4 pontas preenchida com o gradiente da marca.
export function Mark({ size = 22, className }) {
  const id = `fa-mark${useId().replace(/:/g, "")}`;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF2D55" />
          <stop offset=".45" stopColor="#FF3B30" />
          <stop offset="1" stopColor="#FF9500" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M12 1.5c.9 6.1 3.6 8.8 10 10-6.4 1.2-9.1 3.9-10 10-.9-6.1-3.6-8.8-10-10 6.4-1.2 9.1-3.9 10-10z" />
    </svg>
  );
}

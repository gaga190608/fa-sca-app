// Ícones próprios do Faísca: grade 24, traço 2px, pontas retas (ver DESIGN.md).
// Poucos e de propósito — onde der, o app usa só texto.

const PATHS = {
  up: "M12 20V4M5 11l7-7 7 7",
  left: "M20 12H4M11 5l-7 7 7 7",
  right: "M4 12h16M13 5l7 7-7 7",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  stop: "M6 6h12v12H6z",
  phone: "M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z",
  hang: "M3 14c5-5 13-5 18 0l-2 4-4-1v-3a10 10 0 0 0-6 0v3l-4 1z",
  speaker: "M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11",
  check: "M4 12l5 5L20 6",
  x: "M5 5l14 14M19 5L5 19",
  skip: "M5 5l9 7-9 7zM18 5v14",
  pause: "M8 5v14M16 5v14",
};

export function Icon({ name, size = 18, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

// A marca: asterisco de 8 raios (a faísca). Estático.
export function Mark({ size = 20, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      stroke="currentColor" strokeWidth="3" strokeLinecap="square" fill="none">
      <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

"use client";

// A "brasa": a cara da Faísca. Uma chama viva feita só de CSS.
// state: idle | listening | thinking | speaking   ·   level: 0..1 (volume da voz)

export default function Brasa({ size = 96, state = "idle", level = 0 }) {
  return (
    <div className={`fa-orb fa-orb-${state}`} aria-hidden="true"
      style={{ width: size, height: size, "--lvl": state === "listening" ? level : 0 }}>
      <span className="fa-orb-halo" />
      <span className="fa-orb-flame fa-orb-a" />
      <span className="fa-orb-flame fa-orb-b" />
      <span className="fa-orb-core" />
      {size >= 80 && (
        <>
          <i className="fa-orb-spark" style={{ left: "30%", animationDelay: "0s" }} />
          <i className="fa-orb-spark" style={{ left: "58%", animationDelay: ".9s" }} />
          <i className="fa-orb-spark" style={{ left: "72%", animationDelay: "1.7s" }} />
        </>
      )}
    </div>
  );
}

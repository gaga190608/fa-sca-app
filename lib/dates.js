// Datas LOCAIS (YYYY-MM-DD). toISOString() usa UTC e, no Brasil, vira
// "amanhã" depois das 21h — o que quebraria a sequência de dias.

export function localISO(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localISO(d);
}

// "agora há pouco", "hoje", "ontem", "há 3 dias", "12/10/2026"
export function relativeDay(ts) {
  const diff = Date.now() - ts;
  if (diff < 60 * 60 * 1000) return "agora há pouco";
  const day = localISO(new Date(ts));
  if (day === localISO()) return "hoje";
  if (day === yesterdayISO()) return "ontem";
  const days = Math.round(diff / 86_400_000);
  if (days < 7) return `há ${days} dias`;
  return new Date(ts).toLocaleDateString("pt-BR");
}

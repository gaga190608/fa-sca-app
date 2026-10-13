// Limite simples por IP (em memória), usado pelas rotas /api/*.
// Na Vercel cada instância tem a sua memória, então não é um limite exato —
// mas segura abuso óbvio de quem achar a URL.

export function createRateLimiter({ windowMs = 60_000, max = 40 } = {}) {
  const hits = new Map();
  return function limited(req) {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear(); // não deixa o mapa crescer pra sempre
    return recent.length > max;
  };
}

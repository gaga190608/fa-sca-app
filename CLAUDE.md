# CLAUDE.md — Faísca

## Visão Geral
Assistente de IA (pt-BR) pra **ter ideias e se organizar**, com jeito de professora: quando ela pede ideias,
a Faísca mostra **os passos do caminho** e devolve uma pergunta — nunca a resposta pronta.
Exceção: "por onde eu começo?" — aí ela recomenda, olhando tarefas, rotina, horários livres e energia.
Tem voz (microfone, leitura em voz alta, ligação). Tudo fica no `localStorage`; sem IA, o app segue útil
(caminhos prontos e prioridade calculada no celular).

## Stack
- JavaScript (sem TypeScript), Next.js 14 (App Router), React 18. Sem biblioteca de ícones (ícones próprios).
- IA: Groq (`openai/gpt-oss-120b`, reserva `gpt-oss-20b`; `GROQ_MODEL` força outro) via `fetch` direto.
- Voz: ElevenLabs (TTS + STT) com rodízio de chaves; plano B = voz e ditado do próprio navegador.
- npm. Sem suíte de testes: a verificação é `npm run lint` + `npm run build` + olhar o app rodando.

## Rodar
1. `npm ci`
2. `cp .env.example .env.local` e preencher `GROQ_API_KEY` (opcional) e `ELEVENLABS_API_KEYS` (opcional)
3. `npm run dev` → http://localhost:3000
Diagnóstico em produção: `/api/chat` (IA) e `/api/voice` (chaves de voz) abertos no navegador.

## Mapa
Ver `README.md` (tabela). Pontos-chave:
- `app/api/chat/route.js` — contrato `{ system, messages, max_tokens, json }` → `{ text }`; falhas com **status 200**
  e `{ _noKey }` / `{ _apiError, kind }` (o front entra em modo sem IA). Limites protegem a cota da chave.
- `lib/ai.js` — prompts e validação. Chat responde JSON `{fala, passos[], pergunta}`; "despejar tarefas" e
  "por onde eu começo" também em JSON, sempre com plano B local.
- `lib/routine.js` — rotina, horários livres e prioridade local (funções puras).
- `lib/storage.js` — chaves `fa:profile|tasks|routine|chats` + backup. Mudou formato? Migre nos `normalize*`.
- `components/AppContext.jsx` — estado global (`useApp()`), navegação `go(tab, params)` (cada `go` remonta a tela).
- `components/FaiscaIcon.jsx` — a marca animada (faísca com lâmpada dentro); `Mark` em `icons.jsx` é a pequena.

## Visual — leia `DESIGN.md` antes de mexer em tela
Estilo Apple: neutros da Apple + UMA cor de ação (faísca `#D6301A`), SF Pro via `-apple-system` (Inter de reserva),
listas e controles do iOS, brilho "inteligência"/Siri como movimento. Classes `fa-*` (app) e `fi-*` (marca).
Cores só por token (exceção: as cores da marca). **Zero emoji.** Movimento só em transform/opacity e tudo desliga
com `prefers-reduced-motion` sem esconder conteúdo. Antes de dizer que está pronto, refaça a seção 7 do DESIGN.md
(contraste medido, sem estouro em 280px, toque ≥ 24px, movimento reduzido).

## Convenções
- Import com alias `@/`. Textos e comentários em português, tom carinhoso; a usuária é tratada no feminino.
- Inputs com 16–17px (iPhone não dá zoom). A página carrega o app com `dynamic(..., { ssr: false })`.

## Gotchas
- Datas usam data **local** (`localISO`), nunca `toISOString()` (UTC vira "amanhã" à noite no Brasil).
- O Groq desliga modelos de tempos em tempos: a rota tenta a lista `MODELS` em ordem; os gpt-oss gastam tokens
  pensando, por isso `REASONING_HEADROOM`.
- `unlockAudio()` precisa rodar dentro de um toque (iPhone) antes de tocar áudio.
- Rate limit da rota é em memória por instância (aproximado na Vercel).
- No ambiente do Claude, `fetch` do servidor só passa pelo proxy com `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
- Pra testar a UI sem chave: `next start` em background + Playwright interceptando `/api/chat` (responda conforme o `system`).

## Limites
- Cautela (avise antes): `app/api/chat/route.js`, `lib/storage.js`, `package.json`, `next.config.js`.
- Proibido sem confirmação: ler/commitar `.env*` (só `.env.example`; chaves ficam na Vercel), editar `package-lock.json`
  à mão, `git push --force`, apagar branches, deploy.

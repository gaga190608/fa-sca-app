# Faísca 🔥

Assistente de IA pra **ter ideias e se organizar**, com um jeito de professora:
não entrega a resposta pronta, mostra **os passos do caminho** e devolve uma pergunta.

## O que ela faz

- **Conversar** — "me ajuda a ter ideias pra…", "tô travada em…", "quebra isso em passos".
  A resposta vem como *fala + caminho (passos que dá pra marcar) + uma pergunta*.
  Os passos viram tarefas com um toque.
- **Organizar** — despeja tudo que tem pra fazer (escrevendo ou falando); a IA separa em tarefas
  com tamanho, prazo e importância. O botão **"Por onde eu começo?"** olha a **rotina**
  (compromissos fixos, horário em que ela rende mais), os **horários livres de hoje**
  e a **energia do momento**, e monta a ordem com horários.
- **Voz** (o mesmo motor do QuestHero) — microfone em todo campo (ElevenLabs, plano B: ditado
  do navegador), botão "ouvir" nas respostas, leitura automática opcional e **ligação**:
  ouvir → transcrever → pensar → falar, sem apertar nada.
- **Sem IA** — continua útil: roteiros de "caminho" prontos no chat e a prioridade calculada
  no próprio celular (`lib/routine.js`).

Tudo fica no `localStorage` do aparelho (backup em Ajustes).

## Rodar

```bash
cd faisca
npm ci
cp .env.example .env.local   # GROQ_API_KEY (e ELEVENLABS_API_KEYS pra voz) — opcionais
npm run dev                   # http://localhost:3000
```

Verificação: `npm run lint` e `npm run build`.

## Publicar na Vercel

Novo projeto apontando pra este mesmo repositório, com **Root Directory = `faisca`**.
Variáveis: `GROQ_API_KEY` (pode ser a mesma do QuestHero) e, pra voz,
`ELEVENLABS_API_KEYS` / `ELEVENLABS_VOICE_ID`.
Diagnóstico: `/api/chat` (IA) e `/api/voice` (chaves de voz) abertos no navegador.

## Mapa

| Arquivo | O que é |
| --- | --- |
| `app/api/chat` | Rota do Groq (cópia da do QuestHero: rodízio de modelos, rate limit, falha = status 200) |
| `app/api/tts`, `stt`, `voice` + `lib/server/elevenlabs.js` | Voz e transcrição (ElevenLabs, rodízio de chaves) |
| `lib/ai.js` | Prompts da Faísca, validação das respostas, planos B |
| `lib/routine.js` | Rotina, horários livres e prioridade local (funções puras) |
| `lib/storage.js` | Chaves `fa:profile|tasks|routine|chats` + backup |
| `lib/speech.js` | `speak()`, `useVoiceInput()`, `recordUtterance()` (igual ao QuestHero) |
| `components/AppContext.jsx` | Estado global (`useApp()`), navegação `go(tab, params)` |
| `DESIGN.md` | Sistema visual (Neon Brutalist): cores, tipos, componentes, o que não fazer |
| `components/icons.jsx` | Ícones próprios (traço 2px) e a marca (asterisco) |
| `components/screens/` | `Home`, `Chat`, `Organize` (+ `Routine`), `Call`, `Settings` |
| `app/globals.css` | Tokens (papel + noite) e classes `fa-*`, seguindo o `DESIGN.md` |

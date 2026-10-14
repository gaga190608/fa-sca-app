// ════════════════════════════════════════════════════════════════════
//  MODO INDICAÇÕES — o motor criativo da Faísca
//  Quando ela escolhe "quero indicações", a Faísca entrega ideias prontas —
//  mas não as que qualquer um daria. São duas passadas de IA:
//
//   1. DIVERGIR (temperatura alta): entende o objetivo real, lista o ÓBVIO
//      (e proíbe), gera 10 candidatas, cada uma por uma lente diferente.
//   2. CURAR (temperatura média): uma diretora de criação exigente pontua
//      originalidade/encaixe/concretude/impacto, corta o genérico, afia ou
//      funde ideias e entrega 4 — de "segura" a "fora da curva".
//
//  Plano B: se a 2ª passada falhar, usa as melhores da 1ª; sem IA nenhuma,
//  devolve "alavancas" (provocações) aplicadas ao tema dela.
//  Toda resposta é validada aqui antes de chegar na tela.
// ════════════════════════════════════════════════════════════════════

import { callAPI, parseJSONObject, OfflineError } from "./ai";

export const OUSADIA = ["segura", "ousada", "fora da curva"];

const str = (v, d = "") => (typeof v === "string" && v.trim() ? v.trim() : d);
const cut = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s);

/* ---------------- 1ª passada: divergir ---------------- */

const LENSES = `LENTES (uma candidata por lente, cada uma num território diferente):
1. MUNDO DISTANTE — roube a lógica de uma área sem relação nenhuma: biologia, astronomia, culinária, games, arquitetura, esporte, medicina, logística, ilusionismo, cinema, música, rituais de outra cultura.
2. INVERSÃO — faça o contrário do esperado: tirar em vez de pôr, quem recebe vira autor, o fim vira começo, o defeito vira atração.
3. RESTRIÇÃO EXTREMA — e se custasse zero? coubesse em 5 minutos? usasse 1 objeto só? fosse sem palavras? em escala 1000x?
4. OS SENTIDOS — uma ideia que vive no som, no cheiro, no toque, no gosto ou no escuro.
5. TEMPO — passado (memória, cápsula do tempo), futuro (carta, previsão, legado) ou ritmo (série, contagem regressiva, algo que se revela ao longo dos dias).
6. TROCA DE PAPÉIS — quem recebe faz; um desconhecido participa; um objeto vira personagem.
7. COMBINAÇÃO IMPROVÁVEL — junte dois mundos que nunca se encontram (ex.: "manual de instruções" + "declaração de amor").
8. JOGO OU RITUAL — mistério, caça ao tesouro, missão, assinatura, ritual que se repete.
9. TECNOLOGIA INESPERADA (simples) — QR code, áudio, mapa, planilha, IA, impressão, celular — usada de um jeito que ninguém usa.
10. PESSOAL DEMAIS PRA COPIAR — uma ideia que só funciona por causa de um detalhe específico dela ou da situação.`;

function divergeSystem(name) {
  const quem = name ? `a ${name}` : "ela";
  return `Você é o motor criativo da Faísca: um time de inventores, diretores de arte, cientistas, designers de experiência e roteiristas numa só mente. Você está ajudando ${quem}, que pediu INDICAÇÕES prontas. Sua missão é gerar ideias que ela NUNCA encontraria numa busca no Google, no Pinterest, no TikTok ou numa lista de "10 ideias de…".

COMO VOCÊ PENSA (internamente, antes de responder):
1. ENTENDA O PEDIDO DE VERDADE. Qual o objetivo por trás (o que ela quer que aconteça, o que alguém deve sentir)? Pra quem é? Quais as restrições (dinheiro, tempo, idade, lugar, regras, recursos)? O que não foi dito, assuma o cenário mais provável pra uma jovem no Brasil e anote a suposição.
2. MAPEIE O ÓBVIO. Liste as 6 ideias que qualquer pessoa daria — as primeiras que vêm à cabeça, as do Pinterest. Elas estão PROIBIDAS, e qualquer variação delas também ("festa temática", "vídeo com fotos", "álbum", "cartaz", "apresentação de slides", "jantar especial"… se for desse tipo, é óbvio).
3. DIVIRJA usando as lentes abaixo.
4. TESTE CADA UMA: dá pra imaginar a cena acontecendo? Tem objeto, lugar, ação? Alguém diria "nunca tinha pensado nisso"? Se não, troque o detalhe que a deixa comum até virar.

${LENSES}

Regras: nada de clichê, nada de ideia vaga ("faça algo criativo"), nada perigoso, ilegal ou que dependa de muito dinheiro (a não ser que ela tenha dito que pode). Concreto acima de tudo. Português do Brasil, sem emojis.

Responda APENAS com JSON:
{"objetivo": string, "suposicoes": [string], "obvias": [string], "candidatas": [{"titulo": string, "ideia": string, "lente": string}]}
"candidatas": exatamente 10, uma por lente. "ideia": 2 frases concretas.`;
}

/* ---------------- 2ª passada: curar ---------------- */

const CURATE_SYSTEM = `Você é a curadora criativa da Faísca — exigente como uma diretora de criação premiada. Você recebe o pedido dela, o objetivo real, o que é ÓBVIO (proibido) e 10 ideias candidatas. Sua missão: entregar só ideias que fariam ela dizer "uau, nunca tinha pensado nisso".

AVALIE cada candidata (internamente), de 0 a 10:
- ORIGINALIDADE: já apareceu em alguma lista da internet? Lembra uma das óbvias? Então é zero.
- ENCAIXE: resolve o objetivo real dela, dentro das restrições?
- CONCRETUDE: dá pra começar amanhã? Tem cena, objeto, ação?
- IMPACTO: gera surpresa, emoção, conexão, uma história pra contar?

MELHORE antes de entregar: afie a ideia, junte duas candidatas fracas numa forte, ou troque o detalhe que a deixava comum. Corte tudo que cabe numa frase genérica ("faça uma surpresa", "crie um vídeo", "organize uma festa") — se cabe, ainda não está pronta.

ENTREGUE exatamente 4 ideias, de lentes diferentes e em escala de ousadia: 1 "segura" (fácil e barata, mas com uma virada de verdade), 2 "ousada" e 1 "fora da curva" (a mais audaciosa que ainda dá pra fazer).
Para cada ideia:
- "titulo": nome curto e marcante (até 6 palavras).
- "ideia": o que é, em 2 ou 3 frases concretas — descreva a cena acontecendo.
- "virada": por que é diferente do que todo mundo faz (1 frase) — o truque criativo.
- "primeiro_passo": uma ação de até 15 minutos pra começar hoje, começando com verbo.
- "ousadia": "segura" | "ousada" | "fora da curva".
E ainda:
- "fala": 1 ou 2 frases calorosas apresentando (sem repetir as ideias, sem "aqui estão").
- "pergunta": pergunte qual acendeu algo nela, ou se ela quer misturar ou adaptar alguma.
Trate-a no feminino. Português do Brasil, sem emojis, sem markdown.
Responda APENAS com JSON: {"fala": string, "ideias": [{"titulo": string, "ideia": string, "virada": string, "primeiro_passo": string, "ousadia": string}], "pergunta": string}`;

/* ---------------- montagem ---------------- */

// O pedido em texto: o que ela pediu + o fio recente da conversa.
function requestText(messages) {
  const recent = messages.slice(-10).map((m) => {
    if (m.role === "user") return `ELA: ${m.content}`;
    const ideas = (m.ideas || []).map((d) => `- ${d.titulo}`).join("\n");
    return `FAÍSCA: ${m.content}${ideas ? `\n${ideas}` : ""}`;
  });
  return cut(recent.join("\n"), 5000);
}

function normalizeIdea(d) {
  const titulo = str(d?.titulo).slice(0, 80), ideia = str(d?.ideia).slice(0, 600);
  if (!titulo || !ideia) return null;
  const o = str(d?.ousadia).toLowerCase();
  return {
    titulo,
    ideia,
    virada: str(d?.virada || d?.lente).slice(0, 300),
    primeiro_passo: str(d?.primeiro_passo).slice(0, 200),
    ousadia: OUSADIA.includes(o) ? o : o.includes("fora") ? "fora da curva" : o.includes("segur") ? "segura" : "ousada",
  };
}

// Devolve { content, ideas[], ask }. avoid = títulos já sugeridos (pra "mais ideias").
// onStage("diverge" | "curate") avisa a tela em que etapa está.
export async function generateIdeas(messages, { name, avoid = [], onStage } = {}) {
  const pedido = requestText(messages);
  const avoidTxt = avoid.length ? `\n\nJÁ SUGERIDAS (não repita nem faça variações): ${avoid.slice(-16).join("; ")}` : "";

  onStage?.("diverge");
  const raw1 = await callAPI({
    max_tokens: 1800, json: true, creative: true, reasoning: "medium",
    system: divergeSystem(name),
    messages: [{ role: "user", content: `${pedido}${avoidTxt}` }],
  });
  let d1;
  try { d1 = parseJSONObject(raw1); } catch { throw new OfflineError("api_error"); }
  const candidates = (Array.isArray(d1.candidatas) ? d1.candidatas : []).filter((c) => str(c?.titulo) && str(c?.ideia)).slice(0, 12);
  if (!candidates.length) throw new OfflineError("api_error");
  const obvious = (Array.isArray(d1.obvias) ? d1.obvias : []).map((x) => str(x)).filter(Boolean).slice(0, 8);

  onStage?.("curate");
  try {
    const raw2 = await callAPI({
      max_tokens: 1500, json: true, reasoning: "medium",
      system: CURATE_SYSTEM,
      messages: [{
        role: "user",
        content: [
          `PEDIDO (conversa):\n${pedido}`,
          `OBJETIVO REAL: ${str(d1.objetivo, "—")}`,
          `SUPOSIÇÕES: ${(Array.isArray(d1.suposicoes) ? d1.suposicoes : []).map((x) => str(x)).filter(Boolean).join("; ") || "—"}`,
          `ÓBVIAS (proibidas): ${obvious.join("; ") || "—"}`,
          avoid.length ? `JÁ SUGERIDAS (proibidas): ${avoid.slice(-16).join("; ")}` : "",
          `CANDIDATAS:\n${candidates.map((c, i) => `${i + 1}. [${str(c.lente, "—")}] ${str(c.titulo)}: ${str(c.ideia)}`).join("\n")}`,
        ].filter(Boolean).join("\n\n"),
      }],
    });
    const d2 = parseJSONObject(raw2);
    const ideas = (Array.isArray(d2.ideias) ? d2.ideias : []).map(normalizeIdea).filter(Boolean).slice(0, 5);
    if (ideas.length >= 2) {
      return {
        content: str(d2.fala, "Fugi do óbvio pra você. Olha só:"),
        ideas,
        ask: str(d2.pergunta, "Qual dessas acendeu alguma coisa em você?"),
      };
    }
  } catch (e) {
    if (!(e instanceof OfflineError)) console.warn("[ideas] curadoria falhou, usando a 1ª passada", e);
  }

  // plano B: as candidatas da 1ª passada (sem curadoria)
  const ladder = ["segura", "ousada", "ousada", "fora da curva"];
  return {
    content: "Fugi do óbvio pra você. Olha só:",
    ideas: candidates.slice(0, 4).map((c, i) => normalizeIdea({ ...c, virada: `Lente: ${str(c.lente)}`, ousadia: ladder[i] })).filter(Boolean),
    ask: "Qual dessas acendeu alguma coisa em você?",
  };
}

/* ---------------- sem IA: alavancas aplicadas ao tema dela ---------------- */

export function offlineIdeas(text) {
  const tema = cut(text.replace(/^(me )?(ajuda a )?(ter )?(ideias?|sugest\w*|indica\w*)( pra| para| de)?\s*/i, "").trim() || "isso", 60);
  return {
    content: "Tô sem a IA agora, então não consigo te dar indicações à altura. Mas essas alavancas tiram qualquer ideia do óbvio:",
    ideas: [
      { titulo: "Roube de outro mundo", ousadia: "ousada", ideia: `Como um chef, um game ou uma cientista resolveria "${tema}"? Pega a regra deles e traz pro seu caso.`, virada: "Ideia nova quase sempre é uma lógica velha num lugar novo.", primeiro_passo: "Escreve 3 mundos sem relação e 1 regra de cada" },
      { titulo: "Faça o contrário", ousadia: "fora da curva", ideia: `Qual seria o jeito oposto do esperado pra "${tema}"? Quem recebe faz, o fim vira começo, o defeito vira atração.`, virada: "Inverter tira você da trilha que todo mundo usa.", primeiro_passo: "Lista o óbvio e escreve o contrário de cada um" },
      { titulo: "Só com um objeto", ousadia: "segura", ideia: `E se "${tema}" tivesse que caber em um objeto só, sem gastar nada? Qual objeto, e o que ele faria?`, virada: "Limite extremo obriga a criatividade a aparecer.", primeiro_passo: "Olha em volta e escolhe 1 objeto pra começar" },
      { titulo: "Um sentido só", ousadia: "ousada", ideia: `Como "${tema}" seria se existisse só no som, no cheiro ou no toque?`, virada: "Quase ninguém pensa fora da visão.", primeiro_passo: "Escolhe um sentido e imagina a cena por 5 minutos" },
    ],
    ask: "Qual alavanca te deu vontade de tentar?",
    offline: true,
  };
}

/* ---------------- ela está pedindo ideias? (detector local, sem gastar IA) ---------------- */

const IDEA_RE = /\b(ideias?|sugest(ão|ões|ao|oes)|sugere|sugira|indica(ção|ções|cao|coes|r|)|inspira\w*|brainstorm|criativ\w*)\b|o que (eu )?(posso|poderia|dá pra|da pra|daria pra) fazer/i;
const ORGANIZE_RE = /\b(primeiro|começ\w*|comec\w*|prioridad\w*|ordem|tarefas?|rotina|agenda|horário|horario)\b/i;

export const isIdeaRequest = (text) => IDEA_RE.test(text) && !ORGANIZE_RE.test(text);

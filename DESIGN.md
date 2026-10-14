# Faísca — estilo Apple, com a faísca no lugar do azul

Sistema visual do app. Base: `design-systems/library/apple/DESIGN.md` e `taste/motion-choreography.md`
do kit [ux-ui-agent-skills (XIAS)](https://github.com/plugin87/ux-ui-agent-skills).
A troca principal: a Apple usa **um** azul de ação; o Faísca usa **uma** família vermelho → laranja (a faísca).

## 1. Atmosfera

Calma de galeria com capítulos de cinema: um herói preto com luz se movendo atrás do título,
seguido de campos cinza-claro (`#f5f5f7`) com cartões brancos. A interface some; o que aparece
é a conversa, os passos e o dia dela.

## 2. Cores e papéis

```
Neutros (Apple)
--bg        #F5F5F7  capítulo claro         escuro: #000000
--canvas    #FFFFFF  cartões e listas       escuro: #1C1C1E
--ink       #1D1D1F  texto (nunca #000)     escuro: #F5F5F7
--ink-2     #6E6E73  texto secundário       escuro: #98989D
--ink-chip  #636366  texto sobre chip/trilho escuro: #AEAEB2
--hair      #D2D2D7  divisórias de 0,5px    escuro: #38383A
--night     #000000  capítulos pretos (herói, ligação)
--night-card #000000 cartões pretos          escuro: #1C1C1E (pra não sumir no fundo)

A faísca (a única cor de ação)
--accent      #D6301A  botões e balão dela — texto branco 4,89:1
--accent-ink  #C42D12  links/destaque em fundo claro   escuro: #FF7A45
--spark       #FF453A → #FF6A2B → #FF9F0A   SÓ em título grande sobre preto
--spark-ring  #FF2D55 #FF3B30 #FF9500 #FFCC00 (cores do sistema da Apple) — o brilho
```

Regra: a faísca nunca vira segunda cor; não existe azul, verde ou roxo na interface.

## 3. Tipografia

- `-apple-system` primeiro: no iPhone/Mac é a própria **SF Pro** (Display nos títulos, Text no corpo).
  Em outros aparelhos: **Inter Tight** (títulos) e **Inter** (texto) — o substituto indicado pelo kit.
- Herói: 40–64px, peso 600, entrelinha 1,04, tracking −3,5%. Seção: 28–40px "Agora. *Seu dia num relance.*"
  (frase em duas cores: tinta + cinza, como nas páginas da Apple). Título de tela: 34px peso 700 (Large Title do iOS).
- Corpo 17px / 1,47, tracking −2,2%. Legenda 13px. Inputs com 16–17px (iPhone não dá zoom).

## 4. Componentes

- **Raios por função** (nunca um só): 8 (campos de hora), 10 (segmentado), 12 (campos), 18 (listas),
  22–24 (campo de conversa), 28 (cartões bento, plano), 980 (pílulas), 50% (círculos).
- **Botões:** pílula. Primário = faísca + branco. Sobre preto = pílula clara (`#F5F5F7` + tinta).
  Pressionar = `scale(.97)`.
- **Barras:** vidro (`saturate(180%) blur(20px)`) — barra global em cima (preta na tela inicial),
  barra de abas embaixo como no iPhone.
- **Listas agrupadas do iOS:** fundo branco, divisória de 0,5px recuada 16px. Tarefas e passos
  com **círculo de concluir** do app Lembretes (enche com a faísca e o check entra com mola).
- **Controle segmentado do iOS:** o marcador desliza (300ms).
- **Bento:** cartões de 28px em grade de 2 (1 coluna abaixo de 340px).
- **Ícones:** próprios, no espírito dos SF Symbols (`components/icons.jsx`, traço 1,8, pontas redondas).
  **Zero emoji** em qualquer texto.

## 5. A marca: a faísca com a lâmpada dentro

O fogo (a faísca) por fora, uma lâmpada acesa dentro (a ideia) e, no lugar do filamento,
uma mini faísca de 4 pontas. Faísca → lâmpada → faísca: a ideia nasce do fogo.

| Peça | Arquivo | Uso |
|---|---|---|
| Grande e animada | `components/FaiscaIcon.jsx` (`size`, `state`, `level`, `ignite`) | início, ligação, conversa vazia, Ajustes (≥ 48px) |
| Pequena | `Mark` em `components/icons.jsx` (`flicker` = fogo tremula) | barras, rótulo "Faísca", "pensando" (14–28px) |
| Ícone do app | `app/icon.svg`, `app/apple-icon.png` (180), `public/icon-192.png`, `public/icon-512.png` | favicon, tela de início do iPhone, Android |

Cores próprias da marca (exceção aos tokens, como o mascote do QuestHero): fogo `#FFA20A → #FF4F1F → #D9142B`,
camada de dentro `#FFD24A → #FF5A1F`, lâmpada `#FFF6E0`, mini faísca `#FF6A1A`. Funciona em fundo claro e escuro.
Mudou o desenho? Regere os PNGs a partir do SVG (fundo preto, sem cantos — o iPhone arredonda sozinho).

Estados da animada: **ignite** (o fogo sobe da base → a lâmpada acende com mola → raios estouram, ~1,4s, uma vez) ·
**idle** (duas chamas tremulando em ritmos diferentes, luz da lâmpada respirando, mini faísca cintilando, faíscas subindo da ponta) ·
**think** (tudo mais rápido + a lâmpada irradia) · **listen** (o fogo cresce com a voz, `level` 0–1) · **speak** (pulsa) · **off** (quase apagada).

## 6. Movimento (o "graphic motion")

Um movimento-assinatura por tela; o resto fica quieto (kit: *restraint reads as premium*).

| Tela | Assinatura | Como |
|---|---|---|
| Início | a faísca acende no topo; manchas de luz flutuando atrás; título entra palavra por palavra depois dela | ignição ~1,4s; manchas em loop lento (14–19s); palavras 600ms com 70ms entre elas |
| Conversa | **brilho "inteligência"**: anel de gradiente girando em volta do campo enquanto ela pensa; texto "Pensando no caminho…" com brilho passando | `@property --fa-angle` + `conic-gradient`; anel mascarado + cópia desfocada atrás |
| Organizar | o plano entra subindo, a linha do tempo em cascata (60ms) | `fa-enter` 400ms |
| Ligação | **estilo Siri**: borda da tela acesa com o gradiente girando; a faísca no centro cresce com a voz, pulsa falando, irradia pensando | `--lvl` (0–1) do microfone vira `scale` e opacidade |
| Rolagem | blocos sobem ao entrar na tela | `animation-timeline: view()` (sem JS) |

Regras: só `transform`/`opacity` (e o ângulo do brilho); rotinas ≤ 300ms, herói ≤ 600ms;
`prefers-reduced-motion` desliga tudo — e **nada depende de animação pra aparecer**.

## 7. Verificação (refaça antes de dizer que está pronto)

Critérios do kit, medidos no app renderizado (claro, escuro e com "reduzir movimento"):
sem estouro lateral em 280/320/414px · alvo de toque ≥ 24px · contraste real de todo texto
(4,5:1; 3:1 em texto grande) · nenhuma animação nem texto invisível com movimento reduzido · zero emoji.
Gates provam o objetivo, não o gosto: olhe os prints também.

## 8. Não fazer

Segunda cor de ação · gradiente em texto pequeno ou sobre fundo claro · `#000` como cor de texto ·
um raio só pra tudo · sombra pesada · animar `width/height/top/box-shadow` · emoji · ícone de biblioteca genérica.

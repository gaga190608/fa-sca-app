# Faísca — Neon Brutalist (remix: The Verge × caderno de anotações)

Sistema visual do app. Base: família **Neon Brutalist** do
[awesome-claude-design](https://github.com/rohitg00/awesome-claude-design) (`design-md/brutalist/the-verge.md`),
escolhida pelo picker do repo: produto de leitura (conversa), pessoa comum, marca que precisa parecer corajosa.

## 1. Atmosfera

Decidida, direta, sem pedir desculpa — como uma professora que acredita em você.
Papel branco, tinta preta e **um** laranja que acende. A conversa parece uma página editorial:
a Faísca fala em serifa (citação), o caminho vem em passos numerados com numerais enormes.

## 2. Cores e papéis

```
--bg        #FFFFFF   papel            (escuro: #0B0B0A)
--ink       #0B0B0A   tinta            (escuro: #F4F2EC)
--bar       #0B0B0A   barra do topo / seções invertidas
--accent    #FF5F00   ÚNICA cor de ação: botão principal, aba ativa, numerais do caminho, pergunta
--on-accent #0B0B0A   texto sobre laranja (preto, nunca branco)
--hot       #E5251B   UM papel semântico: urgente/atrasada, gravando, desligar, linha do "agora"
--muted     #66645E   texto secundário
--rule      = --ink   regras de 2px
--wash      #F1EFEA   troca tonal (hover, faixa livre da rotina)
```

Vermelho e laranja nunca competem: laranja = "faça", vermelho = "atenção agora".

## 3. Tipografia

- **Display:** Archivo, peso 800, largura 112–125 (expandida), tracking −2%. Escala 13/16/20/28/44/68.
- **Voz da Faísca / ênfase:** Instrument Serif (itálico permitido) — a tensão serifa × sem-serifa é a estética.
- **Corpo/UI:** Archivo 400–700, largura 100.
- **Numerais, horários, rótulos:** JetBrains Mono, caixa alta, tracking +8%, tabular.
- Inputs com 16px (iPhone não dá zoom).

## 4. Componentes

- **Botões:** raio 0. Primário = laranja + texto preto, caixa alta, peso 700. Hover/pressionado: inverte (preto + branco), sem transição.
  Secundário = 2px de borda na cor da tinta.
- **Itens / listas:** sem cartão. Itens separados por regras de 2px.
- **Campos:** 2px de borda, raio 0; foco = borda laranja.
- **O caminho:** numerais mono grandes (01, 02…) numa coluna; marcar um passo pinta o numeral de laranja.
- **A pergunta:** faixa laranja de largura total, texto preto em serifa.
- **Seções invertidas:** o plano "comece por" e a ligação são blocos pretos (no escuro, invertem pro papel).
- **Ícones:** família própria (`components/icons.jsx`): traço 2px, pontas retas, grade 24. Onde der, só texto.
- **Marca:** asterisco de 8 raios (`Mark`), estático.

## 5. Layout

Coluna única até 640px. Barra preta de largura total no topo, abas embaixo divididas por regra de 2px.
Profundidade de caixas no máximo 2 (seção › item).

## 6. Profundidade

Plana. Zero sombra, zero blur, zero gradiente. Profundidade = regra de 2px, inversão e contraste de tamanho.

## 7. Movimento

Só quando comunica estado: o medidor de voz na ligação (barras reagem ao volume), o "digitando" da resposta.
Nada de partículas, brilho pulsando ou flutuação. Respeita `prefers-reduced-motion`.

## 8. Não fazer

Cantos arredondados · sombras · gradientes · segunda cor de ação · emoji como ícone · Lucide ·
"bolinha de status" piscando · cartão dentro de cartão · regra lateral colorida decorativa.

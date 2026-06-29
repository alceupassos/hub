# Handoff: Strategy Partners — Console (chat multimodelo C-level)

## Overview
Tela principal de um chat multimodelo de IA voltado a executivos C-level (produto "Strategy Partners", de code.angra.io). O usuário faz uma pergunta estratégica e recebe respostas de vários LLMs em paralelo (Claude, GPT, Gemini, …). A tela permite **comparar** as respostas modelo a modelo, ver uma **síntese** consolidada com recomendação, e inspecionar a **timeline** de execução. Um painel lateral direito ("Execução", retrátil) mostra métricas, concordância entre modelos, toggles de modelos ativos e o contexto anexado.

## About the Design Files
Os arquivos deste pacote são **referências de design criadas em HTML** — um protótipo que demonstra a aparência e o comportamento pretendidos, **não** código de produção para copiar diretamente. A tarefa é **recriar esse design no ambiente do codebase de destino** (o monorepo Next.js / React "angrahub"), usando os padrões e bibliotecas de componentes que o projeto já adota. O HTML usa estilos inline e um pequeno runtime de componente só para fins de prototipagem; ao portar, substitua por componentes React idiomáticos do seu stack.

O arquivo `Strategy Partners — Console.dc.html` abre direto no navegador para servir de referência viva (passe o mouse, troque abas, recolha o painel). O logo está em `strategy-partners-logo.svg`.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos e interações são finais. Recreie a UI fielmente usando as libs e os padrões do codebase. Os valores exatos estão em "Design Tokens" abaixo.

---

## Screen: Console (chat multimodelo)

Tela única de viewport cheia (`100vh`), três colunas em flex:

```
┌───────────┬───────────────────────────────────┬──────────────┐
│ Left nav  │            Center (main)           │  Inspector   │
│ 244px     │              flex:1                │ 276px / 46px │
│ (fixo)    │  header • body scroll • composer   │ (retrátil)   │
└───────────┴───────────────────────────────────┴──────────────┘
```

### Coluna 1 — Navegação (largura 244px, `#FFFFFF`, borda direita `#E4E7EC`, padding 18px 14px, flex-column)
- **Logo** no topo: `strategy-partners-logo.svg`, largura 142px, padding 2px 6px 18px.
- **Botão "Nova execução"**: largura total, padding 8px 10px, fundo `--accent` (`#0B3A78`), texto `#fff` 12px/500, radius 8px, ícone "+" 14px. Hover: `opacity:.92`.
- **Seção "Workspace"** (label IBM Plex Mono 10px/600, uppercase, letter-spacing .07em, cor `#98A1B0`). Itens de nav (12.5px, padding 7px 10px, radius 7px, gap 11px com ícone 15px):
  - "Conversas" — **ativo**: cor `--accent`, fundo `#ECF1FA`, weight 500.
  - "Projetos", "Modelos", "Relatórios", "Conhecimento" — cor `#465062`; hover fundo `#F2F4F7`.
- **Seção "Recentes"** (mesmo estilo de label). Itens 12px, padding 7px 10px:
  - "Expansão LATAM — Q3" — **ativo**: cor `#0F141A`/500, fundo `#F2F4F7`.
  - "M&A · setor logístico", "Orçamento 2026", "Posicionamento competitivo", "Plano de sucessão" — cor `#5A6472`; hover `#F4F5F7`.
- **Rodapé (mt-auto, borda topo `#EBEDF1`)**: avatar 30×30 radius 7 fundo `--accent` texto "AA" 10.5px/600; nome "Alexandre Azevedo" 12px/500 `#0F141A`; cargo "CEO · Strategy Partners" IBM Plex Mono 10px `#98A1B0`.

### Coluna 2 — Main (flex:1, flex-column)
**Header** (altura 54px, borda inferior `#E4E7EC`, fundo `#fff`, padding 0 18px, space-between):
- Esquerda: breadcrumb "Projetos / **Expansão LATAM — Q3**" (12.5px `#5A6472`; título 13.5px/600 `#0F141A`) + badge "concluído" (IBM Plex Mono 10px, cor `#1F9D6B`, fundo `#E8F6F0`, padding 2px 7px, radius 5px).
- Centro: **segmented control** das abas (fundo `#EEF0F3`, radius 8px, padding 3px). Cada pílula 12px, padding 5px 13px, radius 6px. Aba ativa: cor `#0F141A`/600, fundo `#fff`, `box-shadow:0 1px 2px rgba(0,0,0,.07)`. Inativa: cor `#5A6472`, fundo transparente. Abas: **Comparar**, **Síntese**, **Timeline**.
- Direita: botão "Exportar" (outline `#DDE1E8`, 12px `#465062`, ícone download) + botão ícone-painel 32×32 que abre/fecha o inspector (`toggleInspector`).

**Body** (flex:1, scroll-y, padding 18px, fundo `#F5F6F8`; conteúdo centralizado `max-width:900px; margin:0 auto`):

- **Card de pergunta** (sempre visível): fundo `#fff`, borda `#E7EAEF`, radius 10px, padding 13px 15px, flex gap 11px. Tag "PERGUNTA" (IBM Plex Mono 10px, cor `--accent`, fundo `#ECF1FA`, padding 3px 7px, radius 5px) + texto 13.5px `#1c2330` line-height 1.55. Copy: *"Devemos acelerar a expansão para o México no Q3, considerando o cenário cambial atual?"*

- **Aba COMPARAR** (default):
  - Label "Respostas por modelo" (11.5px/600 `#465062`) + contador "3 / 12 modelos" (IBM Plex Mono 10.5px `#98A1B0`).
  - **Grid de cards** `repeat(auto-fit, minmax(215px, 1fr))`, gap 12px. Um card por modelo **ativo**. Card: fundo `#fff`, borda `#E7EAEF`, radius 10px, padding 14px, flex-column. Contém: bolinha de cor do modelo (8px) + nome (12.5px/600); postura/stance (13px/600 cor `--accent`); texto (12px `#5A6472` lh 1.6, flex:1); barra de confiança (track `#EEF0F3` h5 radius3; fill = `barColor` do modelo, largura = `conf%`; rótulo "confiança" + "86%" em IBM Plex Mono 10px).
  - **Faixa "Síntese recomendada"**: fundo `--accent`, radius 10px, padding 15px 17px, flex gap 15px. Label vertical (IBM Plex Mono 10px `#9DBDEB` uppercase) + divisória 1px `rgba(255,255,255,.18)` + texto `#EAF1FB` 13px (com `<strong>` em `#fff`). Copy: *"**Entrada faseada com hedge.** Travar 40% do capital no Q3 protegido por hedge cambial de 90 dias; revisar o restante no Q4 após o dado de inflação de outubro."*

- **Aba SÍNTESE**: card branco (borda `#E7EAEF`, radius 10px, padding 26px 30px).
  - Header: selo 25×25 radius7 fundo `#ECF1FA` com losango (borda `--accent`) + "Síntese estratégica" (12.5px/600) + "consenso de 3 · 1.24s" (mono 10px `#98A1B0`).
  - Título 17px/600 `#0F141A` lh1.4: *"Entrada faseada, com captura parcial da janela cambial."*
  - Parágrafo 14px `#3a4658` lh1.7.
  - Lista de 3 ações numeradas dentro de bloco `#F8FAFC` borda `#EAEEF4` radius10 padding 17px 19px: número (mono 12.5px `--accent`) + texto 13.5px `#2a3543` lh1.6 (com `<strong>`).
  - Rodapé (borda topo `#EEF1F6`): "Sintetizado de" + 3 chips de modelo (bolinha + nome 11.5px `#5A6472`) + "concordância 2/3" (mono 10.5px `#1F9D6B`, à direita).

- **Aba TIMELINE**: card branco (padding 20px 22px).
  - Header "Execução paralela" (12.5px/600) + "janela 0 – 1.5s" (mono 10.5px `#98A1B0`).
  - Uma linha por modelo ativo: rótulo de 124px (bolinha + nome 12px) + track flex (h21 `#F4F5F7` radius5) com barra preenchida `width = dur/1.5*100%`, cor `barColor`, com duração ("1.24s") em mono 10px `#fff` alinhada à direita dentro da barra.
  - Eixo inferior "0s / 0.5s / 1.0s / 1.5s" (mono 10px `#B4BCC8`, padding-left 137px para alinhar às barras).

**Composer** (padding 15px 18px, fundo `#F5F6F8`, borda topo `#E4E7EC`; conteúdo `max-width:900px` centralizado):
- Caixa branca borda `#DDE1E8` radius10 padding 7px 7px 7px 15px, flex align-center gap 11px: `<input>` (13.5px, placeholder "Refinar pergunta ou pedir aprofundamento…") + chip "N modelos" (mono 10.5px, bolinhas dos modelos, borda `#E4E7EC`) + botão enviar 35×35 radius8 fundo `--accent` (seta).

### Coluna 3 — Inspector "Execução" (RETRÁTIL)
**Aberto** (largura 276px, `#FFFFFF`, borda esquerda `#E4E7EC`, padding 16px 15px, scroll-y):
- Header: "Execução" (11.5px/600) + botão chevron-direita (recolher → `toggleInspector`).
- **Métricas** (linhas space-between, label 11.5px `#5A6472` + valor mono 12px `#0F141A`): Latência 1.24s · Tokens 4 812 · Custo US$ 0,14 · Modelos {N/12}.
- Divisória 1px `#EBEDF1`.
- **Concordância**: duas barras — "Faseado / hedge" 2 de 3 (fill `#1F9D6B` 67%), "Aguardar Q4" 1 de 3 (fill `#C2C8D2` 33%). Track `#EEF0F3` h6.
- **Modelos ativos**: lista com toggle por modelo. Linha clicável: bolinha + nome (12px; ativo `#0F141A`, inativo `#98A1B0` com bolinha `#D4D8DF`) + **switch** 30×17 radius9 (ligado fundo `--accent`, knob 13px à direita; desligado fundo `#E0E3E9`, knob à esquerda). Modelos: Claude Opus 4.5, GPT-5.1, Gemini 2.5 Pro (ligados), Grok 4 (desligado).
- **Contexto**: dois arquivos anexados em pílulas `#F8FAFC` borda `#EAEEF4` (ícone de documento + nome 11.5px): "Câmbio_LATAM_Q2.xlsx", "Plano_Expansão_MX.pdf".

**Recolhido** (trilho largura 46px, `#FFFFFF`, borda esquerda `#E4E7EC`, centralizado): botão chevron-esquerda 30×30 (reabrir) + label vertical (`writing-mode:vertical-rl; transform:rotate(180deg)`) "EXECUÇÃO · {N/12}" (mono 11px/600 uppercase `#98A1B0`). Ao recolher, o `main` ganha a largura e os cards de Comparar passam a ficar lado a lado.

---

## Interactions & Behavior
- **Abas**: clicar em Comparar/Síntese/Timeline troca o conteúdo do body (estado `tab`). Default = `comparar`.
- **Toggle de modelo** (no inspector): clica na linha → liga/desliga o modelo. Reflete imediatamente em: nº de cards na aba Comparar, nº de barras na Timeline, contador "N / 12" (métricas + label) e contador "N modelos" do composer.
- **Inspector retrátil**: o botão no header e o chevron no painel chamam `toggleInspector`; alterna entre painel 276px e trilho 46px. Sem animação obrigatória no protótipo — ao portar, uma transição de largura ~150ms fica natural.
- **Hover**: itens de nav e botões escurecem levemente (`#F2F4F7` / `opacity:.92`).
- **Responsivo**: grid de Comparar é `auto-fit minmax(215px,1fr)` — colapsa de 3→2→1 coluna conforme a largura. Breadcrumb usa ellipsis.
- Botões "Nova execução", "Exportar", enviar e os links de nav/recentes são **placeholders** no protótipo (`noop`) — ligar às ações reais.

## State Management
Estado mínimo necessário:
- `tab: 'comparar' | 'sintese' | 'timeline'` — aba ativa.
- `inspectorOpen: boolean` — painel aberto/recolhido.
- `models: Model[]` — cada um `{ id, name, dot, barColor, stance, text, conf, dur, on }`. Derivados: `active = models.filter(on)`, `activeCount`, `countLabel = "N / 12"`.
- No produto real, acrescentar: conversa atual + histórico, mensagens, streaming de resposta por modelo, métricas reais (latência/tokens/custo vindas da API), anexos de contexto.

## Design Tokens

**Cores**
- App bg `#F5F6F8` · Superfície/card `#FFFFFF`
- Bordas: `#E4E7EC` (estrutura) · `#E7EAEF` (cards) · `#EBEDF1` (divisória) · `#EAEEF4` (suave) · `#DDE1E8` (inputs) · `#EEF1F6`
- Texto: `#0F141A` (primário) · `#1c2330`/`#2a3543`/`#3a4658`/`#465062` (corpo) · `#5A6472` (secundário) · `#98A1B0`/`#B4BCC8`/`#C2C8D2`/`#D4D8DF` (faint)
- **Accent (marca, navy)** `#0B3A78` — alternativas curadas: `#0A3470`, `#14418A`, `#1D4F9A`. Accent soft bg `#ECF1FA`. Sobre navy: `#9DBDEB`, `#EAF1FB`.
- Sucesso `#1F9D6B` (bg `#E8F6F0`)
- Cores de modelo (bolinhas): Claude `#E8722E` · GPT `#10A37F` · Gemini `#4285F4` · Grok `#9AA6B6`
- Cores de barra: Claude `#0B3A78` · GPT `#2E6BD6` · Gemini `#7BA0DE` · Grok `#C2C8D2`
- Track de barra `#EEF0F3` · Toggle desligado `#E0E3E9`

**Tipografia**
- UI: **IBM Plex Sans** (400/500/600/700). Números, rótulos técnicos e metadados: **IBM Plex Mono** (400/500).
- Escala usada: 17 (título síntese) · 13.5 (pergunta, ações) · 13 (stance, faixa síntese) · 12.5 (título header, nomes) · 12 (corpo de nav, métricas) · 11.5 (labels de seção) · 10.5 / 10 (rótulos mono, contadores).
- Letter-spacing -.01em em títulos; .06–.07em em labels uppercase.

**Espaçamento / forma**
- Radius: 5px (chips/tags/barras) · 6–8px (botões/pílulas) · 10px (cards). Switch radius 9px.
- Paddings de card 13–14px (compactos), 20–30px (síntese). Gaps 8–15px.
- Sombras: cards do app são flat (só borda 1px); sombra apenas na pílula de aba ativa (`0 1px 2px rgba(0,0,0,.07)`).

## Assets
- `strategy-partners-logo.svg` — logo da marca (wordmark navy + cinza). No claro usar como está; em superfícies escuras aplicar `filter: brightness(0) invert(1)` para versão branca.
- **Ícones**: todos são SVGs de traço inline (stroke 1.5–1.7), estilo line/outline 24×24. Ao portar, usar a biblioteca de ícones do codebase (ex.: lucide) com os equivalentes: message-square, folder, grid, bar-chart, book, plus, download, share/sidebar, file, chevron-left/right, arrow-right.
- **Logos dos modelos**: o protótipo usa bolinhas de cor como stand-in. No produto, usar os ícones reais de cada provedor.

## Files
- `Strategy Partners — Console.dc.html` — protótipo da tela (referência viva; abre no navegador).
- `strategy-partners-logo.svg` — logo.
- `README.md` — este documento.

> Observação para o dev: o `.dc.html` usa estilos inline e um runtime de prototipagem (classe `Component` com `renderVals()`). Trate-o como **especificação visual**, não como arquitetura. Reimplemente como componentes React no padrão do angrahub, com o design system de componentes que o repositório já usa.

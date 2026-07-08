# PLAYGROUND STRATEGY PARTNER — Masterplan (índice)

> Se você chegou aqui porque alguém disse "SIGA O MASTERPLAN": este diretório
> (`docs/planning/`) é autossuficiente. Leia os 5 arquivos abaixo, nessa ordem, e execute.
> Não é preciso nenhum contexto de conversa anterior.

**Título de marca exibido ao usuário: PLAYGROUND STRATEGY PARTNER.** Nomes de pasta/repo
(`angrahub`, `strategy-partners-console`) continuam como identificadores técnicos internos —
nunca trocar esses por "Playground Strategy Partner" em código/paths, só na UI visível ao usuário.

## Arquivos deste diretório

1. [`decisoes.md`](./decisoes.md) — todas as decisões de produto/arquitetura já fechadas. Não
   reabrir nenhuma delas sem confirmação explícita do usuário.
2. [`agentes.md`](./agentes.md) — mapeamento completo dos 5 agentes principais (CAIO, MERKO,
   NOVAE, ASTEN, TYCEN) dentro da frota de 27 agentes já existente em `src/lib/agents.ts`, e como
   os ~22 restantes viram subagentes por categoria.
3. [`base-conhecimento.md`](./base-conhecimento.md) — conteúdo institucional aprofundado (tese da
   firma, equações de valuation/WACC/sinergia) que vira o primeiro documento real ingerido no
   dataroom RAG, e o padrão de qualidade que toda resposta de MERKO/ASTEN/TYCEN precisa atingir.
4. [`fases.md`](./fases.md) — plano de implementação em 8 fases (Fase 0 a 7), cada uma com
   arquivos concretos a criar/editar, dependências, e critério de verificação.
5. Este arquivo (`main.md`) — resumo executivo e contexto de negócio.

## Contexto de negócio

Strategy Partners é uma consultoria boutique de M&A e especialista em IA
(www.strategypartners.com.br). O produto sendo construído é um console único com **5 agentes de
IA principais** apoiados por um **enxame de subagentes especializados**, cobrindo o ciclo
completo de M&A: avaliação pré-deal (due diligence) e implementação pós-deal (PMI — post-merger
integration), com dataroom documental buscável por RAG, admin de usuários com controle de acesso,
log de execução dos agentes, e uma visualização ao vivo do "enxame" de agentes trabalhando em
paralelo num projeto/mandato específico.

## Onde isso vive

Todo o trabalho acontece dentro de `strategy-partners-console/` (este diretório é
`angrahub/strategy-partners-console/docs/planning/` — a raiz do projeto é um nível acima de
`docs/`). Dois outros projetos no mesmo computador (`C:\Users\Alceu Passos\angra\strategy\` e
`C:\Users\Alceu Passos\angra\semantix\`) são **somente leitura** — usados só como referência de
marca/conteúdo (`strategy`) e de padrões de código já validados em produção (`semantix`: schema
Postgres+Drizzle, RBAC, handoff entre agentes, camadas de segurança, dashboard de PMI). **Nunca**
editar esses dois projetos, nunca criar dependência viva entre eles e este console (sem API, sem
banco compartilhado, sem deploy cruzado).

A raiz `angrahub/` (fora de `strategy-partners-console/`) é um fork puro do LobeHub/LobeChat, sem
customização — serve só como referência de padrão arquitetural para o desenho de RAG com
pgvector e conceito de orquestração multi-agente, nunca como base de código a copiar literalmente.

## Estado atual do projeto (antes deste masterplan)

`strategy-partners-console` é um app Next.js 16 / React 19 / Tailwind 4, **stateless hoje**: zero
banco de dados, autenticação via um código diário compartilhado (`sp_access` cookie), sem conceito
de "usuário" ou "projeto" como entidade. Já tem, funcionando: 27 agentes com persona própria
(`src/lib/agents.ts` + `public/personas/PERSONA*.md`), chat streaming via DeepSeek, um modo
"Maestro" com 3 abas (Comparar/Síntese/Timeline) que compara respostas de múltiplos provedores em
paralelo, e um roadmap próprio parcialmente implementado (`plano13.md`, `MULTIMODELO_SETUP.md`).

## Próximo passo imediato

Executar a Fase 0 de [`fases.md`](./fases.md) (segurança) — sem dependências novas, deve ser o
primeiro código a mudar.

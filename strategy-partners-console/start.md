# START — leia isto primeiro

Se o usuário disse **"SIGA O MASTERPLAN"** (ou qualquer variação clara disso), é este o gatilho.
Você é uma sessão nova, sem nenhum contexto da conversa em que este plano foi desenhado — tudo que
você precisa está nos arquivos abaixo. Não peça para o usuário reexplicar nada disso; leia e execute.

## O que fazer, em ordem

1. Leia, nesta ordem, tudo dentro de `docs/planning/`:
   1. [`docs/planning/main.md`](docs/planning/main.md) — contexto de negócio e índice.
   2. [`docs/planning/decisoes.md`](docs/planning/decisoes.md) — decisões já fechadas. **Não
      reabrir nenhuma delas** sem o usuário pedir explicitamente.
   3. [`docs/planning/agentes.md`](docs/planning/agentes.md) — mapeamento dos 5 agentes
      principais (CAIO, MERKO, NOVAE, ASTEN, TYCEN) dentro da frota de 27 já existente.
   4. [`docs/planning/base-conhecimento.md`](docs/planning/base-conhecimento.md) — conteúdo
      institucional/equações que viram o padrão de qualidade das respostas e o seed do RAG.
   5. [`docs/planning/fases.md`](docs/planning/fases.md) — as 8 fases de implementação (Fase 0
      a Fase 7), cada uma com arquivos concretos a criar/editar e critério de verificação.
2. Comece pela **Fase 0** (segurança) em `fases.md`, na ordem em que as fases estão descritas —
   não pule para uma fase depois sem terminar e verificar a anterior. A Fase 1 (reestruturação de
   agentes) é a de maior risco — trate como uma mudança isolada, revisada antes de seguir.
3. Use as skills disponíveis do jeito normal (TDD, verification-before-completion, etc.) — este
   arquivo não substitui esse processo, só aponta o que construir.

## Regras que não mudam, nunca

- **Todo o trabalho acontece dentro de `strategy-partners-console/`** (a pasta onde este arquivo
  está). Não editar nada em `C:\Users\Alceu Passos\angra\strategy\` nem em
  `C:\Users\Alceu Passos\angra\semantix\` — são projetos de **referência somente leitura** (marca
  e conteúdo em `strategy`, padrões de código validados em `semantix`), nunca dependência viva.
  Sem API, banco ou deploy compartilhado entre eles e este projeto.
- O motor puro do LobeHub em `angrahub/src/` (um nível acima deste projeto) também não é tocado —
  serve só como referência conceitual de arquitetura (RAG com pgvector, orquestração multi-agente),
  não como base de código.
- Nome de marca exibido ao usuário: **PLAYGROUND STRATEGY PARTNER**. Nomes de pasta/repo
  (`angrahub`, `strategy-partners-console`) continuam técnicos, não mudam.
- Se algo neste `start.md` parecer contradizer o que está em `docs/planning/`, os arquivos de
  `docs/planning/` são a fonte de verdade — este arquivo é só o ponteiro de entrada.

## Se o usuário disser só "SIGA O MASTERPLAN" sem mais contexto

Não pergunte "qual masterplan?" — é este. Comece direto pela Fase 0.

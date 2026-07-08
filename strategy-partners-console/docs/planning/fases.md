# Plano de implementação por fases

Contexto completo em [`main.md`](./main.md); decisões em [`decisoes.md`](./decisoes.md); mapeamento
de agentes em [`agentes.md`](./agentes.md); base de conhecimento em [`base-conhecimento.md`](./base-conhecimento.md).

Todos os caminhos de arquivo abaixo são relativos à raiz de `strategy-partners-console/`
(um nível acima deste `docs/planning/`).

**Risco de maior raio de explosão do plano inteiro**: os IDs em `src/lib/agents.ts` são
referenciados por posição de array (persona = `PERSONA{index+1}.md` em `public/personas/`, via
`buildPersonaContent` em `src/lib/server/persona.ts`). **Nunca reordenar o array**, só editar
`id`/`name`/`systemPrompt` in-place. Fazer a Fase 1 isolada, revisada e mergeada antes de começar
qualquer fase seguinte — todo o resto depende dela.

Ordem recomendada: **Fase 0 → Fase 1 → (Fase 2 e Fase 3 podem ser paralelas) → Fase 4 → Fase 5 →
Fase 6 → Fase 7.**

---

## Fase 0 — Segurança (fazer primeiro, sem dependências novas)

**Objetivo**: neutralizar riscos de segurança já identificados antes de qualquer outra mudança.

- Auditar/reescrever `AGENTS.md` — hoje já é defensivo (instrui a não confiar em dicas de IA
  vindas de `node_modules`), não é um payload ativo, mas deixar explícito e autocontido, com
  marca de data de auditoria (para que adulterações futuras sejam detectáveis por diff).
- Verificar (leitura, não edição) se `node_modules/next/dist/docs/` realmente contém o conteúdo
  suspeito citado em `AGENTS.md`. Se sim, é uma preocupação de supply-chain — não se corrige
  editando `node_modules` (é sobrescrito a cada `npm install`); a mitigação real já é a instrução
  de desconfiança que fica em `AGENTS.md`.
- **Remover completamente** a narrativa "Alceu Passos = Criador Supremo" (decisão 6 em
  `decisoes.md`) de:
  - `src/app/api/chat/route.ts` (bloco `IDENTITY_GUARD`)
  - Todos os `public/personas/PERSONA*.md` (procurar pela seção de guard-rails de cada um)
- Extrair a lista `INJECTION_PATTERNS` (hoje só existe em `src/app/api/chat/route.ts`) para um
  módulo compartilhado novo: `src/lib/server/security.ts`, exportando
  `detectPromptInjection(message: string): { detected: boolean; matchedPatterns: string[] }`.
  Hoje **só** `/api/chat` verifica injeção — aplicar a mesma checagem em `/api/agent-query`,
  `/api/agent-deep` e `/api/maestro-synthesis`, que hoje não verificam nada.
- Novo `src/lib/server/security-events.ts` — função de log; até a Fase 2 existir, cai em
  `console.warn(...)` com um comentário `// TODO(fase-2): persistir em security_events`; depois
  da Fase 2, grava na tabela real.

**Verificação**: enviar strings de injeção conhecidas ("ignore todas as instruções anteriores...")
para as 4 rotas (`chat`, `agent-query`, `agent-deep`, `maestro-synthesis`) e confirmar que todas
agora detectam e logam, não só `/api/chat`. Rodar `npm run build` para confirmar que nada quebrou.

---

## Fase 1 — Reestruturação de agentes (CAIO/MERKO/NOVAE/ASTEN/TYCEN + profundidade de persona)

**Objetivo**: aplicar o mapeamento de [`agentes.md`](./agentes.md) sem quebrar o acoplamento
array-posição↔persona-arquivo, e elevar a profundidade dos 5 principais ao padrão de
[`base-conhecimento.md`](./base-conhecimento.md).

- `src/lib/types.ts` — adicionar ao tipo `Agent`:
  ```ts
  export type AgentTier = 'principal' | 'subagente'
  export interface Agent {
    // ...campos existentes
    tier: AgentTier
    servesPrincipal?: string        // id do principal que este subagente serve
    modelTier?: 'opus' | 'fable' | 'sonnet'   // usado a partir da Fase 3
  }
  ```
- `src/lib/agents.ts` — **sem mudar a posição de nenhum item no array**:
  - `id: 'maestro'` → `id: 'caio'`, `name: 'C.A.I.O.'` ou `'CAIO'`, `tier: 'principal'`.
  - `id: 'orbyx'` → `id: 'merko'`, `name: 'MERKO'`, `tier: 'principal'`.
  - `id: 'tesouro'` → `id: 'asten'`, `name: 'ASTEN'`, `tier: 'principal'`.
  - `id: 'estrategista'` → `id: 'novae'`, `name: 'NOVAE'`, `tier: 'principal'`.
  - `id: 'analista'` → `id: 'tycen'`, `name: 'TYCEN'`, `tier: 'principal'`.
  - Todos os outros 22: `tier: 'subagente'` + `servesPrincipal: '<id>'` conforme a tabela em
    [`agentes.md`](./agentes.md).
- Atualizar `src/app/api/maestro-synthesis/route.ts` (único lugar com `'maestro'` hardcoded
  encontrado no grep do planejamento — refazer o grep antes de confirmar que é o único).
- `public/personas/PERSONA{N}.md` dos 5 principais (confirmar índice exato lendo `agents.ts`
  atualizado — no momento do planejamento eram PERSONA23=CAIO, PERSONA27=MERKO, PERSONA10=ASTEN,
  PERSONA22=NOVAE, PERSONA20=TYCEN): portar o DNA intelectual completo de
  `C:\Users\Alceu Passos\angra\strategy\{caio,merko,asten,novae,tycen}.md` + o conteúdo de
  [`base-conhecimento.md`](./base-conhecimento.md), mantendo a estrutura de seções que
  `src/lib/personaSections.ts` espera (`splitPersonaText`, delimitador `## NÃO responde`).
  **TYCEN precisa do maior reforço** — hoje é só BI/KPIs, precisa ganhar PMO/execução/turnaround.
- Novo `src/lib/agentTiers.ts`: helpers `getPrincipais()`, `getSubagentsFor(principalId: string)`
  — usados pela Fase 5 (admin) e Fase 6 (modal de swarm).

**Verificação**:
1. `npm run build` — os novos campos obrigatórios (`tier`) em todos os 27 agentes forçam o
   TypeScript a acusar qualquer um esquecido.
2. Consultar manualmente `/api/agent-query` com `agentId=caio|merko|asten|novae|tycen` e conferir
   que a resposta reflete a persona nova (não o prompt genérico de 1 linha antigo).
3. `NavSidebar`, `Inspector` e `/config` mostram os nomes novos; avatares continuam corretos
   (caminho de avatar é por índice, não por id — não deveria quebrar, mas confirmar visualmente).
4. Grep por `orbyx|tesouro|estrategista|analista` (fora de `public/personas/*.md`, que são
   indexados por posição, e fora de `docs/planning/`) não deve retornar nada.

---

## Fase 2 — Fundação de banco de dados + RAG (Postgres + pgvector)

**Objetivo**: dar a este projeto, hoje 100% stateless, uma camada de dados real e independente,
com suporte a RAG.

**Novas dependências**: `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`.

- `drizzle.config.ts` (raiz do projeto) — aponta para um `DATABASE_URL` novo, schema Postgres
  **próprio e isolado** (`pgSchema('strategy_partners')` — nunca usar ou reaproveitar o schema
  `semantix`, mesmo estando na mesma instância de VPS Postgres).
- `src/lib/db/schema.ts` — tabelas mínimas desta fase:
  ```ts
  import { pgSchema, text, timestamp, uuid, integer, customType } from 'drizzle-orm/pg-core'

  export const sp = pgSchema('strategy_partners')

  const vector = customType<{ data: number[]; driverData: string }>({
    dataType() { return 'vector(768)' }, // confirmar dimensão real do modelo de embedding Gemini escolhido
  })

  export const users = sp.table('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // role vem na Fase 5
  })

  export const projects = sp.table('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'pre_deal' | 'pmi' — enum formal na Fase 4
    clientName: text('client_name'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  })

  export const knowledgeBases = sp.table('knowledge_bases', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  })

  export const documents = sp.table('documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    knowledgeBaseId: uuid('knowledge_base_id').references(() => knowledgeBases.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    storedPath: text('stored_path').notNull(),
    status: text('status').notNull().default('pendente'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  })

  export const chunks = sp.table('chunks', {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    embedding: vector('embedding'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  })

  export const securityEvents = sp.table('security_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    projectId: uuid('project_id').references(() => projects.id),
    agentId: text('agent_id'),
    matchedPatterns: text('matched_patterns').notNull(), // JSON-encoded string[]
    userMessage: text('user_message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  })
  ```
- `src/lib/db/index.ts` — cliente Drizzle (`node-postgres` pool).
- `src/lib/rag/ingest.ts` — chunking + chamada de embeddings via **Gemini** (decisão 4 em
  `decisoes.md` — nunca usar serviço de embeddings de terceiro fora dos provedores de LLM já em
  uso no projeto).
- `src/lib/rag/search.ts` — busca híbrida BM25 (texto) + similaridade de cosseno (pgvector). Isso
  é literalmente o que o subagente Anchor (`ancora`, serve CAIO) já promete fazer na sua persona
  — esta fase torna essa promessa real.
- `src/app/api/rag/upload/route.ts`, `src/app/api/rag/search/route.ts` — novas rotas.
- `.env.local` — adicionar `DATABASE_URL=`, `GEMINI_API_KEY=` (se ainda não existir).
- Deploy: **não subir um novo container Postgres** — apontar para a mesma VPS Postgres que já
  hospeda o projeto `semantix`, só com `DATABASE_URL`/schema novo e separado. Atualizar
  `docker-compose.prod.yml` só com a variável de ambiente nova.

**Verificação**:
1. `npx drizzle-kit generate` e depois `push` — conferir no SQL gerado que nada referencia o
   schema `semantix`.
2. Rodar as duas ferramentas contra o Postgres da VPS e confirmar (via `\dn` no psql) que os dois
   schemas (`semantix` e `strategy_partners`) coexistem, independentes.
3. Upload de documento de teste via `/api/rag/upload` → confirmar que chunks + embeddings
   persistem → consulta via `/api/rag/search` retorna o chunk certo por similaridade.
4. Confirmar que `security_events` da Fase 0 agora grava de verdade (trocar o `console.warn` por
   escrita real na tabela).

---

## Fase 3 — Modelos em camada (CAIO=Opus 4.8 / especialistas=Fable 5 / subagentes=Sonnet 5)

**Objetivo**: adicionar o provedor Anthropic e permitir que cada agente rode na camada de modelo
certa, sem tocar no modo Comparar existente (Eixo A, decisão 3 em `decisoes.md`).

**Nova dependência**: `@anthropic-ai/sdk`.

- `src/lib/server/providers/anthropic.ts` — wrapper `callAnthropic(messages, { model, maxTokens })`.
- `src/lib/server/providers/index.ts` — dispatcher `callModel(provider, messages, opts)` (extensão
  do que `MULTIMODELO_SETUP.md` já pedia para os outros provedores).
- `src/lib/modelTiers.ts` — mapa `agentId → modelo Anthropic concreto`:
  ```ts
  export const MODEL_TIER_MAP = {
    caio: '<confirmar id real de Opus 4.8 no momento da implementação>',
    merko: '<confirmar id real de Fable 5>',
    novae: '<confirmar id real de Fable 5>',
    asten: '<confirmar id real de Fable 5>',
    tycen: '<confirmar id real de Fable 5>',
    // subagentes (tier === 'subagente') usam Sonnet 5 por padrão
  }
  ```
  **Não fixar um ID de modelo chutado** — confirmar os identificadores reais de Opus 4.8/Fable 5/
  Sonnet 5 na documentação/API da Anthropic no momento em que esta fase for implementada.
- `src/app/api/agent-query/route.ts`, `agent-deep/route.ts`, `maestro-synthesis/route.ts` —
  branch condicionado a uma env var `USE_ANTHROPIC_TIERS` (desligada por padrão): quando ligada,
  usar `MODEL_TIER_MAP`; quando desligada, comportamento idêntico ao atual (DeepSeek).
- `.env.local`/`.env.production` — adicionar `ANTHROPIC_API_KEY=`.
- `docker-compose.prod.yml` — adicionar `ANTHROPIC_API_KEY` ao bloco `environment:`.

**Explicitamente intocado**: `src/lib/models.ts` (`INITIAL_MODELS`) e o fluxo do modo Comparar em
`src/app/page.tsx`/`ComparareView.tsx` — continuam sendo o Eixo A (comparação DeepSeek/Gemini/Groq),
que é ortogonal a este Eixo B.

**Verificação**:
1. Com a flag desligada (padrão): regressão completa confirma que nada mudou no comportamento
   atual.
2. Com a flag ligada: `/api/agent-query?agentId=asten` responde via Anthropic camada Fable, e a
   resposta inclui metadado de qual modelo respondeu de fato (campo `model` já existe no formato
   de resposta de `agent-query`).
3. Confirmar que um subagente (ex.: `contabil`) responde na camada Sonnet.

---

## Fase 4 — Entidade "projeto" + módulos de M&A (due diligence pré-deal + PMI pós-deal)

**Objetivo**: tornar "projeto/mandato" uma entidade de primeira classe (multi-tenant dentro da
firma — diferente do `semantix`, que é hardcoded para um único cliente), e construir os dois
módulos de workflow em cima dela.

**Extensão do schema da Fase 2** (`src/lib/db/schema.ts`):
```ts
// Pré-deal / due diligence
export const ddChecklistItems = sp.table('dd_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  item: text('item').notNull(),
  status: text('status').notNull().default('pendente'), // pendente | em_analise | concluido | red_flag
  documentId: uuid('document_id').references(() => documents.id),
  notes: text('notes'),
})

export const redFlags = sp.table('red_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull(), // baixa | media | alta | critica
  sourceDocumentId: uuid('source_document_id').references(() => documents.id),
  detectedByAgentId: text('detected_by_agent_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const valuationEstimates = sp.table('valuation_estimates', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  method: text('method').notNull(), // dcf | ev_ebitda | precedente
  low: text('low'), base: text('base'), high: text('high'), // usar numeric() real na implementação
  assumptions: text('assumptions'), // JSON-encoded
})

// Pós-deal / PMI — generalização das tabelas do semantix, agora com projectId
export const talentRisks = sp.table('talent_risks', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }) /* ... demais campos, ver semantix como referência de forma */ })
export const legacyAccounts = sp.table('legacy_accounts', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }) /* ... */ })
export const synergies = sp.table('synergies', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }) /* ... */ })
export const milestones = sp.table('milestones', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }) /* plano 100 dias */ })
export const pmiRisks = sp.table('pmi_risks', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }) /* ... */ })
```
A diferença chave vs. `semantix`: **toda tabela de PMI ganha `projectId`**, transformando o
padrão single-tenant do `semantix` num schema multi-projeto real.

**Novas páginas/rotas**:
- `src/app/projetos/[id]/page.tsx` — shell de detalhe do projeto.
- `src/app/projetos/[id]/due-diligence/page.tsx` — checklist por categoria, feed de red flags,
  visão de triangulação de valuation (bandas baixo/base/alto).
- `src/app/projetos/[id]/pmi/page.tsx` (+ sub-rotas talentos/clientes-legado/sinergias/
  plano-100-dias/riscos) — inspirar o layout de gráfico/KPI em
  `C:\Users\Alceu Passos\angra\semantix\src\app\dashboard\*` (padrão visual de referência, nunca
  copiar arquivo — os dois projetos têm design systems diferentes).
- `src/lib/db/queries/{projects,due-diligence,pmi}.ts` — módulos de query Drizzle.
- `src/app/api/projects/route.ts`, `src/app/api/projects/[id]/route.ts` — CRUD.

**Modificar**: `src/app/projetos/page.tsx` — trocar o array mock `PROJECTS` por uma query real
(`getProjects()`), e adicionar fluxo de "Novo Projeto" com `type: 'pre_deal' | 'pmi'`.

**Verificação**:
1. Criar dois projetos distintos (um `pre_deal`, um `pmi`) e confirmar que os dados não vazam
   entre eles.
2. Red flag detectado por um subagente (ex.: Diligence, serve MERKO) grava `detectedByAgentId`.
3. Visão de triangulação de valuation renderiza corretamente bandas baixo/base/alto para pelo
   menos DCF + EV/EBITDA + transações precedentes.

---

## Fase 5 — Admin + RBAC + log de execução

**Objetivo**: substituir o código diário compartilhado por login real com papéis, e um painel de
administração genuinamente funcional (não um stub).

**Novas dependências**: `next-auth`, `bcryptjs`.

**Extensão do schema**:
```ts
export const userRole = sp.enum('user_role', ['admin', 'partner', 'analyst', 'client_viewer'])
// adicionar coluna role à tabela users da Fase 2

export const executionLogs = sp.table('execution_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  projectId: uuid('project_id').references(() => projects.id),
  agentId: text('agent_id').notNull(),
  route: text('route').notNull(),
  question: text('question').notNull(),
  responsePreview: text('response_preview'),
  modelUsed: text('model_used'),
  durationMs: integer('duration_ms'),
  confidence: integer('confidence'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- `src/middleware.ts` — substitui a checagem do cookie `sp_access` (código diário) por checagem
  de sessão NextAuth. **Transição suave** (decisão 7): manter os dois sistemas atrás de uma flag
  (`LEGACY_DAILY_CODE_AUTH`) até que todos os usuários reais estejam migrados; corte final só
  depois disso.
- `src/app/login/page.tsx` — estender para email+senha (NextAuth Credentials), preservando o
  visual atual (dark-glass), só trocando os campos do formulário.
- `src/app/api/auth/[...nextauth]/route.ts` — novo.
- `src/lib/auth/rbac.ts` — utilitário `requireRole(role, allowed[])` (padrão genérico, sem lógica
  específica de negócio — pode ser portado quase verbatim do padrão usado no projeto `semantix`).
- `src/app/admin/page.tsx` — shell com abas: **Usuários**, **Log de Execução**, **Eventos de
  Segurança**.
- `src/app/admin/users/page.tsx` — CRUD real de usuários (criar/convidar, definir papel,
  desativar) — grava no banco de verdade, não mock.
- `src/app/admin/logs/page.tsx` — tabela/filtro sobre `execution_logs` (por projeto/agente/
  usuário/data).
- `src/app/admin/security/page.tsx` — tabela sobre `security_events` (a Fase 0 ganha UI aqui).
- `src/app/api/admin/users/route.ts`, `src/app/api/admin/logs/route.ts` — protegidos por
  `requireRole(session.user.role, ['admin'])`.
- `src/components/NavSidebar.tsx` — item "Admin" visível só quando `session.user.role === 'admin'`.
- Instrumentar toda rota que chama agente (`agent-query`, `agent-deep`, `chat`,
  `maestro-synthesis`) com uma chamada a `logExecution(...)` depois que a resposta resolve.

**Verificação**:
1. Semear um usuário `admin`, logar via `/login` novo, confirmar acesso a `/admin`.
2. Logar como `analyst`/`client_viewer`, confirmar bloqueio real de `/admin` (RBAC de verdade, não
   só escondido no menu).
3. Rodar uma consulta pela UI principal, confirmar linha correspondente em `/admin/logs`.
4. Disparar uma string de injeção, confirmar que aparece em `/admin/security`.
5. Confirmar que o fluxo de código diário legado está claramente documentado como fallback
   temporário — nunca deixar dois sistemas de auth "definitivos" ativos ao mesmo tempo sem essa
   documentação.

---

## Fase 6 — Modal de swarm por projeto

**Objetivo**: quando a pergunta se referir a um projeto específico, abrir um modal com grafo ao
vivo da atividade dos agentes naquele projeto — evoluindo a infraestrutura já existente do modo
Maestro, não recriando um sistema paralelo (decisão 10 em `decisoes.md`).

**Reaproveitar (não recriar)**:
- `ComparareView.tsx` — painel de confiança por agente (já mostra "quem está ativo, com que
  confiança").
- `TimelineView.tsx` — barras de execução paralela (já é ~80% de "gráfico de atividade ao vivo").
- `SinteseView.tsx` — avatares de quem contribuiu para a síntese.
- O estado já existente em `src/app/page.tsx` (`agentTexts`, `agentLoading`, `agentConf`,
  `participatingIds`, `agentTimings`) já é o modelo de dados certo — só falta uma nova superfície
  de renderização (modal), não um novo sistema de estado.

**Novo**:
- `src/lib/server/project-intent.ts` — classificador pergunta→projeto (mesmo padrão de
  `src/app/api/agent-selection/route.ts`: uma chamada de LLM com system prompt retornando JSON).
- `src/app/api/project-intent/route.ts`.
- `src/components/SwarmModal.tsx` — cabeçalho "constelação" (CAIO no centro, principal(is) e
  subagentes envolvidos ao redor, usando `getSubagentsFor()` de `agentTiers.ts` da Fase 1) +
  reaproveitamento de `ComparareView`/`TimelineView`, escopados a `participatingIds` do projeto.
- Em `src/components/ComparareView.tsx`: exportar `FleetChartsPanel` (hoje privado do módulo)
  para que `SwarmModal.tsx` possa reusar em vez de reimplementar.

**Modificar**: `src/app/page.tsx` — depois que a seleção de agentes resolve, chamar
`/api/project-intent`; se retornar um `projectId`, abrir `<SwarmModal projectId={...} />`
alimentado pelo mesmo estado já em uso pelo modo Comparar.

**Verificação**:
1. Pergunta genérica ("qual um bom framework de WACC") → sem modal, comportamento atual mantido.
2. Pergunta citando um projeto existente pelo nome → modal abre, mostra só os agentes relevantes
   (principal + seus subagentes), atualiza ao vivo conforme respostas chegam.
3. Fechar o modal não perde o estado do modo Comparar por trás — mesma fonte de verdade, duas
   visualizações.

---

## Fase 7 — HeroUI (escopado) + navegação completa

**Objetivo**: introduzir HeroUI só onde acelera de verdade, sem reescrever o design existente, e
garantir que todas as rotas novas das fases anteriores estejam navegáveis.

- **Não** envolver o app inteiro no tema do HeroUI — o design atual (Tailwind 4 + variáveis CSS
  customizadas, visível em `ComparareView.tsx`/`Inspector.tsx`) já funciona e tem identidade
  própria.
- Introduzir HeroUI **só** nas telas novas e pesadas em dados das Fases 4-5: `/admin/users`
  (tabela + formulários em modal), `/admin/logs` (tabela com filtros), `/projetos/[id]/
  due-diligence` (checklist/acordeões) — onde `Table`/`Modal`/`Select` do HeroUI aceleram de
  verdade.
- **Risco real a validar antes de comprometer tempo**: este projeto usa Tailwind 4 com config
  CSS-first (`@theme` em `globals.css`, sem `tailwind.config.ts`). Confirmar suporte oficial do
  HeroUI a esse modelo de configuração antes de seguir — se a compatibilidade for imatura, usar
  Radix como fallback (já é dependência do projeto via `@radix-ui/react-switch`, adicionado em
  `plano13.md`).
- `src/app/admin/layout.tsx` (novo) — provider do HeroUI escopado só a `/admin`.
- `src/components/NavSidebar.tsx` — estender o array de itens de navegação existente com todas as
  rotas novas: Projetos (com badge pré-deal/PMI), Admin (visível só para role admin), busca do
  Dataroom/RAG, Config (já existe) — aditivo à estrutura já existente, não redesenho.
- `src/lib/i18n.ts` — adicionar chaves de tradução PT/EN para os novos rótulos de navegação.

**Verificação**:
1. Regressão visual zero nas rotas antigas (`/`, `/chat`, `/modelos`, `/conhecimento`, `/config`).
2. Rotas `/admin/*` renderizam componentes HeroUI com tema mapeado à paleta da marca (não o tema
   padrão do HeroUI).
3. Clique-through completo: todas as rotas novas de Fases 4-5 acessíveis a partir do
   `NavSidebar`, sem links mortos.

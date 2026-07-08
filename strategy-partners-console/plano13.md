# Plano — Config de Frota (/config) + Rename de Agentes + Correção /land

## Contexto

O **Strategy Partners Console** (`angrahub/strategy-partners-console`) roda uma frota de 27 agentes (DeepSeek) definidos estaticamente em `src/lib/agents.ts`. Hoje:

- `NavSidebar.tsx` sempre mostra os 27 agentes, sem filtro real.
- `Inspector.tsx` (painel direito) tem toggles de "ativo/inativo", mas esse estado é local ao `page.tsx`, **não persiste** (reseta a cada reload) e **não afeta** o `NavSidebar` — só controla quem participa da consulta multi-agente do Maestro naquele momento.
- O campo `Agent.active` (8 dos 27 marcados `false`) não filtra nada hoje — é só um badge cosmético "online/offline".
- Não existe rota `/config`, nem biblioteca de UI (sem Radix/shadcn/zustand), só Tailwind + `lucide-react` + `motion`.
- O único padrão de "configuração global persistida" já existente é `src/lib/lang.tsx` (Context + localStorage), que vamos replicar.

O usuário quer transformar isso em um sistema real de dois níveis:
1. **`/config`** — liga/desliga permanentemente quem faz parte da frota visível (ex.: desligar 22 e sobrar só 5), com card descritivo de cada persona, e agora também **renomear** o nome exibido de cada agente.
2. **Inspector (barra direita)** — deixa de mostrar os 27 e passa a controlar apenas quem, dentre os habilitados no `/config`, participa da consulta atual.
3. **NavSidebar** — só lista os agentes habilitados.
4. Além disso, corrigir uma inconsistência de conteúdo real encontrada no `/land` (landing pública): as seções "Programação" e "Conhecimento & Operação" prometem capacidades no subtítulo (DevOps, BI, Maestro) sem nenhum exemplo real correspondente.
5. UX pode justificar novas libs pequenas (Radix primitivos), já que não há UI kit hoje.

**Decisões já confirmadas com o usuário:**
- Estado inicial do `/config`: todos os 27 agentes **habilitados por padrão** (o `active:false` atual de 8 agentes é ignorado/lixo histórico).
- Correção do `/land`: escopo mínimo — só preencher as lacunas reais (DevOps/Pipeline, BI/Metrics, Maestro), sem redesenhar a página.
- Rename de agentes no `/config`: **cosmético apenas** — troca o rótulo exibido em toda a UI (sidebar, inspector, chat, cards), mas **não** muda como o agente se identifica nas respostas (não mexe em `systemPrompt` nem nas rotas de API — evita conflito com os guard rails de identidade dos PERSONA*.md).

## Mudanças no data model

**Nenhuma mudança em `src/lib/types.ts`/`Agent`.** `agent.role` + `agent.specs` (já escritos no mesmo tom das personas) são suficientes para o card descritivo do `/config` — não vale a pena parsear os 27 `PERSONA*.md` em runtime.

## B. Novo `AgentConfigProvider` / `useAgentConfig`

**Novo arquivo: `src/lib/agent-config.tsx`** — mesmo padrão de `src/lib/lang.tsx` (Context + `useEffect` para ler `localStorage` só no client, valor default determinístico para não quebrar SSR).

Uma única chave de storage, um único objeto:

```ts
const STORAGE_KEY = 'sp-agent-config'
// shape persistido: { enabled: string[]; names: Record<string, string> }

interface AgentConfigCtx {
  isEnabled: (id: string) => boolean
  toggleAgent: (id: string) => void
  enableAll: () => void
  disableAll: () => void
  enabledAgents: Agent[]
  enabledCount: number
  getDisplayName: (id: string) => string
  setAgentName: (id: string, name: string) => void
  resetAgentName: (id: string) => void
  hydrated: boolean
}
```

- Default: `enabled = AGENTS.map(a => a.id)` (todos os 27 ligados), `names = {}`.
- `useEffect` de mount: lê `localStorage['sp-agent-config']`, valida ids órfãos, aplica.
- `enabledAgents = useMemo(() => AGENTS.filter(a => enabled.has(a.id)), [enabled])`.

## C. Nova rota `/config`

**Novo arquivo: `src/app/config/page.tsx`**, layout de `src/app/modelos/page.tsx`.

- Header: título + `{enabledCount}/27`, busca, "Habilitar todos"/"Desligar todos".
- Corpo: `CATEGORY_ORDER` × `AGENTS_BY_CATEGORY`, grid de `AgentConfigCard`.
- Rename inline com botão "restaurar padrão".
- Novas deps: `@radix-ui/react-switch`, `@radix-ui/react-tabs`.
- `src/components/ui/Switch.tsx` compartilhado com `Inspector.tsx`.
- i18n novas chaves, nav entry para `/config`.

## D. `Inspector.tsx`

- `page.tsx` semeia `models` a partir de `enabledAgents`. Inspector continua presentacional.
- Pill manual → `Switch` compartilhado.
- Nomes via `getDisplayName(model.id)`.

## E. `NavSidebar.tsx`

- Filtra `AGENTS_BY_CATEGORY[cat]` por `isEnabled`.
- Esconde categoria vazia.
- Nome via `getDisplayName`.
- Remove badge cosmético online/offline.

## F. `page.tsx`

- `enabledAgents` → `models` (reconciliado preservando `on`) → `activeModels`.
- `AgentSelectionModal allAgents` continua com metadata lookups seguros.
- Nomes via `getDisplayName`.

## G. `Providers.tsx`

```tsx
export function Providers({ children }) {
  return (
    <LangProvider>
      <AgentConfigProvider>{children}</AgentConfigProvider>
    </LangProvider>
  )
}
```

## Rename — propagação de `getDisplayName()`

**Trocar:** `NavSidebar.tsx`, `Inspector.tsx`, `page.tsx`, `AgentSelectionModal.tsx`, `ComparareView.tsx`, `TimelineView.tsx`, `SinteseView.tsx`, `BrisaChat.tsx`, `modelos/page.tsx`, `conhecimento/page.tsx`, `relatorios/page.tsx`, `projetos/page.tsx`.

**Não tocar:** `api/agent-selection/route.ts`, `api/agent-query/route.ts` (identidade real do agente nas respostas continua com nome original).

## H. `public/land/land.html`

1. Programação: 4º card real para Pipeline/DevOps.
2. Conhecimento: 2 cards reais para Metrics/BI e Maestro.
3. CSS `.example-strip` → `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`.

## I. Deploy

Fluxo VPS Docker existente, sem mudanças: tarball → scp → ssh docker build → swap `strategy-console` em `angrahub_default:3212`.

## Verificação

1. Dev server sem erros de tipo.
2. `/config` default 27/27.
3. Desligar ~22 → NavSidebar/Inspector refletem ~5, categorias vazias somem.
4. Reload persiste (`sp-agent-config`).
5. Rename cosmético não muda identidade nas respostas.
6. Reabilitar funciona, eixos Inspector/config independentes.
7. Id órfão no localStorage não quebra.
8. `/land` sem células vazias nas 2 seções corrigidas; demais idênticas.

**Fora de escopo (avisar):** `relatorios/page.tsx` e `modelos/page.tsx` ainda calculam "ativos" via `AGENTS.filter(a => a.active)` — vai divergir do `/config` real; considerar fast-follow.

## Arquivos principais

- `src/lib/agent-config.tsx` (novo)
- `src/app/config/page.tsx` (novo)
- `src/components/AgentConfigCard.tsx` (novo)
- `src/components/ui/Switch.tsx` (novo)
- `src/components/NavSidebar.tsx`
- `src/components/Inspector.tsx`
- `src/app/page.tsx`
- `src/components/Providers.tsx`
- `src/lib/i18n.ts`
- `public/land/land.html`
- `AgentSelectionModal.tsx`, `ComparareView.tsx`, `TimelineView.tsx`, `SinteseView.tsx`, `BrisaChat.tsx`, `modelos/page.tsx`, `conhecimento/page.tsx`, `relatorios/page.tsx`, `projetos/page.tsx`
- `package.json` (+ `@radix-ui/react-switch`, `@radix-ui/react-tabs`)

## Nota de segurança

`strategy-partners-console/AGENTS.md` instrui agentes de IA a ler `node_modules/next/dist/docs/` antes de codar, e esse diretório contém um comentário endereçado a "AI agents" citando uma API (`unstable_instant`) que não corresponde a nada real conhecido do Next.js — padrão de prompt injection encadeada. Não foi seguido. Confirmar origem antes de confiar nesse arquivo futuramente.

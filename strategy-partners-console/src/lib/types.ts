export type Tab = 'comparar' | 'sintese' | 'timeline'

export interface Model {
  id: string
  name: string
  dot: string
  barColor: string
  stance: string
  text: string
  conf: number
  dur: number
  on: boolean
}

export type AgentCategory =
  | 'chat'
  | 'vendas'
  | 'segurança'
  | 'financeiro'
  | 'programação'
  | 'conhecimento'

export type ModelBackend = 'deepseek' | 'api'

// Two-tier fleet structure (Masterplan Fase 1): 5 "principais" (CAIO/MERKO/NOVAE/ASTEN/TYCEN)
// orchestrate the remaining agents, which become "subagentes" serving one principal.
export type AgentTier = 'principal' | 'subagente'

// Semantic Anthropic model tier per agent (wired to concrete model IDs in Fase 3).
export type ModelTier = 'opus' | 'fable' | 'sonnet'

export interface VerifyResult {
  verdict: 'verified' | 'review' | 'flagged'
  score: number
  issues: string[]
  unavailable?: boolean // true quando a verificação falhou/indisponível → não exibir badge falso
}

export interface VerifyState extends VerifyResult {
  loading: boolean
}

export interface AgentSelectionResult {
  selected: string[]
  excluded: { id: string; reason: string }[]
}

export interface Agent {
  id: string
  name: string
  role: string
  category: AgentCategory
  backend: ModelBackend
  modelAlias: string     // nome próprio angra.xx1 — exibido na UI
  systemPrompt: string
  dot: string
  barColor: string
  active: boolean
  avatar: string
  specs?: string[]       // 4 capability bullet points shown in sidebar
  tier: AgentTier                 // 'principal' | 'subagente' — required so TS flags any agent left unclassified
  servesPrincipal?: string        // id of the principal this subagent serves (undefined for principais)
  modelTier?: ModelTier           // Anthropic tier (used from Fase 3)
}

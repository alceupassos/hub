import 'server-only'

// ─────────────────────────────────────────────────────────────────────────────
// Modelo de custo/esforço da execução (X1). Espelha a arquitetura de confidence.ts:
// uma função determinística, única fonte de verdade, persistida em execution_logs —
// nunca um número inventado (o Inspector antes usava Math.random, falha de integridade).
//
// Semântica DUPLA (decisão do usuário): cada execução reporta
//   (a) CUSTO DE COMPUTE — o que a IA custou de processamento (barato, em US$/R$); e
//   (b) ESFORÇO EQUIVALENTE — quantas horas de analista/consultor a tarefa
//       representaria e o R$ dessas horas (caro). O contraste é o argumento de valor.
//
// Modo HÍBRIDO: usa tokens REAIS da API quando disponíveis (resp.usage); na ausência
// (modo demo / streaming), estima de forma transparente por tipo de tarefa × tier.
// ─────────────────────────────────────────────────────────────────────────────

export type TaskType =
  | 'chat'         // pergunta rápida / triagem
  | 'analysis'     // análise estruturada de um agente
  | 'modeling'     // valuation/LBO/DCF (intenção de modelagem)
  | 'diligence'    // varredura de dataroom / red flags
  | 'synthesis'    // síntese multi-agente (orquestrador)
  | 'deepdive'     // aprofundamento (agent-deep)

export type Tier = 'opus' | 'fable' | 'sonnet'

// Preço de compute por 1K tokens de saída (US$), mascarado como "angra.*" — números de
// ordem de grandeza realista por tier (opus > fable > sonnet). Ajustável por env.
const TIER_PRICE_PER_1K: Record<Tier, number> = {
  opus: 0.075,
  fable: 0.030,
  sonnet: 0.012,
}

// Peso de esforço por tipo de tarefa: quanto trabalho humano a tarefa condensa.
// tokens-base estimados (saída) e HORAS de analista equivalentes por tipo.
const TASK_PROFILE: Record<TaskType, { baseTokens: number; analystHours: number; label: string; labelEn: string }> = {
  chat:      { baseTokens: 700,  analystHours: 0.3, label: 'Conversa rápida',           labelEn: 'Quick chat' },
  analysis:  { baseTokens: 2200, analystHours: 3,   label: 'Análise estruturada',       labelEn: 'Structured analysis' },
  modeling:  { baseTokens: 3200, analystHours: 8,   label: 'Modelagem financeira',      labelEn: 'Financial modeling' },
  diligence: { baseTokens: 4500, analystHours: 16,  label: 'Varredura de diligence',    labelEn: 'Diligence sweep' },
  synthesis: { baseTokens: 5200, analystHours: 12,  label: 'Síntese multi-agente',      labelEn: 'Multi-agent synthesis' },
  deepdive:  { baseTokens: 3800, analystHours: 6,   label: 'Aprofundamento',            labelEn: 'Deep dive' },
}

// Taxa horária carregada de analista/consultor (R$/h) e câmbio — para o esforço equivalente.
const ANALYST_HOURLY_BRL = 450
const USD_BRL = 5.4

export interface CostInput {
  taskType: TaskType
  tier: Tier
  /** Tokens de saída REAIS (resp.usage.output_tokens), se disponíveis. */
  realOutputTokens?: number | null
  /** Tokens de entrada REAIS, se disponíveis. */
  realInputTokens?: number | null
  /** Nº de agentes que participaram (síntese multi-agente escala com isto). */
  agentCount?: number
  /** Latência real em ms, se medida. */
  durationMs?: number | null
}

export interface CostResult {
  taskType: TaskType
  taskLabel: string
  taskLabelEn: string
  tier: Tier
  tokens: number            // saída (real ou estimada)
  tokensEstimated: boolean  // true = estimado (sem uso real da API)
  computeCostUsd: number    // custo de IA (barato)
  computeCostBrl: number
  analystHoursEquivalent: number // esforço humano equivalente (caro)
  analystCostBrl: number
  savingsBrl: number        // esforço humano − compute (o valor entregue)
  savingsMultiple: number   // quantas vezes mais barato que o humano
  durationMs: number | null
}

/** Mapeia rota + sinais para o tipo de tarefa (reusa needsReasoning/detectModelingIntent do caller). */
export function classifyTask(opts: { route: string; modeling?: boolean; needsReasoning?: boolean }): TaskType {
  const r = opts.route
  if (r.includes('maestro-synthesis')) return 'synthesis'
  if (r.includes('agent-deep')) return 'deepdive'
  if (r.includes('diligence')) return 'diligence'
  if (opts.modeling) return 'modeling'
  if (r.includes('agent-query')) return opts.needsReasoning ? 'analysis' : 'chat'
  if (r.includes('chat')) return opts.needsReasoning ? 'analysis' : 'chat'
  return 'analysis'
}

export function estimateCost(i: CostInput): CostResult {
  const profile = TASK_PROFILE[i.taskType]
  const agentMult = i.taskType === 'synthesis' ? Math.max(1, i.agentCount ?? 1) : 1

  // Tokens: reais quando houver; senão estimativa por perfil × multiplicador de agentes.
  const estimated = i.realOutputTokens == null
  const tokens = estimated ? Math.round(profile.baseTokens * agentMult) : Math.round(i.realOutputTokens!)
  const inputTokens = i.realInputTokens ?? Math.round(tokens * 0.4)

  // Custo de compute: entrada custa ~25% da saída (aproximação de mesa).
  const pricePer1k = TIER_PRICE_PER_1K[i.tier]
  const computeCostUsd = (tokens / 1000) * pricePer1k + (inputTokens / 1000) * pricePer1k * 0.25
  const computeCostBrl = computeCostUsd * USD_BRL

  // Esforço equivalente humano.
  const analystHours = profile.analystHours * agentMult
  const analystCostBrl = analystHours * ANALYST_HOURLY_BRL

  const savingsBrl = analystCostBrl - computeCostBrl
  const savingsMultiple = computeCostBrl > 0 ? analystCostBrl / computeCostBrl : 0

  return {
    taskType: i.taskType,
    taskLabel: profile.label,
    taskLabelEn: profile.labelEn,
    tier: i.tier,
    tokens,
    tokensEstimated: estimated,
    computeCostUsd,
    computeCostBrl,
    analystHoursEquivalent: analystHours,
    analystCostBrl,
    savingsBrl,
    savingsMultiple,
    durationMs: i.durationMs ?? null,
  }
}

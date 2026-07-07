import 'server-only'
import { AGENTS } from '@/lib/agents'
import { parseJsonFromModel, runModel } from '@/lib/server/run-model'
import type { DealRecommendation } from '@/lib/db/schema'
import type { ExtractedMetrics } from './extract'

// AI deal scoring 0-100 contra uma tese + recomendação go/no-go (bloco 2 do pedido).
export interface ScoreBreakdownItem {
  criterion: string
  weight: number
  score: number
  note: string
}
export interface ScoreResult {
  score: number
  breakdown: ScoreBreakdownItem[]
  recommendation: DealRecommendation
  rationale: string
  model: string
}

export interface ScoreDealInput {
  dealName: string
  metrics?: ExtractedMetrics | null
  thesis?: { name: string; description?: string | null; criteria?: string | null } | null
  extraContext?: string | null
}

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}

export async function scoreDeal(input: ScoreDealInput): Promise<ScoreResult> {
  const caio = AGENTS.find(a => a.id === 'caio')
  const thesisBlock = input.thesis
    ? `Tese de investimento: ${input.thesis.name}. ${input.thesis.description ?? ''}\nCritérios: ${input.thesis.criteria ?? '(livres)'}`
    : 'Sem tese específica — avalie fundamentos gerais de M&A/venture.'
  const system =
    'Você é o comitê de investimento pontuando um deal contra uma tese. Considere: fit com a tese, qualidade/crescimento ' +
    'das métricas, risco, qualidade da documentação e legitimidade aparente. Devolva SOMENTE JSON válido com as chaves: ' +
    'score (número inteiro 0-100), recommendation ("go" | "no_go" | "watch"), rationale (string, 2-4 frases), ' +
    'breakdown (array de { criterion, weight (0-1), score (0-100), note }). Seja disciplinado: sem premissas, score baixo.'
  const user = `${thesisBlock}\n\nDeal: ${input.dealName}\nMétricas: ${JSON.stringify(input.metrics ?? {})}\n${input.extraContext ?? ''}`

  const { text, model } = await runModel({ system, user, agent: caio, maxTokens: 900 })
  const parsed = parseJsonFromModel<Partial<ScoreResult>>(text)
  const rec = parsed?.recommendation
  return {
    score: clampScore(parsed?.score),
    breakdown: Array.isArray(parsed?.breakdown) ? (parsed!.breakdown as ScoreBreakdownItem[]) : [],
    recommendation: rec === 'go' || rec === 'no_go' ? rec : 'watch',
    rationale: parsed?.rationale ?? '',
    model,
  }
}

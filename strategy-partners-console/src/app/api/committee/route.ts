import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/rbac'
import { IDENTITY_GUARD, detectPromptInjection } from '@/lib/server/security'
import { logSecurityEvent } from '@/lib/server/security-events'
import { logExecution } from '@/lib/server/execution-log'
import { maskModel } from '@/lib/modelMask'
import { deliberate } from '@/lib/server/committee'
import { classifyTask, estimateCost, type CostResult } from '@/lib/server/costModel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function costPayload(c: CostResult, lang: 'pt' | 'en') {
  return {
    computeCostUsd: c.computeCostUsd, computeCostBrl: c.computeCostBrl,
    analystHoursEquivalent: c.analystHoursEquivalent, analystCostBrl: c.analystCostBrl,
    savingsMultiple: c.savingsMultiple, taskLabel: lang === 'en' ? c.taskLabelEn : c.taskLabel, tokens: c.tokens,
  }
}

// Sala de Comitê (Y1): delibera um mandato entre os 5 principais e devolve a sessão estruturada.
export async function POST(req: NextRequest) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst', 'client_viewer'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })

  const { mandate, lang = 'pt' } = (await req.json()) as { mandate?: string; lang?: 'pt' | 'en' }
  if (typeof mandate !== 'string' || !mandate.trim()) {
    return Response.json({ error: lang === 'en' ? 'Mandate is required.' : 'O mandato é obrigatório.' }, { status: 400 })
  }

  const injection = detectPromptInjection(mandate)
  if (injection.detected) {
    void logSecurityEvent({ route: 'api/committee', agentId: 'caio', matchedPatterns: injection.matchedPatterns, userMessage: mandate })
    return Response.json({ error: IDENTITY_GUARD ? (lang === 'en' ? 'Request rejected.' : 'Solicitação rejeitada.') : '' }, { status: 400 })
  }

  try {
    const result = await deliberate(mandate, lang)
    const cost = estimateCost({ taskType: classifyTask({ route: 'api/maestro-synthesis' }), tier: 'opus', agentCount: 4 })
    void logExecution({
      agentId: 'caio', route: 'api/committee', question: mandate,
      responsePreview: result.decisionHeadline, modelUsed: result.model,
      taskType: 'synthesis', tokensOutput: cost.tokens, costBrl: cost.computeCostBrl, analystHoursEq: cost.analystHoursEquivalent,
    })
    return Response.json({ ...result, model: maskModel(result.model), cost: costPayload(cost, lang) })
  } catch (err) {
    console.error('[api/committee] erro:', err)
    return Response.json({ error: lang === 'en' ? 'Committee deliberation unavailable. Try again shortly.' : 'Deliberação do comitê indisponível. Tente novamente em instantes.' }, { status: 502 })
  }
}

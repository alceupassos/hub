import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/rbac'
import { AGENTS } from '@/lib/agents'
import { detectPromptInjection } from '@/lib/server/security'
import { logSecurityEvent } from '@/lib/server/security-events'
import { logExecution } from '@/lib/server/execution-log'
import { maskModel } from '@/lib/modelMask'
import { runModel } from '@/lib/server/run-model'
import { buildGrounding } from '@/lib/server/grounding'
import { classifyTask, estimateCost } from '@/lib/server/costModel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Red-team (Y3): o advogado do diabo ATACA a tese — busca o furo, o viés, o risco
// negligenciado. Aumenta a credibilidade da recomendação ao expor o que a derruba.
const REDTEAM_ROLE = {
  pt: `Você é o RED-TEAM (advogado do diabo) da Strategy Partners. Sua missão é ATACAR a tese abaixo
sem piedade: encontre a premissa mais frágil, o viés de confirmação, o risco negligenciado, o cenário
que destrói o valor. NÃO seja equilibrado — seu papel é achar o furo. Ao final, aponte a ÚNICA coisa
que, se verdadeira, mataria o deal. Estruture em: (1) Premissa mais frágil, (2) O que estão ignorando,
(3) Cenário de destruição de valor, (4) Pergunta-teste que o comitê deveria exigir a resposta.`,
  en: `You are Strategy Partners' RED TEAM (devil's advocate). Your mission is to ATTACK the thesis below
without mercy: find the weakest assumption, the confirmation bias, the overlooked risk, the scenario that
destroys value. Do NOT be balanced — your job is to find the hole. End with the SINGLE thing that, if true,
would kill the deal. Structure as: (1) Weakest assumption, (2) What they're ignoring, (3) Value-destruction
scenario, (4) Test question the committee should demand an answer to.`,
}

export async function POST(req: NextRequest) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst', 'client_viewer'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })

  const { thesis, lang = 'pt' } = (await req.json()) as { thesis?: string; lang?: 'pt' | 'en' }
  if (typeof thesis !== 'string' || !thesis.trim()) {
    return Response.json({ error: lang === 'en' ? 'Thesis is required.' : 'A tese é obrigatória.' }, { status: 400 })
  }

  const injection = detectPromptInjection(thesis)
  if (injection.detected) {
    void logSecurityEvent({ route: 'api/red-team', agentId: 'sentinela', matchedPatterns: injection.matchedPatterns, userMessage: thesis })
    return Response.json({ error: lang === 'en' ? 'Request rejected.' : 'Solicitação rejeitada.' }, { status: 400 })
  }

  try {
    const caio = AGENTS.find(a => a.id === 'caio')
    const grounding = await buildGrounding(thesis, lang)
    const { text, model } = await runModel({
      system: REDTEAM_ROLE[lang] + grounding,
      user: `${lang === 'en' ? 'Thesis to attack' : 'Tese a atacar'}:\n${thesis}`,
      agent: caio, maxTokens: 2000,
    })
    const cost = estimateCost({ taskType: classifyTask({ route: 'api/agent-deep' }), tier: 'opus', agentCount: 1 })
    void logExecution({ agentId: 'sentinela', route: 'api/red-team', question: thesis, responsePreview: text, modelUsed: model, taskType: 'deepdive', tokensOutput: cost.tokens, costBrl: cost.computeCostBrl, analystHoursEq: cost.analystHoursEquivalent })
    return Response.json({ critique: text, model: maskModel(model) })
  } catch (err) {
    console.error('[api/red-team] erro:', err)
    return Response.json({ error: lang === 'en' ? 'Red team unavailable. Try again shortly.' : 'Red-team indisponível. Tente novamente em instantes.' }, { status: 502 })
  }
}

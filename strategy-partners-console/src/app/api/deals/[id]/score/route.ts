import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { requireRole } from '@/lib/auth/rbac'
import { getDeal, getThesis, saveScore } from '@/lib/db/queries/deals'
import { scoreDeal } from '@/lib/deals/score'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// AI deal scoring sob demanda: pontua o deal contra uma tese (bloco 2). go/no-go + rationale.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  const { id } = await params
  let body: { thesisId?: string }
  try { body = await req.json() } catch { body = {} }

  const data = await getDeal(id)
  if (!data) return Response.json({ error: 'Deal não encontrado.' }, { status: 404 })

  try {
    const thesis = body.thesisId ? await getThesis(body.thesisId) : null
    const result = await scoreDeal({
      dealName: data.deal.name,
      metrics: data.metrics
        ? { arr: num(data.metrics.arr), mrr: num(data.metrics.mrr), growthRate: num(data.metrics.growthRate), burn: num(data.metrics.burn), teamSize: data.metrics.teamSize, churn: num(data.metrics.churn) }
        : null,
      thesis: thesis ? { name: thesis.name, description: thesis.description, criteria: thesis.criteria } : null,
    })
    const saved = await saveScore(id, {
      score: result.score, breakdown: result.breakdown, recommendation: result.recommendation,
      rationale: result.rationale, modelUsed: result.model, thesisId: body.thesisId ?? null,
    })
    return Response.json({ score: saved, result })
  } catch (err) {
    console.error('[api/deals/:id/score] erro:', err)
    const message = err instanceof Error ? err.message : 'Falha ao pontuar.'
    return Response.json({ error: message }, { status: 500 })
  }
}

function num(v: string | null): number | null {
  return v == null ? null : Number(v)
}

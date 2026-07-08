import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/rbac'
import { buildDealModelInputs } from '@/lib/server/deal-model-inputs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Inputs de modelagem pré-preenchidos para um deal do pipeline. Autoridade vem só da
// sessão autenticada (RBAC) — nunca de texto de chat. Robusto a banco/métricas ausentes:
// buildDealModelInputs devolve defaults 'placeholder' em vez de lançar.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })

  const { id } = await params
  try {
    const inputs = await buildDealModelInputs(id)
    return Response.json(inputs)
  } catch (err) {
    console.error('[api/projects/:id/model-inputs] erro:', err)
    return Response.json({ error: 'Falha ao montar inputs de modelagem.' }, { status: 500 })
  }
}

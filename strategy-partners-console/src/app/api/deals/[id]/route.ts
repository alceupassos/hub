import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { requireRole } from '@/lib/auth/rbac'
import { getDeal, updateDealStage } from '@/lib/db/queries/deals'
import { DEAL_STAGES, type DealStage } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })
  const { id } = await params
  const data = await getDeal(id)
  if (!data) return Response.json({ error: 'Deal não encontrado.' }, { status: 404 })
  return Response.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })
  const { id } = await params
  let body: { stage?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }
  if (!body.stage || !DEAL_STAGES.includes(body.stage as DealStage)) {
    return Response.json({ error: 'stage inválido.' }, { status: 400 })
  }
  try {
    await updateDealStage(id, body.stage as DealStage)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[api/deals/:id] PATCH erro:', err)
    return Response.json({ error: 'Falha ao mover deal.' }, { status: 500 })
  }
}

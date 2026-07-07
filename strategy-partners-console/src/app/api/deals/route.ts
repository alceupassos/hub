import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { requireRole } from '@/lib/auth/rbac'
import { createDeal, listDeals } from '@/lib/db/queries/deals'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Papéis que podem mutar dealflow (client_viewer é somente leitura).
const MUTATE = ['admin', 'partner', 'analyst'] as const

export async function GET() {
  if (!isDbConfigured()) return Response.json({ deals: [], dbConfigured: false })
  try {
    return Response.json({ deals: await listDeals(), dbConfigured: true })
  } catch (err) {
    console.error('[api/deals] GET erro:', err)
    return Response.json({ error: 'Falha ao carregar deals.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { ok, session } = await requireRole([...MUTATE])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  let body: { name?: string; clientName?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }
  const name = body.name?.trim()
  if (!name) return Response.json({ error: 'name é obrigatório.' }, { status: 400 })

  try {
    const deal = await createDeal({ name, clientName: body.clientName ?? null, sourceType: 'manual', createdByUserId: session.userId ?? null })
    return Response.json({ deal }, { status: 201 })
  } catch (err) {
    console.error('[api/deals] POST erro:', err)
    return Response.json({ error: 'Falha ao criar deal.' }, { status: 500 })
  }
}

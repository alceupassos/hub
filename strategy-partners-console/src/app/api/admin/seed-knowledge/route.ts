import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { requireRole } from '@/lib/auth/rbac'
import { seedKnowledge } from '@/lib/db/seed-knowledge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Semeia a base proprietária (K1). Autorização: sessão admin OU header x-bootstrap-token
// (mesmo token do bootstrap do 1º admin) — permite semear antes de haver usuários.
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  const bootstrap = process.env.ADMIN_BOOTSTRAP_TOKEN
  const headerToken = req.headers.get('x-bootstrap-token')
  const viaToken = Boolean(bootstrap && headerToken === bootstrap)

  if (!viaToken) {
    const { ok } = await requireRole(['admin'])
    if (!ok) return Response.json({ error: 'Acesso negado (admin ou x-bootstrap-token).' }, { status: 403 })
  }

  try {
    const result = await seedKnowledge()
    return Response.json(result)
  } catch (err) {
    console.error('[api/admin/seed-knowledge] erro:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Falha ao semear.' }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/rbac'
import { runDeepHealth } from '@/lib/server/selfcheck'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Diagnóstico profundo (Fase G · double-check). Restrito a admin — expõe estado de infra.
export async function GET(_req: NextRequest) {
  const { ok } = await requireRole(['admin'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  const health = await runDeepHealth(new Date().toISOString())
  return Response.json(health, { status: health.ok ? 200 : 503 })
}

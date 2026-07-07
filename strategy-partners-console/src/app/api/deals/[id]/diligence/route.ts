import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { requireRole } from '@/lib/auth/rbac'
import { runAutonomousDiligence } from '@/lib/deals/diligence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dispara a diligence autônoma: agentes leem o dataroom → populam red flags + checklist.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  const { id } = await params
  try {
    const result = await runAutonomousDiligence(id)
    return Response.json(result)
  } catch (err) {
    console.error('[api/deals/:id/diligence] erro:', err)
    const message = err instanceof Error ? err.message : 'Falha na diligence.'
    return Response.json({ error: message }, { status: 500 })
  }
}

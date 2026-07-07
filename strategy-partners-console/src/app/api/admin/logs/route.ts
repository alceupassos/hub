import { requireRole } from '@/lib/auth/rbac'
import { isDbConfigured } from '@/lib/db'
import { listExecutionLogs } from '@/lib/db/queries/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { ok } = await requireRole(['admin'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ logs: [], dbConfigured: false })
  return Response.json({ logs: await listExecutionLogs(200), dbConfigured: true })
}

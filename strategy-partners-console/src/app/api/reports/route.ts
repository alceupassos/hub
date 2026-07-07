import { isDbConfigured } from '@/lib/db'
import { getReportStats } from '@/lib/db/queries/reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isDbConfigured()) return Response.json({ stats: null, dbConfigured: false })
  const stats = await getReportStats()
  return Response.json({ stats, dbConfigured: true })
}

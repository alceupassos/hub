import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { getDdItems, getRedFlags, getValuations } from '@/lib/db/queries/due-diligence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) {
    return Response.json({ items: [], redFlags: [], valuations: [], dbConfigured: false })
  }
  const { id } = await params
  try {
    const [items, redFlags, valuations] = await Promise.all([
      getDdItems(id),
      getRedFlags(id),
      getValuations(id),
    ])
    return Response.json({ items, redFlags, valuations, dbConfigured: true })
  } catch (err) {
    console.error('[api/projects/:id/due-diligence] erro:', err)
    return Response.json({ error: 'Falha ao carregar due diligence.' }, { status: 500 })
  }
}

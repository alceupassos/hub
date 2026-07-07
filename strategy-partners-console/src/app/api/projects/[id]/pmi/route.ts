import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { getLegacyAccounts, getMilestones, getPmiRisks, getSynergies, getTalentRisks } from '@/lib/db/queries/pmi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) {
    return Response.json({ synergies: [], milestones: [], risks: [], talentRisks: [], legacyAccounts: [], dbConfigured: false })
  }
  const { id } = await params
  try {
    const [synergies, milestones, risks, talentRisks, legacyAccounts] = await Promise.all([
      getSynergies(id),
      getMilestones(id),
      getPmiRisks(id),
      getTalentRisks(id),
      getLegacyAccounts(id),
    ])
    return Response.json({ synergies, milestones, risks, talentRisks, legacyAccounts, dbConfigured: true })
  } catch (err) {
    console.error('[api/projects/:id/pmi] erro:', err)
    return Response.json({ error: 'Falha ao carregar PMI.' }, { status: 500 })
  }
}

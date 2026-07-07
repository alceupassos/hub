import 'server-only'
import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../index'
import { legacyAccounts, milestones, pmiRisks, synergies, talentRisks } from '../schema'

// PMI (pós-deal) queries — todas escopadas por projectId (multi-projeto real, ao contrário do
// padrão single-tenant do semantix que serviu de referência de forma).

export async function getSynergies(projectId: string) {
  return db.select().from(synergies).where(eq(synergies.projectId, projectId)).orderBy(desc(synergies.targetValue))
}

export async function getMilestones(projectId: string) {
  return db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.dueDate))
}

export async function getPmiRisks(projectId: string) {
  return db.select().from(pmiRisks).where(eq(pmiRisks.projectId, projectId)).orderBy(desc(pmiRisks.createdAt))
}

export async function getTalentRisks(projectId: string) {
  return db.select().from(talentRisks).where(eq(talentRisks.projectId, projectId)).orderBy(desc(talentRisks.createdAt))
}

export async function getLegacyAccounts(projectId: string) {
  return db.select().from(legacyAccounts).where(eq(legacyAccounts.projectId, projectId)).orderBy(desc(legacyAccounts.annualValue))
}

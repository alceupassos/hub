import 'server-only'
import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../index'
import { ddChecklistItems, redFlags, valuationEstimates } from '../schema'

// All queries are scoped by projectId so data never leaks across projects/mandates.

export async function getDdItems(projectId: string) {
  return db
    .select()
    .from(ddChecklistItems)
    .where(eq(ddChecklistItems.projectId, projectId))
    .orderBy(asc(ddChecklistItems.category))
}

export async function getRedFlags(projectId: string) {
  return db
    .select()
    .from(redFlags)
    .where(eq(redFlags.projectId, projectId))
    .orderBy(desc(redFlags.createdAt))
}

export async function getValuations(projectId: string) {
  return db
    .select()
    .from(valuationEstimates)
    .where(eq(valuationEstimates.projectId, projectId))
    .orderBy(asc(valuationEstimates.method))
}

export async function addRedFlag(input: {
  projectId: string
  category: string
  description: string
  severity: string
  sourceDocumentId?: string | null
  detectedByAgentId?: string | null
}) {
  const [row] = await db.insert(redFlags).values({
    projectId: input.projectId,
    category: input.category,
    description: input.description,
    severity: input.severity,
    sourceDocumentId: input.sourceDocumentId ?? null,
    detectedByAgentId: input.detectedByAgentId ?? null,
  }).returning()
  return row
}

import 'server-only'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../index'
import {
  dealActivity, dealComments, dealMetrics, dealScores, projects, theses,
  type DealStage, type ProjectType,
} from '../schema'

// Um "deal" é um project (type pre_deal por padrão) com estágio/score. Todas as queries por projectId.

export async function listDeals() {
  return db
    .select()
    .from(projects)
    .where(eq(projects.type, 'pre_deal'))
    .orderBy(sql`${projects.scoreCache} desc nulls last`, desc(projects.createdAt))
}

export async function getDeal(id: string) {
  const [deal] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  if (!deal) return null
  const [metrics] = await db.select().from(dealMetrics).where(eq(dealMetrics.projectId, id)).orderBy(desc(dealMetrics.extractedAt)).limit(1)
  const [score] = await db.select().from(dealScores).where(eq(dealScores.projectId, id)).orderBy(desc(dealScores.createdAt)).limit(1)
  return { deal, metrics: metrics ?? null, score: score ?? null }
}

async function logActivity(projectId: string, kind: string, detail?: string) {
  await db.insert(dealActivity).values({ projectId, kind, detail: detail ?? null }).catch(() => {})
}

export async function createDeal(input: { name: string; clientName?: string | null; type?: ProjectType; sourceType?: string; createdByUserId?: string | null }) {
  const [row] = await db
    .insert(projects)
    .values({
      name: input.name,
      type: input.type ?? 'pre_deal',
      clientName: input.clientName ?? null,
      sourceType: input.sourceType ?? 'manual',
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning()
  await logActivity(row.id, 'created', input.sourceType ?? 'manual')
  return row
}

export async function updateDealStage(id: string, stage: DealStage) {
  await db.update(projects).set({ stage }).where(eq(projects.id, id))
  await logActivity(id, 'stage_change', stage)
}

export async function saveMetrics(projectId: string, m: { arr?: number | null; mrr?: number | null; growthRate?: number | null; burn?: number | null; teamSize?: number | null; churn?: number | null; source?: string | null }) {
  const num = (v: number | null | undefined) => (v == null ? null : String(v))
  const [row] = await db.insert(dealMetrics).values({
    projectId,
    arr: num(m.arr), mrr: num(m.mrr), growthRate: num(m.growthRate), burn: num(m.burn),
    teamSize: m.teamSize ?? null, churn: num(m.churn), source: m.source ?? null,
  }).returning()
  await logActivity(projectId, 'metric', m.source ?? 'ingest')
  return row
}

export async function saveScore(projectId: string, s: { score: number; breakdown?: unknown; recommendation: string; rationale?: string; modelUsed?: string; thesisId?: string | null }) {
  const [row] = await db.insert(dealScores).values({
    projectId,
    thesisId: s.thesisId ?? null,
    score: s.score,
    breakdown: s.breakdown ? JSON.stringify(s.breakdown) : null,
    recommendation: s.recommendation,
    rationale: s.rationale ?? null,
    modelUsed: s.modelUsed ?? null,
  }).returning()
  await db.update(projects).set({ scoreCache: s.score }).where(eq(projects.id, projectId))
  await logActivity(projectId, 'scored', `${s.score} · ${s.recommendation}`)
  return row
}

export async function listTheses() {
  return db.select().from(theses).orderBy(desc(theses.createdAt))
}
export async function createThesis(input: { name: string; description?: string | null; criteria?: string | null; createdByUserId?: string | null }) {
  const [row] = await db.insert(theses).values({
    name: input.name, description: input.description ?? null, criteria: input.criteria ?? null, createdByUserId: input.createdByUserId ?? null,
  }).returning()
  return row
}
export async function getThesis(id: string) {
  const [row] = await db.select().from(theses).where(eq(theses.id, id)).limit(1)
  return row ?? null
}

export async function listComments(projectId: string) {
  return db.select().from(dealComments).where(eq(dealComments.projectId, projectId)).orderBy(desc(dealComments.createdAt))
}
export async function addComment(projectId: string, body: string, userId?: string | null) {
  const [row] = await db.insert(dealComments).values({ projectId, body, userId: userId ?? null }).returning()
  await logActivity(projectId, 'comment')
  return row
}

export async function listActivity(projectId: string) {
  return db.select().from(dealActivity).where(eq(dealActivity.projectId, projectId)).orderBy(desc(dealActivity.createdAt)).limit(50)
}

import 'server-only'
import { desc, eq, or, sql } from 'drizzle-orm'
import { db } from '../index'
import { assumptionsLibrary, dealPrecedents, goldenAnswers, marketMultiples, sectorBenchmarks } from '../schema'

// Leitura da base proprietária (K1). Todas retornam [] em caso de erro/sem dados — o grounding
// degrada graciosamente. Escopo global da firma (não por projeto).

export async function getAssumptions(sector?: string) {
  const rows = await db.select().from(assumptionsLibrary).orderBy(assumptionsLibrary.key).catch(() => [])
  if (!sector) return rows
  // premissas globais (sem setor) + as do setor pedido
  return rows.filter(r => !r.sector || r.sector === sector)
}

export async function getMultiples(sector: string) {
  return db.select().from(marketMultiples).where(eq(marketMultiples.sector, sector)).orderBy(desc(marketMultiples.asOfDate)).catch(() => [])
}

export async function getBenchmarks(sector: string, stage?: string) {
  const base = db.select().from(sectorBenchmarks).where(eq(sectorBenchmarks.sector, sector))
  const rows = await base.catch(() => [])
  return stage ? rows.filter(r => !r.stage || r.stage === stage) : rows
}

export async function searchPrecedents(sector: string, limit = 4) {
  return db.select().from(dealPrecedents).where(eq(dealPrecedents.sector, sector)).orderBy(desc(dealPrecedents.asOfDate)).limit(limit).catch(() => [])
}

// Match simples de golden answers por keyword/ILIKE (sem custo de LLM).
export async function matchGoldenAnswers(question: string, limit = 2) {
  const q = question.toLowerCase().slice(0, 200)
  const terms = q.split(/\W+/).filter(t => t.length > 4).slice(0, 6)
  if (terms.length === 0) return []
  try {
    const rows = await db.select().from(goldenAnswers)
      .where(or(...terms.map(t => sql`lower(${goldenAnswers.keywords}) like ${'%' + t + '%'} or lower(${goldenAnswers.question}) like ${'%' + t + '%'}`)))
      .limit(limit)
    return rows
  } catch {
    return []
  }
}

// ── Inserts (usados pelo seed e futuras rotas de gestão) ──
export async function countKnowledge() {
  const [a] = await db.select({ n: sql<number>`count(*)` }).from(assumptionsLibrary).catch(() => [{ n: 0 }])
  return Number(a?.n ?? 0)
}

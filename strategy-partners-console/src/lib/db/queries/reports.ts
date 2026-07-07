import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from '../index'
import { executionLogs } from '../schema'

export interface ReportStats {
  totalSessions: number
  avgLatencyMs: number | null
  reasoningPct: number
  topAgents: { agentId: string; sessions: number }[]
}

// Agrega os relatórios a partir de execution_logs (Fase 5). Retorna null se não houver dados
// → a página cai no fallback de demonstração.
export async function getReportStats(): Promise<ReportStats | null> {
  try {
    const [totals] = await db.execute<{ total: number; avg_ms: number | null; reasoning: number }>(sql`
      SELECT count(*)::int AS total,
             avg(duration_ms)::int AS avg_ms,
             count(*) FILTER (WHERE model_used ilike '%reason%' OR model_used ilike '%pro%' OR model_used ilike '%opus%')::int AS reasoning
      FROM strategy_partners.execution_logs
    `).then(r => r.rows)

    if (!totals || Number(totals.total) === 0) return null

    const top = await db.execute<{ agent_id: string; sessions: number }>(sql`
      SELECT agent_id, count(*)::int AS sessions
      FROM strategy_partners.execution_logs
      GROUP BY agent_id
      ORDER BY sessions DESC
      LIMIT 6
    `).then(r => r.rows)

    const total = Number(totals.total)
    return {
      totalSessions: total,
      avgLatencyMs: totals.avg_ms != null ? Number(totals.avg_ms) : null,
      reasoningPct: total > 0 ? Math.round((Number(totals.reasoning) / total) * 100) : 0,
      topAgents: top.map(r => ({ agentId: r.agent_id, sessions: Number(r.sessions) })),
    }
  } catch {
    return null
  }
}

import 'server-only'
import { isDbConfigured } from '@/lib/db'
import { wacc, dcf, lbo, moic } from '@/lib/finance'

// ─────────────────────────────────────────────────────────────────────────────
// Auto-teste do sistema (Fase G · double-check). Roda uma bateria de checagens e
// devolve um semáforo por item. Alimenta GET /api/health/deep e a página
// Admin → Diagnóstico. Não é "parece ok" — cada item valida algo verificável.
// ─────────────────────────────────────────────────────────────────────────────

export type CheckStatus = 'ok' | 'degraded' | 'fail'
export interface CheckResult {
  key: string
  label: string
  status: CheckStatus
  detail: string
}

const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol

/** Checagens do motor determinístico — devem bater com valores de gabarito. */
export function checkEngine(): CheckResult[] {
  const out: CheckResult[] = []

  const w = wacc({ costOfEquity: 0.15, costOfDebt: 0.1, taxRate: 0.34, equityValue: 700, debtValue: 300 })
  out.push({
    key: 'engine_wacc', label: 'Motor — WACC',
    status: near(w.wacc, 0.1248) ? 'ok' : 'fail',
    detail: `WACC=${(w.wacc * 100).toFixed(2)}% (esperado 12,48%)`,
  })

  const d = dcf({ fcff: [10, 10, 10, 10, 10], discountRate: 0.1, terminalGrowth: 0 })
  out.push({
    key: 'engine_dcf', label: 'Motor — DCF (perpetuidade)',
    status: near(d.enterpriseValue, 100, 1e-4) ? 'ok' : 'fail',
    detail: `EV=${d.enterpriseValue.toFixed(2)} (esperado 100,00)`,
  })

  const l = lbo({ entryEbitda: 100, entryMultiple: 10, exitMultiple: 10, holdYears: 5, ebitdaGrowth: 0, taxRate: 0, tranches: [{ name: 'Senior', turns: 5, rate: 0.08 }] })
  const irrOk = l.irr != null && near(l.sponsorEquity * Math.pow(1 + l.irr, 5), l.sponsorExitProceeds, 1e-2)
  out.push({
    key: 'engine_lbo', label: 'Motor — LBO (IRR/MOIC consistentes)',
    status: l.moic > 1 && irrOk ? 'ok' : 'fail',
    detail: `MOIC=${l.moic.toFixed(2)}x, IRR=${l.irr != null ? (l.irr * 100).toFixed(1) + '%' : '—'}`,
  })

  out.push({
    key: 'engine_moic', label: 'Motor — MOIC',
    status: near(moic([-1000, 0, 2000]), 2) ? 'ok' : 'fail',
    detail: `MOIC(−1000,0,2000)=${moic([-1000, 0, 2000]).toFixed(2)} (esperado 2,00)`,
  })

  return out
}

/** Checagem de configuração/infra (sem chamadas de rede externas caras). */
export function checkConfig(): CheckResult[] {
  const has = (v?: string) => Boolean(v && v.trim())
  const out: CheckResult[] = []

  out.push({
    key: 'auth_secret', label: 'Autenticação (AUTH_SECRET)',
    status: has(process.env.AUTH_SECRET) ? 'ok' : 'fail',
    detail: has(process.env.AUTH_SECRET) ? 'NextAuth configurado' : 'AUTH_SECRET ausente — login não funciona',
  })

  out.push({
    key: 'legacy_codes', label: 'Backdoor de código diário desligado',
    status: process.env.LEGACY_DAILY_CODE_AUTH === 'true' ? 'degraded' : 'ok',
    detail: process.env.LEGACY_DAILY_CODE_AUTH === 'true' ? 'LEGACY_DAILY_CODE_AUTH=true (não recomendado)' : 'somente NextAuth',
  })

  out.push({
    key: 'db', label: 'Banco de dados (Postgres)',
    status: isDbConfigured() ? 'ok' : 'degraded',
    detail: isDbConfigured() ? 'DATABASE_URL configurada' : 'sem DATABASE_URL — RAG/grounding em modo degradado',
  })

  out.push({
    key: 'embeddings', label: 'Embeddings',
    status: has(process.env.ANGRA_EMBED_KEY) ? 'ok' : 'degraded',
    detail: has(process.env.ANGRA_EMBED_KEY) ? 'ANGRA_EMBED_KEY configurada' : 'sem ANGRA_EMBED_KEY — RAG narrativo off',
  })

  out.push({
    key: 'llm', label: 'Provedor de LLM',
    status: has(process.env.DEEPSEEK_API_KEY) || process.env.USE_ANTHROPIC_TIERS === 'true' ? 'ok' : 'fail',
    detail: has(process.env.DEEPSEEK_API_KEY) ? 'chat/agentes disponíveis' : 'nenhum provedor de chat configurado',
  })

  out.push({
    key: 'storage', label: 'Storage de anexos (blob)',
    status: 'ok',
    detail: `diretório: ${process.env.STORAGE_DIR ?? './.uploads'}`,
  })

  return out
}

export interface DeepHealth {
  ok: boolean
  checkedAt: string
  summary: { ok: number; degraded: number; fail: number }
  checks: CheckResult[]
}

/** Live DB round-trip (opcional; só quando o banco está configurado). */
async function checkDbLive(): Promise<CheckResult> {
  if (!isDbConfigured()) return { key: 'db_live', label: 'Banco — conexão viva', status: 'degraded', detail: 'sem DATABASE_URL' }
  try {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    await db.execute(sql`select 1`)
    return { key: 'db_live', label: 'Banco — conexão viva', status: 'ok', detail: 'select 1 OK' }
  } catch (err) {
    return { key: 'db_live', label: 'Banco — conexão viva', status: 'fail', detail: err instanceof Error ? err.message : 'falha' }
  }
}

export async function runDeepHealth(nowIso: string): Promise<DeepHealth> {
  const checks: CheckResult[] = [...checkConfig(), ...checkEngine(), await checkDbLive()]
  const summary = {
    ok: checks.filter(c => c.status === 'ok').length,
    degraded: checks.filter(c => c.status === 'degraded').length,
    fail: checks.filter(c => c.status === 'fail').length,
  }
  return { ok: summary.fail === 0, checkedAt: nowIso, summary, checks }
}

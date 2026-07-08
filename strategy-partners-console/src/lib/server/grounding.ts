import 'server-only'
import { isDbConfigured } from '@/lib/db'
import { getAssumptions, getBenchmarks, getMultiples, matchGoldenAnswers, searchPrecedents, getLboAssumptions, getTaxParameters, getFinancingTerms, getReturnsBenchmarks } from '@/lib/db/queries/knowledge'
import { getFirmKBId } from '@/lib/db/queries/dataroom'
import { hybridSearch } from '@/lib/rag/search'

// Detecção de setor por heurística de palavra-chave (sem custo de LLM).
const SECTOR_KEYWORDS: Record<string, string[]> = {
  saas: ['saas', 'software', 'arr', 'mrr', 'assinatura', 'subscription', 'churn', 'nrr'],
  logtech: ['logística', 'logistica', 'logtech', 'transporte', 'frete', 'cargo', 'última milha', 'supply chain'],
  healthtech: ['saúde', 'saude', 'healthtech', 'hospital', 'clínica', 'clinica', 'médic', 'medic', 'health'],
  fintech: ['fintech', 'pagamento', 'banking', 'crédito', 'credito', 'open banking', 'bacen', 'adquirente', 'pix'],
  varejo: ['varejo', 'retail', 'loja', 'e-commerce', 'ecommerce', 'marketplace', 'consumo'],
  industrial: ['indústria', 'industria', 'industrial', 'manufatura', 'fábrica', 'fabrica'],
  agro: ['agro', 'agronegócio', 'agronegocio', 'agricultura', 'fazenda'],
}

// Intenção de MODELAGEM quantitativa — quando presente, injetamos as premissas calibradas
// (K2) que o motor determinístico consome e que o agente deve citar.
const MODELING_KEYWORDS = [
  'lbo', 'alavancagem', 'leveraged', 'buyout', 'dívida', 'divida', 'tranche',
  'valuation', 'valor', 'valuation', 'dcf', 'fluxo de caixa', 'wacc', 'custo de capital',
  'múltiplo', 'multiplo', 'ev/ebitda', 'ebitda', 'irr', 'tir', 'moic', 'retorno',
  'accretion', 'dilution', 'diluição', 'diluicao', 'eps', 'sinergia', 'synergy',
  'ágio', 'agio', 'goodwill', 'ppa', 'tributár', 'tributar', 'imposto', 'asset deal', 'stock deal',
  'earn-out', 'earnout', 'estrutura', 'financiamento', 'debênture', 'debenture',
]

function detectSector(text: string): string | null {
  const t = text.toLowerCase()
  let best: { sector: string; hits: number } | null = null
  for (const [sector, kws] of Object.entries(SECTOR_KEYWORDS)) {
    const hits = kws.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0)
    if (hits > 0 && (!best || hits > best.hits)) best = { sector, hits }
  }
  return best?.sector ?? null
}

export function detectModelingIntent(text: string): boolean {
  const t = text.toLowerCase()
  return MODELING_KEYWORDS.some(k => t.includes(k))
}

const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : 's/ data')
const pct = (v: unknown) => (v == null ? '—' : `${(Number(v) * 100).toFixed(2)}%`)

/**
 * Monta o bloco de "base proprietária" a ser injetado no system prompt dos agentes.
 * Retorna '' quando não há banco ou nenhum dado relevante (no-op → comportamento atual).
 */
export async function buildGrounding(question: string, lang: 'pt' | 'en' = 'pt'): Promise<string> {
  if (!isDbConfigured() || !question?.trim()) return ''

  const sector = detectSector(question)
  const modeling = detectModelingIntent(question)

  const [assumptions, multiples, benchmarks, precedents, golden, firmKbId, lboA, taxP, finT, retB] = await Promise.all([
    getAssumptions(sector ?? undefined).catch(() => []),
    sector ? getMultiples(sector).catch(() => []) : Promise.resolve([]),
    sector ? getBenchmarks(sector).catch(() => []) : Promise.resolve([]),
    sector ? searchPrecedents(sector).catch(() => []) : Promise.resolve([]),
    matchGoldenAnswers(question).catch(() => []),
    getFirmKBId().catch(() => null),
    modeling && sector ? getLboAssumptions(sector).catch(() => []) : Promise.resolve([]),
    modeling ? getTaxParameters().catch(() => []) : Promise.resolve([]),
    modeling ? getFinancingTerms().catch(() => []) : Promise.resolve([]),
    modeling ? getReturnsBenchmarks().catch(() => []) : Promise.resolve([]),
  ])

  // RAG narrativo da firma (metodologia/Brasil/post-mortems) — só se houver KB + embeddings.
  let firmHits: { content: string }[] = []
  if (firmKbId && process.env.GEMINI_API_KEY) {
    firmHits = await hybridSearch(question, { knowledgeBaseId: firmKbId, limit: 4 }).catch(() => [])
  }

  const parts: string[] = []

  if (assumptions.length) {
    parts.push('**Premissas calibradas da firma:** ' + assumptions.slice(0, 10)
      .map(a => `${a.label}=${a.value}${a.unit ?? ''}${a.sector ? ` (${a.sector})` : ''} [${a.source ?? 'interno'}, ${fmtDate(a.asOfDate)}]`).join('; '))
  }
  if (multiples.length) {
    parts.push(`**Múltiplos de mercado (${sector}):** ` + multiples.slice(0, 6)
      .map(m => `${m.metric} ${m.low}–${m.median}–${m.high}x [${m.source ?? '—'}, ${fmtDate(m.asOfDate)}]`).join('; '))
  }
  if (benchmarks.length) {
    parts.push(`**Benchmarks setoriais (${sector}):** ` + benchmarks.slice(0, 8)
      .map(b => `${b.metric}${b.stage ? `/${b.stage}` : ''} p25=${b.p25} p50=${b.p50} p75=${b.p75}${b.unit ?? ''}`).join('; '))
  }
  if (precedents.length) {
    parts.push(`**Precedentes de transação da firma (${sector}):** ` + precedents
      .map(p => `${p.thesis ?? p.sector}: EV/EBITDA ${p.evEbitda ?? '—'}x, estrutura ${p.structure ?? '—'}, desfecho ${p.outcome ?? '—'}${p.lessons ? ` — lição: ${p.lessons}` : ''}`).join(' | '))
  }

  // ── Camada quantitativa (K2) — só quando há intenção de modelagem ──
  if (lboA.length) {
    parts.push(`**Premissas de LBO calibradas (${sector}):** ` + lboA.slice(0, 2).map(l =>
      `entrada ${l.entryMultipleLow}–${l.entryMultipleHigh}x, saída ${l.exitMultipleLow}–${l.exitMultipleHigh}x, alavancagem total ${l.totalLeverageTurns}x (sênior ${l.seniorTurns}x @ ${pct(l.seniorRate)}, mezz ${l.mezzTurns}x @ ${pct(l.mezzRate)}), hold ${l.typicalHoldYears}a [${l.source ?? '—'}, ${fmtDate(l.asOfDate)}]`).join(' | '))
  }
  if (taxP.length) {
    parts.push('**Parâmetros tributários (Brasil):** ' + taxP.slice(0, 6)
      .map(t => `${t.label}=${t.value}${t.unit ?? ''} [${t.source ?? '—'}]`).join('; '))
  }
  if (finT.length) {
    parts.push('**Menu de financiamento (custo all-in):** ' + finT.slice(0, 6)
      .map(f => `${f.label} ${pct(f.allInRateLow)}–${pct(f.allInRateHigh)} (${f.tenorYears}a)`).join('; '))
  }
  if (retB.length) {
    parts.push('**Benchmarks de retorno (PE/VC BR-LatAm):** ' + retB.slice(0, 6)
      .map(r => `${r.assetClass} ${r.metric} p25=${r.p25} p50=${r.p50} p75=${r.p75}${r.unit ?? ''}`).join('; '))
  }

  if (golden.length) {
    parts.push('**Respostas de referência da casa:** ' + golden.map(g => `${g.question} → ${g.answer}`).join(' | '))
  }
  if (firmHits.length) {
    parts.push('**Conhecimento institucional (trechos):**\n' + firmHits.map((h, i) => `[${i + 1}] ${h.content.slice(0, 400)}`).join('\n'))
  }

  if (parts.length === 0) return ''

  const header = lang === 'en'
    ? '## PROPRIETARY BASE — use these numbers and cite them; if they diverge from generic knowledge, PREFER this base. Always state the source/date. For any calculation (LBO, DCF, IRR/MOIC, accretion), use the deterministic engine result, never mental math.'
    : '## BASE PROPRIETÁRIA — use estes números e cite-os; se divergirem do conhecimento genérico, PREFIRA esta base. Sempre indique fonte/data. Para qualquer cálculo (LBO, DCF, TIR/MOIC, accretion), use o resultado do motor determinístico, nunca conta de cabeça.'

  return `${header}\n${parts.join('\n')}\n\n`
}

// ─────────────────────────────────────────────────────────────────────────────
// Inputs calibrados estruturados para o MOTOR (Fase D — tool-calling).
// Retorna null quando não há banco/dados; o chamador cai em defaults do motor.
// ─────────────────────────────────────────────────────────────────────────────
export interface EngineInputs {
  sector: string | null
  taxRate: number
  riskFree: number
  erpMature: number
  countryRiskPremium: number
  sizePremium: number
  sectorBetaUnlevered: number | null
  entryMultiple: { low: number; high: number } | null
  exitMultiple: { low: number; high: number } | null
  leverageTurns: number | null
  seniorTurns: number | null
  seniorRate: number | null
  mezzTurns: number | null
  mezzRate: number | null
  holdYears: number | null
  agioAmortYears: number
}

export async function getEngineInputs(question: string): Promise<EngineInputs | null> {
  if (!isDbConfigured()) return null
  const sector = detectSector(question)
  const [assumptions, lboA, taxP] = await Promise.all([
    getAssumptions(sector ?? undefined).catch(() => []),
    sector ? getLboAssumptions(sector).catch(() => []) : Promise.resolve([]),
    getTaxParameters().catch(() => []),
  ])
  if (!assumptions.length && !lboA.length && !taxP.length) return null

  const byKey = (k: string) => assumptions.find(a => a.key === k)
  const num = (v: unknown, dflt: number) => (v == null ? dflt : Number(v))
  const asDecimalPct = (v: unknown, dflt: number) => (v == null ? dflt : Number(v) / 100)

  const beta = assumptions.find(a => a.sector === sector && a.key.startsWith('beta_'))
  const lbo = lboA[0]
  const agio = taxP.find(t => t.key === 'agio_amort_years')

  return {
    sector,
    taxRate: asDecimalPct(byKey('tax_rate')?.value, 0.34),
    riskFree: asDecimalPct(byKey('rf_br')?.value, 0.105),
    erpMature: asDecimalPct(byKey('erp_mature')?.value, 0.046),
    countryRiskPremium: asDecimalPct(byKey('crp_br')?.value, 0.03),
    sizePremium: asDecimalPct(byKey('size_premium')?.value, 0.025),
    sectorBetaUnlevered: beta ? Number(beta.value) : null,
    entryMultiple: lbo ? { low: num(lbo.entryMultipleLow, 0), high: num(lbo.entryMultipleHigh, 0) } : null,
    exitMultiple: lbo ? { low: num(lbo.exitMultipleLow, 0), high: num(lbo.exitMultipleHigh, 0) } : null,
    leverageTurns: lbo ? num(lbo.totalLeverageTurns, 0) : null,
    seniorTurns: lbo ? num(lbo.seniorTurns, 0) : null,
    seniorRate: lbo ? num(lbo.seniorRate, 0) : null,
    mezzTurns: lbo ? num(lbo.mezzTurns, 0) : null,
    mezzRate: lbo ? num(lbo.mezzRate, 0) : null,
    holdYears: lbo?.typicalHoldYears ?? null,
    agioAmortYears: num(agio?.value, 5),
  }
}

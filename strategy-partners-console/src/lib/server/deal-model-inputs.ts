import 'server-only'
import { isDbConfigured } from '@/lib/db'
import { getDeal } from '@/lib/db/queries/deals'
import { getMultiples } from '@/lib/db/queries/knowledge'
import { getEngineInputs } from '@/lib/server/grounding'
import { costOfEquityCAPM, releverBeta, wacc } from '@/lib/finance/dcf'

// ─────────────────────────────────────────────────────────────────────────────
// Ponte deal → workbench. Carrega o deal (getDeal) + suas métricas extraídas,
// detecta o setor pelo nome/cliente (via getEngineInputs, que reusa a heurística
// de setor), puxa as premissas calibradas da firma (K2) e devolve inputs de LBO
// e DCF PRÉ-PREENCHIDOS, prontos para o motor determinístico do console.
//
// Cada campo carrega uma flag de proveniência:
//   • 'extraido'   — veio das métricas reais do deal (deal_metrics).
//   • 'calibrado'  — veio da base proprietária calibrada da firma (K2/multiplos).
//   • 'placeholder'— default de sandbox / premissa assumida (não fundamentado).
//
// Robusto por construção: sem banco/sem métricas, cai em defaults sensatos e os
// marca como 'placeholder' — nunca lança.
// ─────────────────────────────────────────────────────────────────────────────

export type Provenance = 'extraido' | 'calibrado' | 'placeholder'

export interface ModelField<T = number> {
  value: T
  provenance: Provenance
  note?: string
}

export interface DealLboInputs {
  entryEbitda: ModelField
  entryMultiple: ModelField
  exitMultiple: ModelField
  holdYears: ModelField
  seniorTurns: ModelField
  seniorRate: ModelField
  taxRate: ModelField
  ebitdaGrowth: ModelField
}

export interface DealDcfInputs {
  wacc: ModelField
  terminalGrowth: ModelField
  netDebt: ModelField
  fcff: ModelField<number[]>
}

export interface DealCompsInputs {
  metricName: string
  metricValue: ModelField
  peerMultiples: ModelField<number[]>
}

export interface DealModelInputs {
  dealId: string
  dealName: string
  clientName: string | null
  sector: string | null
  currencyNote: string
  metrics: {
    arr: number | null
    mrr: number | null
    growthRate: number | null
    burn: number | null
    teamSize: number | null
    churn: number | null
  }
  lbo: DealLboInputs
  dcf: DealDcfInputs
  comps: DealCompsInputs
}

// Margem de EBITDA assumida quando só há ARR (proxy — nunca é dado extraído).
const EBITDA_MARGIN_PROXY = 0.2
// Conversão EBITDA→FCFF assumida para a rampa de DCF (após capex/ΔNWC/impostos).
const FCFF_CONVERSION_PROXY = 0.6

const toNum = (v: unknown): number | null => {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function buildDealModelInputs(dealId: string): Promise<DealModelInputs> {
  // ── 1. Deal + métricas extraídas (robusto a banco ausente) ──
  let dealName = dealId
  let clientName: string | null = null
  let m: DealModelInputs['metrics'] = { arr: null, mrr: null, growthRate: null, burn: null, teamSize: null, churn: null }

  if (isDbConfigured()) {
    const res = await getDeal(dealId).catch(() => null)
    if (res?.deal) {
      dealName = res.deal.name ?? dealId
      clientName = res.deal.clientName ?? null
    }
    if (res?.metrics) {
      m = {
        arr: toNum(res.metrics.arr),
        mrr: toNum(res.metrics.mrr),
        growthRate: toNum(res.metrics.growthRate),
        burn: toNum(res.metrics.burn),
        teamSize: res.metrics.teamSize ?? null,
        churn: toNum(res.metrics.churn),
      }
    }
  }

  // ── 2. Premissas calibradas da firma (K2) — setor detectado do nome/cliente ──
  const eng = await getEngineInputs(`${dealName} ${clientName ?? ''}`).catch(() => null)
  const sector = eng?.sector ?? null
  const multiples = sector ? await getMultiples(sector).catch(() => []) : []

  // ── 3. LBO ──
  // entryEbitda: proxy a partir do ARR extraído × margem assumida; senão default.
  const entryEbitda: ModelField = m.arr != null
    ? { value: m.arr * EBITDA_MARGIN_PROXY, provenance: 'extraido', note: `proxy: ARR extraído × margem EBITDA ${(EBITDA_MARGIN_PROXY * 100).toFixed(0)}% (assumida)` }
    : { value: 100, provenance: 'placeholder', note: 'sem ARR extraído — default de sandbox' }

  const midMultiple = (mm: { low: number; high: number } | null | undefined): number | null =>
    mm ? (mm.low + mm.high) / 2 : null

  const entryMultMid = midMultiple(eng?.entryMultiple)
  const entryMultiple: ModelField = entryMultMid != null
    ? { value: entryMultMid, provenance: 'calibrado', note: `EV/EBITDA de entrada calibrado (${sector})` }
    : { value: 10, provenance: 'placeholder', note: 'múltiplo de entrada padrão' }

  const exitMultMid = midMultiple(eng?.exitMultiple)
  const exitMultiple: ModelField = exitMultMid != null
    ? { value: exitMultMid, provenance: 'calibrado', note: `EV/EBITDA de saída calibrado (${sector})` }
    : { value: 11, provenance: 'placeholder', note: 'múltiplo de saída padrão' }

  const holdYears: ModelField = eng?.holdYears != null
    ? { value: eng.holdYears, provenance: 'calibrado', note: `hold típico da firma (${sector})` }
    : { value: 5, provenance: 'placeholder', note: 'hold padrão' }

  const seniorTurns: ModelField = eng?.seniorTurns != null
    ? { value: eng.seniorTurns, provenance: 'calibrado', note: 'alavancagem sênior calibrada' }
    : { value: 4, provenance: 'placeholder', note: 'alavancagem sênior padrão' }

  const seniorRate: ModelField = eng?.seniorRate != null
    ? { value: eng.seniorRate, provenance: 'calibrado', note: 'custo da dívida sênior calibrado' }
    : { value: 0.14, provenance: 'placeholder', note: 'custo de dívida padrão' }

  const taxRate: ModelField = eng
    ? { value: eng.taxRate, provenance: 'calibrado', note: 'alíquota efetiva (base BR)' }
    : { value: 0.34, provenance: 'placeholder', note: 'alíquota padrão' }

  const ebitdaGrowth: ModelField = m.growthRate != null
    ? { value: m.growthRate / 100, provenance: 'extraido', note: 'crescimento a.a. extraído do deal' }
    : { value: 0.08, provenance: 'placeholder', note: 'crescimento padrão' }

  const lbo: DealLboInputs = {
    entryEbitda, entryMultiple, exitMultiple, holdYears, seniorTurns, seniorRate, taxRate, ebitdaGrowth,
  }

  // ── 4. DCF ──
  // WACC via CAPM (beta setorial realavancado à estrutura implícita) + custo de dívida.
  let waccField: ModelField = { value: 0.145, provenance: 'placeholder', note: 'WACC padrão de sandbox' }
  if (eng) {
    const ev = entryEbitda.value * (entryMultMid ?? 10)
    const debt = (eng.leverageTurns ?? eng.seniorTurns ?? 0) * entryEbitda.value
    const equity = Math.max(ev - debt, ev * 0.2)
    const de = equity > 0 ? debt / equity : 0
    const beta = releverBeta(eng.sectorBetaUnlevered ?? 1, de, eng.taxRate)
    const ke = costOfEquityCAPM({
      riskFree: eng.riskFree,
      beta,
      equityRiskPremium: eng.erpMature,
      countryRiskPremium: eng.countryRiskPremium,
      sizePremium: eng.sizePremium,
    })
    const kd = eng.seniorRate ?? 0.14
    const w = wacc({ costOfEquity: ke, costOfDebt: kd, taxRate: eng.taxRate, equityValue: equity, debtValue: debt })
    if (Number.isFinite(w.wacc) && w.wacc > 0) {
      const betaNote = eng.sectorBetaUnlevered == null ? ' (beta genérico=1)' : ''
      waccField = { value: w.wacc, provenance: 'calibrado', note: `CAPM + custo de dívida calibrados${betaNote}` }
    }
  }

  const terminalGrowth: ModelField = { value: 0.03, provenance: 'placeholder', note: 'g perpétuo padrão' }
  const netDebt: ModelField = { value: 0, provenance: 'placeholder', note: 'dívida líquida standalone não extraída — assuma 0 ou ajuste' }

  // Rampa de FCFF: EBITDA proxy × conversão assumida, crescendo pelo growth por holdYears.
  const g = ebitdaGrowth.value
  const years = Math.max(1, Math.round(holdYears.value))
  const fcffValues = Array.from({ length: years }, (_, i) =>
    Math.round(entryEbitda.value * FCFF_CONVERSION_PROXY * Math.pow(1 + g, i + 1) * 100) / 100,
  )
  const fcff: ModelField<number[]> = {
    value: fcffValues,
    provenance: 'placeholder',
    note: `rampa: EBITDA proxy × conversão FCFF ${(FCFF_CONVERSION_PROXY * 100).toFixed(0)}% (assumida), crescendo ${(g * 100).toFixed(1)}% a.a.`,
  }

  const dcf: DealDcfInputs = { wacc: waccField, terminalGrowth, netDebt, fcff }

  // ── 5. Comps (football field) — múltiplos de pares calibrados ──
  const evEbitda = multiples.find(r => r.metric === 'ev_ebitda')
  let peerMultiples: ModelField<number[]> = {
    value: [8, 10, 12],
    provenance: 'placeholder',
    note: 'múltiplos de pares padrão',
  }
  if (evEbitda) {
    const arr = [evEbitda.low, evEbitda.median, evEbitda.high].map(toNum).filter((n): n is number => n != null)
    if (arr.length) {
      peerMultiples = { value: arr, provenance: 'calibrado', note: `EV/EBITDA de pares (${sector})` }
    }
  }

  const comps: DealCompsInputs = {
    metricName: 'EBITDA',
    metricValue: { ...entryEbitda },
    peerMultiples,
  }

  return {
    dealId,
    dealName,
    clientName,
    sector,
    currencyNote: 'Valores na moeda das métricas do deal (não convertidos). Múltiplos e taxas são adimensionais.',
    metrics: m,
    lbo,
    dcf,
    comps,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Planejamento de longo prazo (LRP) — projeção plurianual determinística de
// receita, EBITDA, capex, variação de capital de giro e FCFF (fluxo de caixa livre
// para a firma). É a espinha do plano estratégico: liga premissas operacionais
// (crescimento, margem, intensidade de capital) ao caixa que sustenta valuation e
// capacidade de dívida.
//
// FCFF = EBIT·(1−T) + D&A − capex − ΔNWC. Sem D&A informado (padrão), aproxima-se
// EBIT ≈ EBITDA (D&A embutido), logo FCFF = EBITDA·(1−T) − capex − ΔNWC — premissa
// conservadora e explícita. Aceita crescimento constante OU vetor de taxas por ano
// (para cenários). Determinístico e auditável. Sem LLM.
// ─────────────────────────────────────────────────────────────────────────────

import { cagr } from './irr'

export interface ProjectionInput {
  revenue0: number          // receita do ano-base (ano 0)
  years: number             // horizonte explícito (anos 1..N)
  revenueGrowth: number | number[] // crescimento constante OU vetor por ano (decimal)
  ebitdaMargin: number      // margem EBITDA (decimal)
  capexPctRevenue: number   // capex como % da receita (decimal)
  nwcPctRevenue: number     // capital de giro como % da receita (decimal)
  taxRate: number           // alíquota efetiva (decimal)
  daPctRevenue?: number     // D&A como % da receita (default 0) — habilita o escudo fiscal
}

export interface ProjectionYear {
  year: number
  revenue: number
  ebitda: number
  da: number
  ebit: number
  tax: number
  capex: number
  nwc: number
  nwcChange: number   // ΔNWC vs. ano anterior (aumento consome caixa)
  fcff: number
  cumulativeFcff: number
}

export interface ProjectionResult {
  rows: ProjectionYear[]
  cumulativeFcff: number
  revenueCagr: number
  totalFcff: number
  formula: string
}

/** Taxa de crescimento do ano t (1-indexado); vetor mais curto reutiliza o último valor. */
function growthAt(g: number | number[], year: number): number {
  if (typeof g === 'number') return g
  if (g.length === 0) return 0
  return g[Math.min(year - 1, g.length - 1)]
}

/**
 * Projeta a demonstração de caixa plurianual.
 * ΔNWC do ano 1 usa o NWC do ano-base (receita0·nwcPct) como referência.
 */
export function projectFinancials(i: ProjectionInput): ProjectionResult {
  const daPct = i.daPctRevenue ?? 0
  const rows: ProjectionYear[] = []
  let revenue = i.revenue0
  let prevNwc = i.revenue0 * i.nwcPctRevenue
  let cumulative = 0

  for (let year = 1; year <= i.years; year++) {
    revenue = revenue * (1 + growthAt(i.revenueGrowth, year))
    const ebitda = revenue * i.ebitdaMargin
    const da = revenue * daPct
    const ebit = ebitda - da
    const tax = Math.max(0, ebit) * i.taxRate
    const capex = revenue * i.capexPctRevenue
    const nwc = revenue * i.nwcPctRevenue
    const nwcChange = nwc - prevNwc
    // FCFF = EBIT·(1−T) + D&A − capex − ΔNWC.
    const fcff = ebit * (1 - i.taxRate) + da - capex - nwcChange
    cumulative += fcff
    rows.push({ year, revenue, ebitda, da, ebit, tax, capex, nwc, nwcChange, fcff, cumulativeFcff: cumulative })
    prevNwc = nwc
  }

  const lastRevenue = rows.length ? rows[rows.length - 1].revenue : i.revenue0
  return {
    rows,
    cumulativeFcff: cumulative,
    totalFcff: cumulative,
    revenueCagr: cagr(i.revenue0, lastRevenue, i.years),
    formula: 'FCFF = EBIT·(1−T) + D&A − capex − ΔNWC',
  }
}

export interface LongRangeScenario {
  name: string
  label: string
  growthDelta?: number   // ajuste aditivo sobre o crescimento (pp em decimal)
  marginDelta?: number   // ajuste aditivo sobre a margem EBITDA
}

export interface LongRangeScenarioResult {
  name: string
  label: string
  cumulativeFcff: number
  revenueCagr: number
  finalRevenue: number
}

// Cenários padrão pessimista/base/otimista para o LRP.
export const DEFAULT_LRP_SCENARIOS: LongRangeScenario[] = [
  { name: 'bear', label: 'Pessimista', growthDelta: -0.03, marginDelta: -0.02 },
  { name: 'base', label: 'Base' },
  { name: 'bull', label: 'Otimista', growthDelta: 0.03, marginDelta: 0.02 },
]

/** Roda a projeção sob cada cenário (choques aditivos de crescimento e margem sobre o base). */
export function runPlanScenarios(
  base: ProjectionInput,
  scenarios: LongRangeScenario[] = DEFAULT_LRP_SCENARIOS,
): LongRangeScenarioResult[] {
  return scenarios.map(s => {
    const baseGrowth = base.revenueGrowth
    const revenueGrowth =
      typeof baseGrowth === 'number'
        ? baseGrowth + (s.growthDelta ?? 0)
        : baseGrowth.map(g => g + (s.growthDelta ?? 0))
    const r = projectFinancials({
      ...base,
      revenueGrowth,
      ebitdaMargin: base.ebitdaMargin + (s.marginDelta ?? 0),
    })
    return {
      name: s.name,
      label: s.label,
      cumulativeFcff: r.cumulativeFcff,
      revenueCagr: r.revenueCagr,
      finalRevenue: r.rows.length ? r.rows[r.rows.length - 1].revenue : base.revenue0,
    }
  })
}

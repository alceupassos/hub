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

import { dcf, type DcfResult } from './dcf'
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
 * Núcleo determinístico da projeção plurianual. Recebe funções de crescimento e de margem
 * por ano (1-indexado), o que permite crescimento constante/vetor E margem constante/rampa
 * sem duplicar a matemática de FCFF. ΔNWC do ano 1 usa o NWC do ano-base como referência.
 */
function buildProjection(params: {
  revenue0: number
  years: number
  growthAtFn: (year: number) => number
  marginAtFn: (year: number) => number
  capexPctRevenue: number
  nwcPctRevenue: number
  taxRate: number
  daPctRevenue: number
}): ProjectionResult {
  const rows: ProjectionYear[] = []
  let revenue = params.revenue0
  let prevNwc = params.revenue0 * params.nwcPctRevenue
  let cumulative = 0

  for (let year = 1; year <= params.years; year++) {
    revenue = revenue * (1 + params.growthAtFn(year))
    const ebitda = revenue * params.marginAtFn(year)
    const da = revenue * params.daPctRevenue
    const ebit = ebitda - da
    const tax = Math.max(0, ebit) * params.taxRate
    const capex = revenue * params.capexPctRevenue
    const nwc = revenue * params.nwcPctRevenue
    const nwcChange = nwc - prevNwc
    // FCFF = EBIT·(1−T) + D&A − capex − ΔNWC.
    const fcff = ebit * (1 - params.taxRate) + da - capex - nwcChange
    cumulative += fcff
    rows.push({ year, revenue, ebitda, da, ebit, tax, capex, nwc, nwcChange, fcff, cumulativeFcff: cumulative })
    prevNwc = nwc
  }

  const lastRevenue = rows.length ? rows[rows.length - 1].revenue : params.revenue0
  return {
    rows,
    cumulativeFcff: cumulative,
    totalFcff: cumulative,
    revenueCagr: cagr(params.revenue0, lastRevenue, params.years),
    formula: 'FCFF = EBIT·(1−T) + D&A − capex − ΔNWC',
  }
}

/**
 * Projeta a demonstração de caixa plurianual.
 * ΔNWC do ano 1 usa o NWC do ano-base (receita0·nwcPct) como referência.
 */
export function projectFinancials(i: ProjectionInput): ProjectionResult {
  return buildProjection({
    revenue0: i.revenue0,
    years: i.years,
    growthAtFn: (year) => growthAt(i.revenueGrowth, year),
    marginAtFn: () => i.ebitdaMargin,
    capexPctRevenue: i.capexPctRevenue,
    nwcPctRevenue: i.nwcPctRevenue,
    taxRate: i.taxRate,
    daPctRevenue: i.daPctRevenue ?? 0,
  })
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

// ─────────────────────────────────────────────────────────────────────────────
// Analytics adicionais de planejamento de longo prazo (aditivas, retrocompatíveis).
// ─────────────────────────────────────────────────────────────────────────────

/** Premissas operacionais compartilhadas (sem receita-base, crescimento, horizonte ou margem). */
export type ProjectionOpts = Omit<ProjectionInput, 'revenue0' | 'revenueGrowth' | 'years' | 'ebitdaMargin'> & {
  ebitdaMargin: number
}

/**
 * Variante de `projectFinancials` com uma taxa de crescimento DIFERENTE por ano
 * (ramp-down / curva-S), em vez de uma taxa constante. O horizonte é o comprimento do
 * vetor. Reusa exatamente a mesma matemática de FCFF — quando todas as taxas são iguais,
 * o resultado coincide com o crescimento constante equivalente.
 */
export function perYearGrowth(
  revenue0: number,
  growthByYear: number[],
  opts: ProjectionOpts,
): ProjectionResult {
  return buildProjection({
    revenue0,
    years: growthByYear.length,
    growthAtFn: (year) => growthAt(growthByYear, year),
    marginAtFn: () => opts.ebitdaMargin,
    capexPctRevenue: opts.capexPctRevenue,
    nwcPctRevenue: opts.nwcPctRevenue,
    taxRate: opts.taxRate,
    daPctRevenue: opts.daPctRevenue ?? 0,
  })
}

export interface PlanValuationInput {
  wacc: number            // taxa de desconto (decimal)
  terminalGrowth: number  // crescimento perpétuo g de Gordon (decimal)
  netDebt?: number        // dívida líquida para a ponte EV→equity (opcional)
}

/**
 * Ancora o plano a um valor: desconta o FCFF projetado (PV explícito) e soma o valor
 * terminal de Gordon, entregando o Enterprise Value do plano. Reusa o motor `dcf`.
 */
export function planValuation(projection: ProjectionResult, i: PlanValuationInput): DcfResult {
  const fcff = projection.rows.map((r) => r.fcff)
  return dcf({
    fcff,
    discountRate: i.wacc,
    terminalGrowth: i.terminalGrowth,
    netDebt: i.netDebt,
  })
}

export interface FundingGapInput {
  startingCash: number  // caixa disponível no ano 0
  minCash: number       // colchão mínimo de caixa exigido em qualquer ano
}

export interface FundingGapYear {
  year: number
  fcff: number
  cash: number       // caixa acumulado ao fim do ano = startingCash + FCFF acumulado
  belowMin: boolean  // caiu abaixo do colchão mínimo neste ano
}

export interface FundingGapResult {
  rows: FundingGapYear[]
  breachYears: number[]     // anos em que o caixa fica abaixo do mínimo
  troughYear: number | null // ano do menor caixa (vale de liquidez)
  troughCash: number        // menor caixa projetado
  peakFundingNeed: number   // capital a captar para nunca furar o mínimo = max(0, minCash − vale)
  minCash: number
}

/**
 * Trajetória de caixa ano a ano a partir do FCFF projetado. Sinaliza os anos em que o caixa
 * fura o colchão mínimo e calcula o pico de necessidade de capital (quanto captar para que o
 * caixa nunca caia abaixo de `minCash`). Crítico para dimensionar a captação de um LRP.
 */
export function fundingGap(projection: ProjectionResult, i: FundingGapInput): FundingGapResult {
  const rows: FundingGapYear[] = []
  const breachYears: number[] = []
  let troughYear: number | null = null
  let troughCash = Number.POSITIVE_INFINITY

  for (const r of projection.rows) {
    const cash = i.startingCash + r.cumulativeFcff
    const belowMin = cash < i.minCash
    if (belowMin) breachYears.push(r.year)
    if (cash < troughCash) {
      troughCash = cash
      troughYear = r.year
    }
    rows.push({ year: r.year, fcff: r.fcff, cash, belowMin })
  }

  if (!Number.isFinite(troughCash)) troughCash = i.startingCash
  const peakFundingNeed = Math.max(0, i.minCash - troughCash)

  return { rows, breachYears, troughYear, troughCash, peakFundingNeed, minCash: i.minCash }
}

/** Premissas de custo/intensidade de capital usadas pela rampa de margem. */
export interface MarginRampCostInput {
  capexPctRevenue: number
  nwcPctRevenue: number
  taxRate: number
  daPctRevenue?: number
}

/**
 * Projeção em que a margem EBITDA sobe LINEARMENTE de `marginStart` (ano 1) até `marginEnd`
 * (ano N) — captura alavancagem operacional / ganho de escala ao longo do plano. Aceita
 * crescimento constante ou vetor por ano. Reusa o mesmo núcleo de FCFF.
 */
export function marginRamp(
  revenue0: number,
  years: number,
  growth: number | number[],
  marginStart: number,
  marginEnd: number,
  opts: MarginRampCostInput,
): ProjectionResult {
  // Fator linear: 0 no ano 1, 1 no ano N (horizonte de 1 ano fica na margem final).
  const marginAtFn = (year: number): number => {
    if (years <= 1) return marginEnd
    const factor = (year - 1) / (years - 1)
    return marginStart + (marginEnd - marginStart) * factor
  }
  return buildProjection({
    revenue0,
    years,
    growthAtFn: (year) => growthAt(growth, year),
    marginAtFn,
    capexPctRevenue: opts.capexPctRevenue,
    nwcPctRevenue: opts.nwcPctRevenue,
    taxRate: opts.taxRate,
    daPctRevenue: opts.daPctRevenue ?? 0,
  })
}

/**
 * Primeiro ano em que o FCFF acumulado do plano vira positivo (payback do plano), com
 * interpolação linear dentro do ano de cruzamento. Parte de um caixa acumulado 0 no ano 0.
 * Retorna null se o acumulado nunca fica positivo.
 */
export function breakEvenYear(projection: ProjectionResult): number | null {
  let prev = 0 // FCFF acumulado do plano no ano 0
  for (const r of projection.rows) {
    if (prev < 0 && r.cumulativeFcff >= 0) {
      // Interpola entre (ano−1, prev) e (ano, acumulado).
      return (r.year - 1) + (-prev) / (r.cumulativeFcff - prev)
    }
    prev = r.cumulativeFcff
  }
  // Nunca cruzou de negativo para positivo: ou já nasce positivo, ou nunca recupera.
  if (projection.rows.length > 0 && projection.rows[0].cumulativeFcff >= 0) {
    return projection.rows[0].year
  }
  return null
}

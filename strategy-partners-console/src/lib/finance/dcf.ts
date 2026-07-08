// ─────────────────────────────────────────────────────────────────────────────
// DCF / WACC — valuation por fluxo de caixa descontado, ao estilo Damodaran/Koller.
//
// WACC via CAPM com prêmio de risco-país (CRP) para mercados emergentes (Brasil),
// beta desalavancado→realavancado, valor terminal por Gordon OU múltiplo de saída,
// ponte EV→equity com dívida líquida. Cada resultado carrega fórmula + premissas
// para ser auditável (nunca "a IA estimou").
// ─────────────────────────────────────────────────────────────────────────────

import { npv } from './irr'

/** Desalavanca um beta (Hamada): βu = βl / (1 + (1−T)·D/E). */
export function unleverBeta(leveredBeta: number, debtToEquity: number, taxRate: number): number {
  return leveredBeta / (1 + (1 - taxRate) * debtToEquity)
}

/** Realavanca um beta para uma estrutura de capital alvo: βl = βu · (1 + (1−T)·D/E). */
export function releverBeta(unleveredBeta: number, debtToEquity: number, taxRate: number): number {
  return unleveredBeta * (1 + (1 - taxRate) * debtToEquity)
}

export interface CapmInput {
  riskFree: number      // Rf (decimal, ex.: 0.105)
  beta: number          // beta (re)alavancado
  equityRiskPremium: number // ERP maduro (ex.: 0.046)
  countryRiskPremium?: number // CRP (ex.: 0.03 Brasil) — Damodaran
  sizePremium?: number  // prêmio de tamanho (ex.: 0.025)
}

/** Custo de capital próprio: Ke = Rf + β·ERP + CRP + size premium. */
export function costOfEquityCAPM(i: CapmInput): number {
  return i.riskFree + i.beta * i.equityRiskPremium + (i.countryRiskPremium ?? 0) + (i.sizePremium ?? 0)
}

export interface WaccInput {
  costOfEquity: number  // Ke (decimal)
  costOfDebt: number    // Kd pré-imposto (decimal)
  taxRate: number       // T (decimal)
  equityValue: number   // E (valor de mercado do equity)
  debtValue: number     // D (dívida)
}

export interface WaccResult {
  wacc: number
  equityWeight: number
  debtWeight: number
  afterTaxCostOfDebt: number
  formula: string
}

/** WACC = (E/V)·Ke + (D/V)·Kd·(1−T). */
export function wacc(i: WaccInput): WaccResult {
  const V = i.equityValue + i.debtValue
  const we = V === 0 ? 1 : i.equityValue / V
  const wd = V === 0 ? 0 : i.debtValue / V
  const afterTaxKd = i.costOfDebt * (1 - i.taxRate)
  return {
    wacc: we * i.costOfEquity + wd * afterTaxKd,
    equityWeight: we,
    debtWeight: wd,
    afterTaxCostOfDebt: afterTaxKd,
    formula: 'WACC = (E/V)·Ke + (D/V)·Kd·(1−T)',
  }
}

export interface DcfInput {
  /** FCFF projetado por período (ano 1..N). Não inclua o ano 0. */
  fcff: number[]
  /** Taxa de desconto (WACC) em decimal. */
  discountRate: number
  /** Crescimento perpétuo g (Gordon). Informe isto OU exitMultiple. */
  terminalGrowth?: number
  /** Múltiplo de saída aplicado à métrica terminal (ex.: EV/EBITDA de saída). */
  exitMultiple?: number
  /** Métrica terminal para o múltiplo de saída (ex.: EBITDA do ano N). */
  terminalMetric?: number
  /** Dívida líquida (dívida − caixa) para a ponte EV→equity. */
  netDebt?: number
  /** Ações em circulação para preço por ação (opcional). */
  sharesOutstanding?: number
}

export interface DcfResult {
  enterpriseValue: number
  pvExplicit: number
  pvTerminal: number
  terminalValue: number
  terminalMethod: 'gordon' | 'exit_multiple'
  equityValue: number | null
  valuePerShare: number | null
  discountRate: number
  formula: string
  steps: string[]
}

/**
 * DCF completo. Desconta os FCFF explícitos + valor terminal (Gordon ou múltiplo de saída),
 * pela dívida líquida chega ao equity e (se houver ações) ao preço por ação.
 */
export function dcf(i: DcfInput): DcfResult {
  const r = i.discountRate
  const n = i.fcff.length
  const steps: string[] = []

  // PV dos FCFF explícitos (ano 1..N descontados). Usamos npv com cf0=0.
  const pvExplicit = npv(r, [0, ...i.fcff])
  steps.push(`PV explícito = Σ FCFF_t/(1+${(r * 100).toFixed(2)}%)^t = ${pvExplicit.toFixed(2)}`)

  // Valor terminal no ano N.
  let terminalValue: number
  let terminalMethod: DcfResult['terminalMethod']
  if (i.exitMultiple != null && i.terminalMetric != null) {
    terminalValue = i.exitMultiple * i.terminalMetric
    terminalMethod = 'exit_multiple'
    steps.push(`Valor terminal (múltiplo de saída) = ${i.exitMultiple}x · ${i.terminalMetric.toFixed(2)} = ${terminalValue.toFixed(2)}`)
  } else {
    const g = i.terminalGrowth ?? 0
    if (r <= g) throw new Error('WACC deve ser maior que g para Gordon (valor terminal divergente).')
    const lastFcff = i.fcff[n - 1] ?? 0
    terminalValue = (lastFcff * (1 + g)) / (r - g)
    terminalMethod = 'gordon'
    steps.push(`Valor terminal (Gordon) = FCFF_N·(1+g)/(WACC−g) = ${lastFcff.toFixed(2)}·(1+${(g * 100).toFixed(1)}%)/(${(r * 100).toFixed(2)}%−${(g * 100).toFixed(1)}%) = ${terminalValue.toFixed(2)}`)
  }

  const pvTerminal = terminalValue / Math.pow(1 + r, n)
  steps.push(`PV do valor terminal = ${terminalValue.toFixed(2)}/(1+${(r * 100).toFixed(2)}%)^${n} = ${pvTerminal.toFixed(2)}`)

  const enterpriseValue = pvExplicit + pvTerminal
  steps.push(`Enterprise Value = PV explícito + PV terminal = ${enterpriseValue.toFixed(2)}`)

  let equityValue: number | null = null
  let valuePerShare: number | null = null
  if (i.netDebt != null) {
    equityValue = enterpriseValue - i.netDebt
    steps.push(`Equity = EV − dívida líquida = ${enterpriseValue.toFixed(2)} − ${i.netDebt.toFixed(2)} = ${equityValue.toFixed(2)}`)
    if (i.sharesOutstanding && i.sharesOutstanding > 0) {
      valuePerShare = equityValue / i.sharesOutstanding
      steps.push(`Preço por ação = Equity / ações = ${valuePerShare.toFixed(4)}`)
    }
  }

  return {
    enterpriseValue,
    pvExplicit,
    pvTerminal,
    terminalValue,
    terminalMethod,
    equityValue,
    valuePerShare,
    discountRate: r,
    formula: 'EV = Σ FCFF_t/(1+WACC)^t + TV_N/(1+WACC)^N ; Equity = EV − DívidaLíquida',
    steps,
  }
}

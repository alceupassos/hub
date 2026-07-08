// ─────────────────────────────────────────────────────────────────────────────
// PPA — Purchase Price Allocation (alocação do preço de compra).
//
// Aloca a consideração ao valor justo dos ativos líquidos identificáveis (incl.
// step-up de tangíveis + intangíveis identificados, líquido de passivo fiscal
// diferido) e apura o goodwill residual. Calcula a amortização anual dos
// intangíveis e o D&A incremental do step-up. Base: CPC 15 / IFRS 3.
// ─────────────────────────────────────────────────────────────────────────────

export interface IdentifiedIntangible {
  name: string
  fairValue: number
  usefulLifeYears: number // 0 = vida indefinida (não amortiza; ex.: marca)
}

export interface PpaInput {
  /** Consideração total transferida (preço pago pelo equity). */
  purchaseConsideration: number
  /** Valor contábil do patrimônio líquido adquirido. */
  bookNetAssets: number
  /** Step-up (mais-valia) de ativos tangíveis a valor justo. */
  tangibleStepUp?: number
  /** Vida útil (anos) do step-up tangível p/ D&A incremental. */
  tangibleStepUpLifeYears?: number
  /** Intangíveis identificados a valor justo. */
  intangibles?: IdentifiedIntangible[]
  /** Alíquota p/ passivo fiscal diferido sobre step-up/intangíveis (0 = sem DTL). */
  deferredTaxRate?: number
}

export interface PpaResult {
  fairValueAdjustments: number
  deferredTaxLiability: number
  fairValueNetIdentifiableAssets: number
  goodwill: number
  annualIntangibleAmortization: number
  annualTangibleStepUpDA: number
  annualIncrementalDA: number
  steps: string[]
}

export function ppa(i: PpaInput): PpaResult {
  const stepUp = i.tangibleStepUp ?? 0
  const intangibles = i.intangibles ?? []
  const intangiblesTotal = intangibles.reduce((a, x) => a + x.fairValue, 0)
  const dtRate = i.deferredTaxRate ?? 0

  const fairValueAdjustments = stepUp + intangiblesTotal
  const deferredTaxLiability = fairValueAdjustments * dtRate
  const fairValueNetIdentifiableAssets = i.bookNetAssets + fairValueAdjustments - deferredTaxLiability
  const goodwill = i.purchaseConsideration - fairValueNetIdentifiableAssets

  const annualIntangibleAmortization = intangibles.reduce(
    (a, x) => a + (x.usefulLifeYears > 0 ? x.fairValue / x.usefulLifeYears : 0), 0,
  )
  const annualTangibleStepUpDA = i.tangibleStepUpLifeYears && i.tangibleStepUpLifeYears > 0
    ? stepUp / i.tangibleStepUpLifeYears : 0

  const steps = [
    `Ajustes a valor justo = step-up tangível (${stepUp.toFixed(2)}) + intangíveis (${intangiblesTotal.toFixed(2)}) = ${fairValueAdjustments.toFixed(2)}`,
    `Passivo fiscal diferido = ${(dtRate * 100).toFixed(1)}% · ${fairValueAdjustments.toFixed(2)} = ${deferredTaxLiability.toFixed(2)}`,
    `Ativos líquidos identificáveis a valor justo = PL contábil (${i.bookNetAssets.toFixed(2)}) + ajustes − DTL = ${fairValueNetIdentifiableAssets.toFixed(2)}`,
    `Goodwill = consideração (${i.purchaseConsideration.toFixed(2)}) − ativos líquidos a valor justo = ${goodwill.toFixed(2)}`,
  ]

  return {
    fairValueAdjustments,
    deferredTaxLiability,
    fairValueNetIdentifiableAssets,
    goodwill,
    annualIntangibleAmortization,
    annualTangibleStepUpDA,
    annualIncrementalDA: annualIntangibleAmortization + annualTangibleStepUpDA,
    steps,
  }
}

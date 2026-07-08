// ─────────────────────────────────────────────────────────────────────────────
// Accretion / Dilution — análise de consequências de fusão (merger consequences).
//
// Modela consideração em caixa, ações ou mista: EPS pró-forma, %accretion/dilution
// e sinergias de breakeven. Convenção padrão de banking:
//   • Ações emitidas = parcela em ações do preço / preço do adquirente.
//   • Custo do caixa = juros pós-imposto sobre a dívida nova (ou juros perdidos do caixa).
//   • Lucro pró-forma = LucroAdq + LucroAlvo + Sinergias·(1−T) − JurosCaixa·(1−T).
// ─────────────────────────────────────────────────────────────────────────────

export interface AccretionInput {
  acquirerNetIncome: number
  acquirerShares: number
  acquirerSharePrice: number
  targetNetIncome: number
  /** Preço total de aquisição do equity do alvo (offer value). */
  offerValue: number
  /** Fração paga em caixa (0..1). O restante é em ações. */
  cashPct: number
  /** Custo pré-imposto da dívida/caixa usado (decimal). */
  cashFinancingRate: number
  taxRate: number
  /** Sinergias pré-imposto anuais (default 0). */
  preTaxSynergies?: number
}

export interface AccretionResult {
  acquirerEPS: number
  proFormaEPS: number
  accretionDilution: number      // decimal: >0 accretive, <0 dilutive
  newSharesIssued: number
  proFormaNetIncome: number
  proFormaShares: number
  afterTaxCashCost: number
  breakevenPreTaxSynergies: number
  verdict: 'accretive' | 'dilutive' | 'neutral'
  formula: string
}

export function accretionDilution(i: AccretionInput): AccretionResult {
  const cashPct = Math.max(0, Math.min(1, i.cashPct))
  const stockPortion = i.offerValue * (1 - cashPct)
  const cashPortion = i.offerValue * cashPct

  const newSharesIssued = i.acquirerSharePrice > 0 ? stockPortion / i.acquirerSharePrice : 0
  const afterTaxCashCost = cashPortion * i.cashFinancingRate * (1 - i.taxRate)
  const afterTaxSynergies = (i.preTaxSynergies ?? 0) * (1 - i.taxRate)

  const proFormaNetIncome = i.acquirerNetIncome + i.targetNetIncome + afterTaxSynergies - afterTaxCashCost
  const proFormaShares = i.acquirerShares + newSharesIssued

  const acquirerEPS = i.acquirerShares > 0 ? i.acquirerNetIncome / i.acquirerShares : 0
  const proFormaEPS = proFormaShares > 0 ? proFormaNetIncome / proFormaShares : 0
  const accretionDilution = acquirerEPS > 0 ? proFormaEPS / acquirerEPS - 1 : 0

  // Sinergias pré-imposto que zeram a diluição: proFormaEPS = acquirerEPS
  // acquirerEPS·proShares = NIadq + NIalvo + Syn·(1−T) − custoCaixa
  const requiredProNI = acquirerEPS * proFormaShares
  const neededAfterTaxSyn = requiredProNI - (i.acquirerNetIncome + i.targetNetIncome - afterTaxCashCost)
  const breakevenPreTaxSynergies = i.taxRate < 1 ? neededAfterTaxSyn / (1 - i.taxRate) : 0

  const verdict: AccretionResult['verdict'] =
    Math.abs(accretionDilution) < 1e-6 ? 'neutral' : accretionDilution > 0 ? 'accretive' : 'dilutive'

  return {
    acquirerEPS,
    proFormaEPS,
    accretionDilution,
    newSharesIssued,
    proFormaNetIncome,
    proFormaShares,
    afterTaxCashCost,
    breakevenPreTaxSynergies,
    verdict,
    formula: 'EPS_pf = (NI_adq + NI_alvo + Sin·(1−T) − JurosCaixa·(1−T)) / (Ações_adq + Ações_novas)',
  }
}

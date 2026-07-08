// ─────────────────────────────────────────────────────────────────────────────
// Estruturação tributária — asset deal vs stock deal, ágio (Brasil) e tax shield.
//
// • Asset deal: comprador ganha base "step-up" e amortiza/deprecia → escudo fiscal.
// • Stock deal: base histórica (carryover), sem step-up (regra geral) → sem escudo.
// • Ágio por rentabilidade futura (Brasil, Lei 12.973/2014): amortizável para fins
//   fiscais em até 60 meses (5 anos) após incorporação → escudo = ágio · alíquota.
// Fornece o PV do escudo fiscal e uma comparação asset vs stock.
// ─────────────────────────────────────────────────────────────────────────────

/** PV de um escudo fiscal linear: (base/anos)·alíquota, descontado por `discountRate`. */
export function taxShieldPV(base: number, taxRate: number, years: number, discountRate: number): number {
  if (years <= 0) return 0
  const annualShield = (base / years) * taxRate
  let pv = 0
  for (let t = 1; t <= years; t++) pv += annualShield / Math.pow(1 + discountRate, t)
  return pv
}

export interface AgioInput {
  /** Ágio (goodwill por rentabilidade futura) apurado na aquisição. */
  agio: number
  /** Alíquota combinada IRPJ+CSLL (Brasil ~34%). */
  taxRate: number
  /** Prazo de amortização fiscal em anos (Brasil: até 5). */
  amortizationYears?: number
  /** Taxa de desconto p/ o PV do benefício. */
  discountRate: number
}

export interface AgioResult {
  annualTaxShield: number
  nominalTaxShield: number
  presentValueTaxShield: number
  amortizationYears: number
  note: string
}

/** Benefício fiscal do ágio amortizável (Brasil). */
export function agioTaxBenefit(i: AgioInput): AgioResult {
  const years = i.amortizationYears ?? 5
  const annualTaxShield = (i.agio / years) * i.taxRate
  return {
    annualTaxShield,
    nominalTaxShield: annualTaxShield * years,
    presentValueTaxShield: taxShieldPV(i.agio, i.taxRate, years, i.discountRate),
    amortizationYears: years,
    note: 'Ágio por rentabilidade futura amortizável em até 60 meses após incorporação (Lei 12.973/2014); exige laudo e propósito negocial.',
  }
}

export interface AssetVsStockInput {
  purchasePrice: number
  /** Base fiscal step-up disponível num asset deal (tipicamente step-up + intangíveis + ágio dedutível). */
  stepUpBase: number
  taxRate: number
  amortizationYears: number
  discountRate: number
}

export interface AssetVsStockResult {
  assetDealTaxShieldPV: number
  stockDealTaxShieldPV: number
  advantageOfAssetDeal: number
  recommendation: string
}

/** Compara o valor do escudo fiscal entre asset deal (com step-up) e stock deal (sem). */
export function compareAssetVsStock(i: AssetVsStockInput): AssetVsStockResult {
  const assetPV = taxShieldPV(i.stepUpBase, i.taxRate, i.amortizationYears, i.discountRate)
  const stockPV = 0 // sem step-up dedutível na aquisição de quotas/ações (regra geral)
  const advantage = assetPV - stockPV
  return {
    assetDealTaxShieldPV: assetPV,
    stockDealTaxShieldPV: stockPV,
    advantageOfAssetDeal: advantage,
    recommendation: advantage > 0
      ? `Asset deal gera ~${advantage.toFixed(0)} de escudo fiscal a valor presente que o stock deal não captura — negociar preço/estrutura considerando isso (e o custo tributário do vendedor).`
      : 'Sem vantagem fiscal material de step-up; avaliar riscos de sucessão (passivos ocultos) que pendem a favor do asset deal por outras razões.',
  }
}

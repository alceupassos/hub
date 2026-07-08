import { describe, it, expect } from 'vitest'
import { npv, irr, xirr, moic, moicSimple, payback, cagr } from '../irr'
import { costOfEquityCAPM, wacc, unleverBeta, releverBeta, dcf } from '../dcf'
import { lbo } from '../lbo'
import { accretionDilution } from '../accretion_dilution'
import { percentile, stats, impliedValuation, footballField } from '../comps'
import { ppa } from '../ppa'
import { taxShieldPV, agioTaxBenefit, compareAssetVsStock } from '../tax'
import { dataTable2D, tornado } from '../sensitivity'
import { computeProcessRoi, DEFAULT_WORKSTREAMS } from '../processRoi'

const near = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol)

describe('irr / npv / moic (núcleo numérico)', () => {
  it('npv zero na taxa de equilíbrio', () => {
    near(npv(0.1, [-100, 110]), 0)
  })
  it('irr de duplicação em 5 anos = 2^(1/5)-1', () => {
    const r = irr([-1000, 0, 0, 0, 0, 2000])
    expect(r.converged).toBe(true)
    near(r.irr!, Math.pow(2, 1 / 5) - 1, 1e-6)
  })
  it('irr de fluxo simples 10%', () => {
    const r = irr([-100, 110])
    near(r.irr!, 0.1, 1e-8)
  })
  it('moic e payback', () => {
    near(moic([-1000, 0, 2000]), 2)
    near(moicSimple(500, 851.995), 1.70399, 1e-5)
    near(payback([-100, 50, 50, 50])!, 2)
  })
  it('cagr', () => {
    near(cagr(100, 200, 5), Math.pow(2, 1 / 5) - 1)
  })
  it('xirr aproxima irr para datas anuais', () => {
    const r = xirr([
      { amount: -1000, date: '2020-01-01' },
      { amount: 2000, date: '2025-01-01' },
    ])
    expect(r.converged).toBe(true)
    // ~ 2^(1/5)-1, com pequena diferença por anos bissextos (ACT/365)
    expect(Math.abs(r.irr! - (Math.pow(2, 1 / 5) - 1))).toBeLessThan(0.005)
  })
})

describe('dcf / wacc (Damodaran/Koller)', () => {
  it('CAPM com CRP e size premium', () => {
    // Ke = 0.105 + 1.0*0.046 + 0.03 = 0.181
    near(costOfEquityCAPM({ riskFree: 0.105, beta: 1, equityRiskPremium: 0.046, countryRiskPremium: 0.03 }), 0.181)
  })
  it('WACC = (E/V)Ke + (D/V)Kd(1-T)', () => {
    const w = wacc({ costOfEquity: 0.15, costOfDebt: 0.1, taxRate: 0.34, equityValue: 700, debtValue: 300 })
    near(w.wacc, 0.7 * 0.15 + 0.3 * 0.1 * 0.66)
    near(w.wacc, 0.1248)
  })
  it('beta desalavanca e realavanca (round-trip)', () => {
    const bu = unleverBeta(1.2, 0.5, 0.34)
    near(releverBeta(bu, 0.5, 0.34), 1.2, 1e-9)
  })
  it('identidade da perpetuidade: DCF 5 anos + TV Gordon(g=0) = perpetuidade', () => {
    const r = dcf({ fcff: [10, 10, 10, 10, 10], discountRate: 0.1, terminalGrowth: 0 })
    near(r.enterpriseValue, 100, 1e-6) // perpetuidade de 10 a 10% = 100
  })
  it('ponte EV→equity→por ação', () => {
    const r = dcf({ fcff: [10, 10, 10, 10, 10], discountRate: 0.1, terminalGrowth: 0, netDebt: 30, sharesOutstanding: 7 })
    near(r.equityValue!, 70, 1e-6)
    near(r.valuePerShare!, 10, 1e-6)
  })
  it('lança erro se WACC <= g', () => {
    expect(() => dcf({ fcff: [10], discountRate: 0.03, terminalGrowth: 0.05 })).toThrow()
  })
})

describe('lbo (identidades de PE)', () => {
  const model = lbo({
    entryEbitda: 100, entryMultiple: 10, exitMultiple: 10, holdYears: 5,
    ebitdaGrowth: 0,
    tranches: [{ name: 'Senior', turns: 5, rate: 0.08 }],
    taxRate: 0,
  })
  it('sources & uses: cheque do sponsor = EV - dívida', () => {
    near(model.entryEV, 1000)
    near(model.totalDebtAtEntry, 500)
    near(model.sponsorEquity, 500)
  })
  it('cash sweep amortiza a dívida ao longo do hold', () => {
    expect(model.exitNetDebt).toBeLessThan(model.totalDebtAtEntry)
    expect(model.moic).toBeGreaterThan(1)
  })
  it('IRR é consistente com MOIC (entrada/saída únicas)', () => {
    // sponsorEquity·(1+IRR)^5 ≈ proceeds
    near(model.sponsorEquity * Math.pow(1 + model.irr!, 5), model.sponsorExitProceeds, 1e-2)
  })
  it('atribuição: sem crescimento nem expansão de múltiplo, todo o ganho vem da desalavancagem', () => {
    near(model.attribution.ebitdaGrowth, 0, 1e-6)
    near(model.attribution.multipleExpansion, 0, 1e-6)
    // bridge fecha com o ganho de equity value (entryEquityValue = EV - dívida)
    const entryEquityValue = model.entryEV - model.totalDebtAtEntry
    near(model.attribution.total, model.exitEquity - entryEquityValue, 1e-2)
  })
})

describe('accretion / dilution', () => {
  it('all-stock accretive quando P/E do adquirente > P/E do alvo', () => {
    const r = accretionDilution({
      acquirerNetIncome: 100, acquirerShares: 100, acquirerSharePrice: 20,
      targetNetIncome: 20, offerValue: 200, cashPct: 0, cashFinancingRate: 0, taxRate: 0.34,
    })
    near(r.acquirerEPS, 1)
    near(r.newSharesIssued, 10)
    near(r.proFormaEPS, 120 / 110, 1e-9)
    near(r.accretionDilution, 120 / 110 - 1, 1e-9)
    expect(r.verdict).toBe('accretive')
  })
})

describe('comps (estatística + implícito)', () => {
  it('percentis lineares (R-7 / Excel INC)', () => {
    near(percentile([1, 2, 3, 4, 5], 50), 3)
    near(percentile([1, 2, 3, 4, 5], 25), 2)
    near(percentile([1, 2, 3, 4, 5], 75), 4)
  })
  it('valuation implícito por múltiplos dos pares', () => {
    const v = impliedValuation('EBITDA', 100, [8, 10, 12])
    near(v.base, 1000) // mediana 10x
    near(v.low, 900)   // p25 = 9x
    near(v.high, 1100) // p75 = 11x
  })
  it('football field agrega faixas', () => {
    const ff = footballField([
      { method: 'DCF', low: 900, base: 1000, high: 1100 },
      { method: 'Comps', low: 800, base: 950, high: 1200 },
      { method: 'Precedentes', low: 1000, base: 1100, high: 1300 },
    ])
    near(ff.overallBase, 1000) // mediana das bases {950,1000,1100}
  })
})

describe('ppa (goodwill / step-up)', () => {
  it('goodwill residual e D&A incremental', () => {
    const r = ppa({
      purchaseConsideration: 1000,
      bookNetAssets: 400,
      tangibleStepUp: 100, tangibleStepUpLifeYears: 10,
      intangibles: [{ name: 'Marca', fairValue: 200, usefulLifeYears: 0 }, { name: 'Tecnologia', fairValue: 100, usefulLifeYears: 5 }],
      deferredTaxRate: 0.34,
    })
    near(r.fairValueAdjustments, 400)
    near(r.deferredTaxLiability, 136)
    near(r.fairValueNetIdentifiableAssets, 664)
    near(r.goodwill, 336)
    near(r.annualIntangibleAmortization, 20) // só a tecnologia (marca é indefinida)
    near(r.annualIncrementalDA, 30)           // 20 + 10 (step-up 100/10)
  })
})

describe('tax (escudo fiscal / ágio Brasil)', () => {
  it('PV do escudo fiscal linear', () => {
    // 500/5*0.34 = 34/ano, 5 anos a 10%
    near(taxShieldPV(500, 0.34, 5, 0.1), 34 * ((1 - Math.pow(1.1, -5)) / 0.1), 1e-6)
  })
  it('benefício do ágio (amortização em 5 anos)', () => {
    const r = agioTaxBenefit({ agio: 336, taxRate: 0.34, amortizationYears: 5, discountRate: 0.1 })
    near(r.annualTaxShield, (336 / 5) * 0.34)
    expect(r.presentValueTaxShield).toBeGreaterThan(0)
  })
  it('asset deal captura escudo que o stock deal não tem', () => {
    const r = compareAssetVsStock({ purchasePrice: 1000, stepUpBase: 500, taxRate: 0.34, amortizationYears: 5, discountRate: 0.1 })
    expect(r.assetDealTaxShieldPV).toBeGreaterThan(0)
    near(r.stockDealTaxShieldPV, 0)
    near(r.advantageOfAssetDeal, r.assetDealTaxShieldPV)
  })
})

describe('processRoi (comparador IA vs tradicional)', () => {
  const r = computeProcessRoi({ hourlyRate: 500, numTargets: 3, aiMonthlyCost: 20000, mandateMonths: 6 })
  it('IA reduz custo e prazo vs tradicional', () => {
    expect(r.totalAiCost).toBeLessThan(r.totalTraditionalCost)
    expect(r.totalDaysSaved).toBeGreaterThan(0)
    expect(r.savingsPct).toBeGreaterThan(0)
    expect(r.savingsPct).toBeLessThanOrEqual(1)
  })
  it('cobre pré e pós-deal', () => {
    expect(r.phases.map(p => p.phase).sort()).toEqual(['post_deal', 'pre_deal'])
  })
  it('balanço tem itens + e −', () => {
    expect(r.balance.some(b => b.sign === '+')).toBe(true)
    expect(r.balance.some(b => b.sign === '-')).toBe(true)
  })
  it('horas de IA = tradicional·(1−compressão) por workstream', () => {
    const first = r.perWorkstream[0]
    const def = DEFAULT_WORKSTREAMS.find(w => w.key === first.key)!
    // sourcing escala com numTargets=3
    near(first.traditionalHours, def.baseHours * 3)
    near(first.aiHours, first.traditionalHours * (1 - def.aiCompression), 1e-6)
  })
})

describe('sensitivity', () => {
  it('data table 2D avalia a função na grade', () => {
    const t = dataTable2D('a', [1, 2], 'b', [10, 20], (a, b) => a * b)
    expect(t.matrix).toEqual([[10, 20], [20, 40]])
  })
  it('tornado ordena por swing', () => {
    const r = tornado(100, [
      { name: 'pequeno', low: () => 95, high: () => 105 },
      { name: 'grande', low: () => 70, high: () => 130 },
    ])
    expect(r.factors[0].name).toBe('grande')
    near(r.factors[0].swing, 60)
  })
})

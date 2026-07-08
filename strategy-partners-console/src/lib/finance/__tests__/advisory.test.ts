import { describe, it, expect } from 'vitest'
import {
  amortizationSchedule,
  coverageRatios,
  covenantHeadroom,
  compareRefinancing,
} from '../debtRestructuring'
import { roicWaccSpread, capitalAllocation, valueDrivers } from '../valueCreation'
import { projectFinancials, runPlanScenarios } from '../longRangePlan'

const near = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol)

describe('debtRestructuring — amortização', () => {
  it('bullet: só juros até o fim, principal integral no último ano; soma = principal', () => {
    const s = amortizationSchedule(1000, 0.1, 5, 'bullet')
    for (let y = 0; y < 4; y++) {
      near(s.rows[y].principalPayment, 0)
      near(s.rows[y].interest, 100) // 1000 · 10%
    }
    near(s.rows[4].principalPayment, 1000)
    near(s.rows.reduce((a, r) => a + r.principalPayment, 0), 1000)
    near(s.totalInterest, 500) // 100 · 5
  })

  it('linear (SAC): amortização de principal constante; soma = principal', () => {
    const s = amortizationSchedule(1000, 0.1, 5, 'linear')
    s.rows.forEach(r => near(r.principalPayment, 200))
    near(s.rows.reduce((a, r) => a + r.principalPayment, 0), 1000)
    // juros decrescentes: 1º ano > último ano
    expect(s.rows[0].interest).toBeGreaterThan(s.rows[4].interest)
  })

  it('francês (Price): prestação constante; soma de principal = principal', () => {
    const s = amortizationSchedule(1000, 0.1, 5, 'french')
    const pmt = s.rows[0].payment
    s.rows.forEach(r => near(r.payment, pmt, 1e-6))
    near(s.rows.reduce((a, r) => a + r.principalPayment, 0), 1000, 1e-6)
    // PMT esperado = 1000·0.1/(1−1.1^−5)
    near(pmt, (1000 * 0.1) / (1 - Math.pow(1.1, -5)), 1e-6)
  })

  it('francês com juros zero degenera para P/n', () => {
    const s = amortizationSchedule(1000, 0, 4, 'french')
    s.rows.forEach(r => near(r.payment, 250))
    near(s.totalInterest, 0)
  })
})

describe('debtRestructuring — cobertura e covenants', () => {
  it('DSCR e ICR são EBITDA/serviço e EBITDA/juros', () => {
    const r = coverageRatios({ ebitda: 300, debtService: 200, interest: 120 })
    near(r.dscr, 1.5)
    near(r.icr, 2.5)
  })

  it('detecta quebra de covenant de alavancagem', () => {
    const r = covenantHeadroom({ netDebt: 420, ebitda: 100, maxLeverage: 3.5, minCoverage: 1.25, actualCoverage: 1.4 })
    near(r.actualLeverage, 4.2)
    expect(r.leverageBreach).toBe(true)
    expect(r.anyBreach).toBe(true)
    expect(r.leverageHeadroom).toBeLessThan(0)
  })

  it('detecta quebra de covenant de cobertura', () => {
    const r = covenantHeadroom({ netDebt: 200, ebitda: 100, maxLeverage: 3.5, minCoverage: 1.25, actualCoverage: 1.1 })
    expect(r.leverageBreach).toBe(false)
    expect(r.coverageBreach).toBe(true)
    expect(r.anyBreach).toBe(true)
  })

  it('sem quebra reporta folga positiva', () => {
    const r = covenantHeadroom({ netDebt: 200, ebitda: 100, maxLeverage: 3.5, minCoverage: 1.25, actualCoverage: 2 })
    expect(r.anyBreach).toBe(false)
    near(r.leverageHeadroom, 1.5)
    near(r.coverageHeadroom, 0.75)
    near(r.maxNetDebtAllowed, 350)
  })
})

describe('debtRestructuring — refinanciamento', () => {
  it('VPL positivo quando a proposta tem taxa menor (mesmo principal/prazo/tipo)', () => {
    const r = compareRefinancing(
      { principal: 1000, rate: 0.14, years: 5, type: 'french' },
      { principal: 1000, rate: 0.10, years: 5, type: 'french' },
    )
    expect(r.npvInterestSavings).toBeGreaterThan(0)
    expect(r.totalInterestSaved).toBeGreaterThan(0)
    expect(r.verdict).toBe('refinanciar')
  })

  it('recomenda manter quando a proposta é mais cara', () => {
    const r = compareRefinancing(
      { principal: 1000, rate: 0.10, years: 5, type: 'french' },
      { principal: 1000, rate: 0.14, years: 5, type: 'french' },
    )
    expect(r.npvInterestSavings).toBeLessThan(0)
    expect(r.verdict).toBe('manter')
  })
})

describe('valueCreation — ROIC vs WACC', () => {
  it('ROIC > WACC cria valor e EVA positivo', () => {
    const r = roicWaccSpread({ nopat: 200, investedCapital: 1000, wacc: 0.12 })
    near(r.roic, 0.2)
    near(r.spread, 0.08)
    near(r.eva, 80) // 0.08 · 1000
    expect(r.verdict).toBe('cria')
  })

  it('ROIC < WACC destrói valor e EVA negativo', () => {
    const r = roicWaccSpread({ nopat: 80, investedCapital: 1000, wacc: 0.12 })
    near(r.roic, 0.08)
    expect(r.eva).toBeLessThan(0)
    expect(r.verdict).toBe('destroi')
  })

  it('alocação de capital: spread+ e crescimento → reinvestir', () => {
    const r = capitalAllocation({ roic: 0.2, wacc: 0.12, growthRate: 0.05 })
    expect(r.recommendation).toBe('reinvestir')
  })

  it('alocação de capital: spread+ sem crescimento → recomprar', () => {
    const r = capitalAllocation({ roic: 0.2, wacc: 0.12, growthRate: 0 })
    expect(r.recommendation).toBe('recomprar')
  })

  it('alocação de capital: spread negativo → desalavancar', () => {
    const r = capitalAllocation({ roic: 0.08, wacc: 0.12, growthRate: 0.05 })
    expect(r.recommendation).toBe('desalavancar')
  })

  it('decomposição DuPont: ROIC = margem · giro', () => {
    const r = valueDrivers({ nopat: 200, revenue: 2000, investedCapital: 1000, wacc: 0.12 })
    near(r.nopatMargin, 0.1)     // 200/2000
    near(r.capitalTurnover, 2)   // 2000/1000
    near(r.roic, 0.2)            // 0.1 · 2
    near(r.economicProfit, 80)
  })
})

describe('longRangePlan — projeção plurianual', () => {
  it('receita cresce monotonicamente com crescimento positivo', () => {
    const r = projectFinancials({
      revenue0: 1000, years: 5, revenueGrowth: 0.1, ebitdaMargin: 0.25,
      capexPctRevenue: 0.08, nwcPctRevenue: 0.15, taxRate: 0.34,
    })
    for (let y = 1; y < r.rows.length; y++) {
      expect(r.rows[y].revenue).toBeGreaterThan(r.rows[y - 1].revenue)
    }
    near(r.rows[0].revenue, 1100) // 1000 · 1.1
    near(r.revenueCagr, 0.1, 1e-9)
  })

  it('FCFF = EBITDA·(1−T) − capex − ΔNWC (D&A=0)', () => {
    const r = projectFinancials({
      revenue0: 1000, years: 3, revenueGrowth: 0.1, ebitdaMargin: 0.25,
      capexPctRevenue: 0.08, nwcPctRevenue: 0.15, taxRate: 0.34,
    })
    const y1 = r.rows[0]
    const expectedFcff = y1.ebitda * (1 - 0.34) - y1.capex - y1.nwcChange
    near(y1.fcff, expectedFcff, 1e-6)
    // ΔNWC do ano 1 = (rev1 − rev0)·nwcPct
    near(y1.nwcChange, (1100 - 1000) * 0.15, 1e-6)
    // FCFF cumulativo = soma dos anos
    near(r.cumulativeFcff, r.rows.reduce((a, x) => a + x.fcff, 0), 1e-6)
  })

  it('aceita vetor de crescimento por ano (cenário)', () => {
    const r = projectFinancials({
      revenue0: 1000, years: 3, revenueGrowth: [0.2, 0.1, 0.05], ebitdaMargin: 0.25,
      capexPctRevenue: 0.08, nwcPctRevenue: 0.15, taxRate: 0.34,
    })
    near(r.rows[0].revenue, 1200)
    near(r.rows[1].revenue, 1320)
    near(r.rows[2].revenue, 1386)
  })

  it('cenários: otimista acumula mais FCFF que pessimista', () => {
    const base = {
      revenue0: 1000, years: 5, revenueGrowth: 0.1, ebitdaMargin: 0.25,
      capexPctRevenue: 0.08, nwcPctRevenue: 0.15, taxRate: 0.34,
    }
    const s = runPlanScenarios(base)
    const bear = s.find(x => x.name === 'bear')!
    const bull = s.find(x => x.name === 'bull')!
    expect(bull.cumulativeFcff).toBeGreaterThan(bear.cumulativeFcff)
    expect(bull.revenueCagr).toBeGreaterThan(bear.revenueCagr)
  })
})

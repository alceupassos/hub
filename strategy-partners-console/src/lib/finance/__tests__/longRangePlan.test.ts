import { describe, it, expect } from 'vitest'
import {
  projectFinancials,
  perYearGrowth,
  planValuation,
  fundingGap,
  marginRamp,
  breakEvenYear,
  type ProjectionResult,
  type ProjectionYear,
} from '../longRangePlan'

const near = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol)

// Fábrica de projeção mínima a partir de um vetor de FCFF acumulado (para testar
// funções que só leem year/fcff/cumulativeFcff, de forma determinística e exata).
const mkProjection = (cumFcff: number[]): ProjectionResult => {
  const rows: ProjectionYear[] = cumFcff.map((cum, idx) => ({
    year: idx + 1,
    revenue: 0,
    ebitda: 0,
    da: 0,
    ebit: 0,
    tax: 0,
    capex: 0,
    nwc: 0,
    nwcChange: 0,
    fcff: idx === 0 ? cum : cum - cumFcff[idx - 1],
    cumulativeFcff: cum,
  }))
  return {
    rows,
    cumulativeFcff: cumFcff.length ? cumFcff[cumFcff.length - 1] : 0,
    totalFcff: cumFcff.length ? cumFcff[cumFcff.length - 1] : 0,
    revenueCagr: 0,
    formula: 'test',
  }
}

const OPTS = { ebitdaMargin: 0.25, capexPctRevenue: 0.08, nwcPctRevenue: 0.15, taxRate: 0.34 }

describe('longRangePlan — perYearGrowth', () => {
  it('coincide com o crescimento constante quando todas as taxas são iguais', () => {
    const constant = projectFinancials({
      revenue0: 1000, years: 3, revenueGrowth: 0.1, ...OPTS,
    })
    const perYear = perYearGrowth(1000, [0.1, 0.1, 0.1], OPTS)
    expect(perYear.rows.length).toBe(constant.rows.length)
    perYear.rows.forEach((r, k) => {
      near(r.revenue, constant.rows[k].revenue)
      near(r.fcff, constant.rows[k].fcff)
      near(r.cumulativeFcff, constant.rows[k].cumulativeFcff)
    })
    near(perYear.cumulativeFcff, constant.cumulativeFcff)
    near(perYear.revenueCagr, constant.revenueCagr, 1e-9)
  })

  it('curva-S/ramp-down: crescimento decrescente ainda gera receita monotônica', () => {
    const r = perYearGrowth(1000, [0.3, 0.15, 0.05], OPTS)
    near(r.rows[0].revenue, 1300)          // 1000·1.3
    near(r.rows[1].revenue, 1495)          // 1300·1.15
    near(r.rows[2].revenue, 1569.75)       // 1495·1.05
    for (let y = 1; y < r.rows.length; y++) {
      expect(r.rows[y].revenue).toBeGreaterThan(r.rows[y - 1].revenue)
    }
  })
})

describe('longRangePlan — planValuation', () => {
  it('produz Enterprise Value positivo e coerente (PV explícito + terminal)', () => {
    const proj = projectFinancials({ revenue0: 1000, years: 5, revenueGrowth: 0.1, ...OPTS })
    const v = planValuation(proj, { wacc: 0.12, terminalGrowth: 0.03 })
    expect(v.enterpriseValue).toBeGreaterThan(0)
    expect(v.pvExplicit).toBeGreaterThan(0)
    expect(v.pvTerminal).toBeGreaterThan(0)
    expect(v.terminalMethod).toBe('gordon')
    // EV = PV explícito + PV terminal.
    near(v.enterpriseValue, v.pvExplicit + v.pvTerminal, 1e-6)
    // WACC maior → EV menor (desconta mais).
    const v2 = planValuation(proj, { wacc: 0.16, terminalGrowth: 0.03 })
    expect(v2.enterpriseValue).toBeLessThan(v.enterpriseValue)
  })

  it('faz a ponte EV→equity com dívida líquida', () => {
    const proj = projectFinancials({ revenue0: 1000, years: 5, revenueGrowth: 0.1, ...OPTS })
    const v = planValuation(proj, { wacc: 0.12, terminalGrowth: 0.03, netDebt: 200 })
    expect(v.equityValue).not.toBeNull()
    near(v.equityValue as number, v.enterpriseValue - 200, 1e-6)
  })
})

describe('longRangePlan — fundingGap', () => {
  it('detecta o vale de liquidez e o pico de necessidade de capital', () => {
    // caixa = 100 + acumulado → [20, 0, 150]; mínimo 50 → fura nos anos 1 e 2, vale=0 no ano 2.
    const proj = mkProjection([-80, -100, 50])
    const g = fundingGap(proj, { startingCash: 100, minCash: 50 })
    expect(g.rows.map((r) => r.cash)).toEqual([20, 0, 150])
    expect(g.breachYears).toEqual([1, 2])
    expect(g.troughYear).toBe(2)
    near(g.troughCash, 0)
    near(g.peakFundingNeed, 50) // 50 − 0
  })

  it('sem furo: nenhuma quebra e necessidade de capital zero', () => {
    const proj = mkProjection([10, 30, 60])
    const g = fundingGap(proj, { startingCash: 100, minCash: 50 })
    expect(g.breachYears).toEqual([])
    near(g.peakFundingNeed, 0)
    expect(g.troughYear).toBe(1) // menor caixa = 110 no ano 1
    near(g.troughCash, 110)
  })
})

describe('longRangePlan — marginRamp', () => {
  it('margem EBITDA vai linearmente de marginStart (ano 1) a marginEnd (ano N)', () => {
    const r = marginRamp(1000, 5, 0.1, 0.1, 0.3, {
      capexPctRevenue: 0.08, nwcPctRevenue: 0.15, taxRate: 0.34,
    })
    const first = r.rows[0]
    const last = r.rows[r.rows.length - 1]
    near(first.ebitda / first.revenue, 0.1)   // margem inicial
    near(last.ebitda / last.revenue, 0.3)      // margem final
    // ponto médio (ano 3 de 5) = 0.2
    near(r.rows[2].ebitda / r.rows[2].revenue, 0.2)
    // margem monotônica crescente
    for (let y = 1; y < r.rows.length; y++) {
      expect(r.rows[y].ebitda / r.rows[y].revenue).toBeGreaterThan(
        r.rows[y - 1].ebitda / r.rows[y - 1].revenue,
      )
    }
  })

  it('horizonte de 1 ano usa a margem final', () => {
    const r = marginRamp(1000, 1, 0.1, 0.05, 0.25, {
      capexPctRevenue: 0.08, nwcPctRevenue: 0.15, taxRate: 0.34,
    })
    near(r.rows[0].ebitda / r.rows[0].revenue, 0.25)
  })
})

describe('longRangePlan — breakEvenYear', () => {
  it('interpola o ano em que o FCFF acumulado cruza zero', () => {
    // acumulado: [-100, -40, 20] → cruza entre ano 2 (−40) e ano 3 (20).
    const proj = mkProjection([-100, -40, 20])
    const be = breakEvenYear(proj)
    expect(be).not.toBeNull()
    near(be as number, 2 + 40 / (20 - -40)) // 2 + 40/60 = 2.6667
  })

  it('retorna null quando o acumulado nunca vira positivo', () => {
    expect(breakEvenYear(mkProjection([-100, -80, -30]))).toBeNull()
  })

  it('plano positivo desde o ano 1 tem break-even no ano 1', () => {
    expect(breakEvenYear(mkProjection([50, 120, 200]))).toBe(1)
  })
})

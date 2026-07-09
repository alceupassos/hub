import { describe, it, expect } from 'vitest'
import {
  economicProfitBridge,
  valueDriverTree,
  reinvestmentValue,
  sustainableGrowth,
  sensitivityToWacc,
} from '../valueCreation'

const near = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol)

describe('valueCreation — ponte de EVA (economicProfitBridge)', () => {
  it('ambas as decomposições somam exatamente ΔEVA', () => {
    const r = economicProfitBridge({
      nopatStart: 150,
      nopatEnd: 240,
      investedCapitalStart: 1000,
      investedCapitalEnd: 1400,
      wacc: 0.12,
    })
    // EVA = NOPAT − WACC·IC
    near(r.evaStart, 150 - 0.12 * 1000) // 30
    near(r.evaEnd, 240 - 0.12 * 1400) // 72
    near(r.deltaEva, r.evaEnd - r.evaStart)
    // Decomposição por produto (spread × capital)
    near(r.spreadEffect + r.capitalGrowthEffect + r.interactionEffect, r.deltaEva)
    // Decomposição aditiva (NOPAT − encargo de capital)
    near(r.nopatEffect + r.capitalChargeEffect, r.deltaEva)
    // Componentes individuais
    near(r.nopatEffect, 90) // 240 − 150
    near(r.capitalChargeEffect, -0.12 * 400) // −48
  })

  it('capital constante: só o efeito spread/margem move o EVA', () => {
    const r = economicProfitBridge({
      nopatStart: 100,
      nopatEnd: 130,
      investedCapitalStart: 1000,
      investedCapitalEnd: 1000,
      wacc: 0.1,
    })
    near(r.capitalGrowthEffect, 0)
    near(r.interactionEffect, 0)
    near(r.capitalChargeEffect, 0)
    near(r.nopatEffect, 30)
    near(r.deltaEva, 30)
    near(r.spreadEffect, 30) // Δspread·IC = (0.03)·1000
  })
})

describe('valueCreation — árvore de value drivers (valueDriverTree)', () => {
  it('consistência: ROIC = margem NOPAT × giro; EVA = spread·capital (via investedCapital)', () => {
    const r = valueDriverTree({
      revenue: 2000,
      ebitMargin: 0.15,
      taxRate: 0.34,
      wacc: 0.12,
      investedCapital: 1000,
    })
    near(r.ebit, 300) // 2000·0.15
    near(r.nopat, 300 * (1 - 0.34)) // 198
    near(r.nopatMargin, 198 / 2000) // 0.099
    near(r.capitalTurnover, 2) // 2000/1000
    near(r.roic, r.nopatMargin * r.capitalTurnover)
    near(r.roic, 198 / 1000) // 0.198
    near(r.spread, r.roic - 0.12)
    near(r.eva, r.spread * 1000)
    expect(r.nodes).toHaveLength(9)
  })

  it('deriva o capital a partir do giro (capitalTurnover) e mantém ROIC=margem×giro', () => {
    const r = valueDriverTree({
      revenue: 2000,
      ebitMargin: 0.15,
      taxRate: 0.34,
      wacc: 0.12,
      capitalTurnover: 2,
    })
    near(r.investedCapital, 1000) // 2000/2
    near(r.roic, r.nopatMargin * r.capitalTurnover)
    near(r.roic, 0.198)
  })

  it('lança erro sem investedCapital nem capitalTurnover', () => {
    expect(() =>
      valueDriverTree({ revenue: 2000, ebitMargin: 0.15, taxRate: 0.34, wacc: 0.12 }),
    ).toThrow()
  })
})

describe('valueCreation — valor do crescimento (reinvestmentValue)', () => {
  it('ROIC < WACC: crescimento destrói valor (VP do crescimento negativo)', () => {
    const r = reinvestmentValue({ nopat: 100, reinvestmentRate: 0.5, roic: 0.05, wacc: 0.1, years: 10 })
    near(r.growthRate, 0.025) // 0.5·0.05
    expect(r.valueOfGrowth).toBeLessThan(0)
    expect(r.createsValue).toBe(false)
    expect(r.verdict).toBe('destroi')
  })

  it('ROIC > WACC: crescimento cria valor (VP do crescimento positivo)', () => {
    const r = reinvestmentValue({ nopat: 100, reinvestmentRate: 0.5, roic: 0.2, wacc: 0.1, years: 10 })
    near(r.growthRate, 0.1) // 0.5·0.2
    expect(r.valueOfGrowth).toBeGreaterThan(0)
    expect(r.createsValue).toBe(true)
    expect(r.verdict).toBe('cria')
  })

  it('ROIC = WACC: reinvestir é indiferente (VP ≈ 0)', () => {
    const r = reinvestmentValue({ nopat: 100, reinvestmentRate: 0.5, roic: 0.1, wacc: 0.1, years: 30 })
    near(r.valueOfGrowth, 0, 1e-6)
    expect(r.verdict).toBe('neutro')
  })
})

describe('valueCreation — crescimento sustentável (sustainableGrowth)', () => {
  it('g* = retenção × ROE (ROE direto)', () => {
    const r = sustainableGrowth({ roe: 0.2, payoutRatio: 0.4 })
    near(r.retentionRatio, 0.6)
    near(r.sustainableGrowth, 0.12) // 0.6·0.2
    expect(r.needsExternalFinancing).toBe(false)
    expect(r.fundingGap).toBeNull()
  })

  it('deriva ROE de ROIC·(1+D/E) e sinaliza financiamento externo quando alvo > g*', () => {
    const r = sustainableGrowth({ roic: 0.1, leverage: 1, payoutRatio: 0.5, targetGrowth: 0.2 })
    near(r.roe, 0.2) // 0.1·(1+1)
    near(r.sustainableGrowth, 0.1) // 0.5·0.2
    near(r.fundingGap as number, 0.1) // 0.2 − 0.1
    expect(r.needsExternalFinancing).toBe(true)
  })

  it('lança erro sem roe e sem (roic + leverage)', () => {
    expect(() => sustainableGrowth({ payoutRatio: 0.5 })).toThrow()
  })
})

describe('valueCreation — sensibilidade ao WACC (sensitivityToWacc)', () => {
  it('EVA cai quando o WACC sobe; ponto de indiferença em WACC=ROIC', () => {
    const r = sensitivityToWacc({ nopat: 200, investedCapital: 1000 }, [0.1, 0.2, 0.25])
    expect(r.rows).toHaveLength(3)
    r.rows.forEach(row => near(row.roic, 0.2)) // 200/1000 constante
    near(r.rows[0].eva, (0.2 - 0.1) * 1000) // 100
    near(r.rows[1].eva, 0) // WACC = ROIC → EVA 0
    expect(r.rows[2].eva).toBeLessThan(0)
    // EVA monotonicamente decrescente com WACC
    expect(r.rows[0].eva).toBeGreaterThan(r.rows[1].eva)
    expect(r.rows[1].eva).toBeGreaterThan(r.rows[2].eva)
    // Valor de referência = NOPAT/WACC
    near(r.rows[0].enterpriseValue, 2000) // 200/0.1
    expect(r.rows[1].verdict).toBe('neutro')
  })
})

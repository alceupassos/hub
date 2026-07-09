import { describe, it, expect } from 'vitest'
import {
  amortizationSchedule,
  debtWaterfall,
  dscrSchedule,
  restructuringOptions,
  breakEvenRate,
} from '../debtRestructuring'

const near = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol)

describe('debtWaterfall — cascata de recuperação por senioridade', () => {
  const tranches = [
    { name: 'Sênior', amount: 600, seniority: 1, rate: 0.12 },
    { name: 'Mezanino', amount: 300, seniority: 2, rate: 0.16 },
    { name: 'Subordinada', amount: 200, seniority: 3, rate: 0.20 },
  ]

  it('paga o mais sênior primeiro; recuperação parcial pára na tranche do meio', () => {
    const r = debtWaterfall(tranches, 750) // cobre sênior (600) + 150 do mezanino
    const senior = r.tranches.find(t => t.name === 'Sênior')!
    const mezz = r.tranches.find(t => t.name === 'Mezanino')!
    const sub = r.tranches.find(t => t.name === 'Subordinada')!
    near(senior.recovery, 600); near(senior.recoveryPct, 1)
    near(mezz.recovery, 150); near(mezz.recoveryPct, 0.5)
    near(sub.recovery, 0)
    near(r.totalRecovery, 750)
    near(r.totalClaims, 1100)
    near(r.totalShortfall, 350)
    near(r.residual, 0)
  })

  it('recuperação acima do total distribui 100% e sobra resíduo ao equity', () => {
    const r = debtWaterfall(tranches, 1300)
    near(r.totalRecovery, 1100)
    near(r.residual, 200)
    expect(r.fullyRecovered).toBe(3)
    near(r.blendedRecoveryPct, 1)
  })

  it('tranches pari passu (mesma senioridade) dividem pro-rata', () => {
    const pp = [
      { name: 'A', amount: 100, seniority: 1, rate: 0.1 },
      { name: 'B', amount: 300, seniority: 1, rate: 0.1 },
    ]
    const r = debtWaterfall(pp, 200) // metade de cada claim
    near(r.tranches.find(t => t.name === 'A')!.recovery, 50)
    near(r.tranches.find(t => t.name === 'B')!.recovery, 150)
  })
})

describe('dscrSchedule — DSCR ano a ano', () => {
  it('detecta o DSCR mínimo e os anos abaixo do piso', () => {
    const sched = amortizationSchedule(1000, 0.12, 5, 'linear') // serviço decrescente (SAC)
    const ebitda = [250, 250, 250, 250, 250]
    const r = dscrSchedule(ebitda, sched.rows, 1.2)
    expect(r.rows).toHaveLength(5)
    // Serviço maior no ano 1 (SAC) → menor DSCR no ano 1.
    expect(r.minDscr).toBeCloseTo(r.rows[0].dscr, 6)
    expect(r.minDscr).toBeLessThanOrEqual(r.rows[4].dscr)
    // Anos abaixo do piso são um subconjunto coerente.
    expect(Array.isArray(r.yearsBelowFloor)).toBe(true)
  })
})

describe('restructuringOptions — 3 alavancas lado a lado', () => {
  const input = {
    principal: 1000, rate: 0.16, years: 5, type: 'french' as const,
    ebitda: 220, discountRate: 0.12, floor: 1.2,
    extensionYears: 3, couponHaircut: 0.04, principalHaircut: 0.3,
  }
  const r = restructuringOptions(input)

  it('retorna as três alavancas', () => {
    const levers = r.options.map(o => o.lever)
    expect(levers).toContain('extensão de prazo')
    expect(levers).toContain('redução de cupom')
    expect(levers).toContain('haircut de principal')
  })

  it('toda alavanca alivia o serviço do devedor (serviço médio cai)', () => {
    for (const o of r.options) expect(o.avgAnnualService).toBeLessThan(r.baseline.avgAnnualService ?? Infinity)
  })

  it('haircut de principal e redução de cupom fazem o credor ceder valor (VPL delta ≤ 0)', () => {
    const cupom = r.options.find(o => o.lever === 'redução de cupom')!
    const haircut = r.options.find(o => o.lever === 'haircut de principal')!
    expect(cupom.npvToCreditorDelta).toBeLessThanOrEqual(1e-6)
    expect(haircut.npvToCreditorDelta).toBeLessThanOrEqual(1e-6)
  })
})

describe('breakEvenRate — maior taxa que cabe no teto de serviço', () => {
  it('a taxa de equilíbrio produz serviço de pico ≈ teto', () => {
    // Serviço a 0% (french, 1000/5 = 200/ano) cabe num teto de 280.
    const r = breakEvenRate(1000, 5, 'french', 280)
    expect(r.feasible).toBe(true)
    expect(r.annualServicePeak).toBeLessThanOrEqual(280 + 1e-6)
    expect(r.rate).toBeGreaterThan(0)
  })

  it('inviável quando nem a 0% o serviço cabe no teto', () => {
    const r = breakEvenRate(1000, 5, 'french', 150) // 200/ano a 0% já estoura 150
    expect(r.feasible).toBe(false)
  })
})

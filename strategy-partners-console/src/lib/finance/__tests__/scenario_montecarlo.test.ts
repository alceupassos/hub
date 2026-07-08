import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SCENARIOS,
  runDcfScenarios,
  runLboScenarios,
  type DcfScenarioResult,
  type LboScenarioResult,
} from '../scenario'
import {
  makeRng,
  sampleTriangular,
  sampleNormalTrunc,
  runMonteCarloLbo,
  runMonteCarloDcf,
  type McDriver,
  type McResult,
} from '../montecarlo'
import type { DcfInput } from '../dcf'
import type { LboInput } from '../lbo'

// Same helper style as finance.test.ts
const near = (a: number, b: number, tol = 1e-6): void => expect(Math.abs(a - b)).toBeLessThan(tol)

// Realistic base inputs (Gordon terminal for DCF, single senior tranche LBO).
const baseDcf: DcfInput = {
  fcff: [100, 110, 120, 130, 140],
  discountRate: 0.12,
  terminalGrowth: 0.02,
  netDebt: 200,
  sharesOutstanding: 50,
}

// ebitdaGrowth alto o bastante para o bear (growth −0.3) permanecer positivo e
// solvente → IRR não-nula nos três cenários.
const baseLbo: LboInput = {
  entryEbitda: 100,
  entryMultiple: 10,
  exitMultiple: 11,
  holdYears: 5,
  ebitdaGrowth: 0.4,
  tranches: [{ name: 'Senior', turns: 4, rate: 0.08, mandatoryAmortPct: 0.05 }],
  taxRate: 0.25,
  capexPctOfEbitda: 0.1,
  daPctOfEbitda: 0.1,
}

const pick = <T extends { name: string }>(rows: T[], name: string): T => {
  const r = rows.find(x => x.name === name)
  if (!r) throw new Error(`cenário ausente: ${name}`)
  return r
}

describe('scenario (base/bull/bear monotônico)', () => {
  it('DCF: bull EV >= base EV >= bear EV com DEFAULT_SCENARIOS', () => {
    const rows: DcfScenarioResult[] = runDcfScenarios(baseDcf)
    const bull = pick(rows, 'bull')
    const base = pick(rows, 'base')
    const bear = pick(rows, 'bear')
    expect(bull.ev).toBeGreaterThanOrEqual(base.ev)
    expect(base.ev).toBeGreaterThanOrEqual(bear.ev)
    // separação estrita: cenários realmente diferem
    expect(bull.ev).toBeGreaterThan(bear.ev)
    // ponte EV→equity presente (netDebt informado)
    expect(base.equity).not.toBeNull()
  })

  it('LBO: bull IRR >= base IRR >= bear IRR e bull MOIC >= base MOIC >= bear MOIC', () => {
    const rows: LboScenarioResult[] = runLboScenarios(baseLbo)
    const bull = pick(rows, 'bull')
    const base = pick(rows, 'base')
    const bear = pick(rows, 'bear')

    expect(bull.irr).not.toBeNull()
    expect(base.irr).not.toBeNull()
    expect(bear.irr).not.toBeNull()
    expect(bull.irr!).toBeGreaterThanOrEqual(base.irr!)
    expect(base.irr!).toBeGreaterThanOrEqual(bear.irr!)

    expect(bull.moic).toBeGreaterThanOrEqual(base.moic)
    expect(base.moic).toBeGreaterThanOrEqual(bear.moic)
    // separação estrita entre extremos
    expect(bull.moic).toBeGreaterThan(bear.moic)
  })

  it('DEFAULT_SCENARIOS expõe exatamente bear/base/bull', () => {
    expect(DEFAULT_SCENARIOS.map(s => s.name)).toEqual(['bear', 'base', 'bull'])
  })
})

describe('makeRng (mulberry32 semeado)', () => {
  it('mesma semente → mesma sequência de 10; sementes diferentes divergem', () => {
    const a = makeRng(12345)
    const b = makeRng(12345)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).toEqual(seqB)

    const c = makeRng(999)
    const seqC = Array.from({ length: 10 }, () => c())
    expect(seqC).not.toEqual(seqA)

    // todos os draws em [0,1)
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('amostradores respeitam limites', () => {
  it('sampleTriangular fica em [min,max] em muitas amostras', () => {
    const rng = makeRng(7)
    const min = 8, mode = 10, max = 12
    for (let i = 0; i < 5000; i++) {
      const v = sampleTriangular(rng, min, mode, max)
      expect(v).toBeGreaterThanOrEqual(min)
      expect(v).toBeLessThanOrEqual(max)
    }
  })

  it('sampleNormalTrunc fica em [min,max] em muitas amostras', () => {
    const rng = makeRng(7)
    const mean = 0.12, sd = 0.05, min = 0.05, max = 0.2
    for (let i = 0; i < 5000; i++) {
      const v = sampleNormalTrunc(rng, mean, sd, min, max)
      expect(v).toBeGreaterThanOrEqual(min)
      expect(v).toBeLessThanOrEqual(max)
    }
  })
})

const assertMcInvariants = (r: McResult): void => {
  // ordenação de percentis
  expect(r.p10).toBeLessThanOrEqual(r.p50)
  expect(r.p50).toBeLessThanOrEqual(r.p90)
  // probAboveHurdle em [0,1] quando hurdle informado
  expect(r.probAboveHurdle).not.toBeNull()
  expect(r.probAboveHurdle!).toBeGreaterThanOrEqual(0)
  expect(r.probAboveHurdle!).toBeLessThanOrEqual(1)
  // histograma cobre toda a amostra
  const binTotal = r.bins.reduce((s, b) => s + b.count, 0)
  expect(binTotal).toBe(r.values.length)
  expect(r.n).toBe(r.values.length)
}

describe('runMonteCarloLbo (probabilístico, semeado)', () => {
  // drivers são deltas sobre o base (o motor soma a base.ebitdaGrowth / base.exitMultiple)
  const drivers: McDriver[] = [
    { key: 'growth', dist: 'triangular', params: [-0.1, 0, 0.1] },
    { key: 'exitMultiple', dist: 'triangular', params: [-1, 0, 1] },
  ]

  it('reprodutível com mesma semente + runs; percentis ordenados; probAboveHurdle em [0,1]', () => {
    const r1 = runMonteCarloLbo(baseLbo, drivers, { runs: 2000, seed: 4242, hurdle: 0.15 })
    const r2 = runMonteCarloLbo(baseLbo, drivers, { runs: 2000, seed: 4242, hurdle: 0.15 })

    expect(r1.p10).toBe(r2.p10)
    expect(r1.p50).toBe(r2.p50)
    expect(r1.p90).toBe(r2.p90)

    assertMcInvariants(r1)
    expect(r1.values.length).toBeGreaterThan(0)
  })
})

describe('runMonteCarloDcf (distribuição de EV, semeado)', () => {
  const drivers: McDriver[] = [
    // wacc sempre > terminalGrowth (min wacc 0.08 > max g 0.04) → nenhum run inválido por WACC<=g
    { key: 'wacc', dist: 'normal', params: [0.12, 0.02, 0.08, 0.18] },
    { key: 'terminalGrowth', dist: 'triangular', params: [0.0, 0.02, 0.04] },
  ]

  it('reprodutível com mesma semente + runs; percentis ordenados; bins somam values.length', () => {
    const r1 = runMonteCarloDcf(baseDcf, drivers, { runs: 2000, seed: 4242, hurdle: 1000 })
    const r2 = runMonteCarloDcf(baseDcf, drivers, { runs: 2000, seed: 4242, hurdle: 1000 })

    expect(r1.p10).toBe(r2.p10)
    expect(r1.p50).toBe(r2.p50)
    expect(r1.p90).toBe(r2.p90)

    assertMcInvariants(r1)
    expect(r1.values.length).toBeGreaterThan(0)
    // WACC menor → EV maior: dispersão real esperada
    expect(r1.p90).toBeGreaterThan(r1.p10)
  })
})

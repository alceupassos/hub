import { describe, it, expect } from 'vitest'
import { findInflection, rankFragility } from '../inflection'

const near = (a: number, b: number, tol = 1e-4) => expect(Math.abs(a - b)).toBeLessThan(tol)

describe('findInflection — ponto de virada', () => {
  it('acha o breakpoint de uma função decrescente (valuation vs. churn)', () => {
    // valuation = 1000 − 50·churn ; limiar = preço 800 → vira em churn=4
    const r = findInflection({
      driver: 'churn', current: 2, min: 0, max: 20,
      outcome: (churn) => 1000 - 50 * churn, threshold: 800, unit: '%',
    })
    near(r.breakpoint!, 4)
    expect(r.direction).toBe('decreasing')
    expect(r.currentSide).toBe('above') // hoje 900 > 800
    near(r.headroom!, 2) // 4 − 2
  })

  it('acha o breakpoint de uma função crescente (spread vs. ROIC)', () => {
    // spread = ROIC − 0.12 ; limiar 0 → vira em ROIC=0.12
    const r = findInflection({
      driver: 'ROIC', current: 0.15, min: 0, max: 0.4,
      outcome: (roic) => roic - 0.12, threshold: 0, unit: '',
    })
    near(r.breakpoint!, 0.12)
    expect(r.direction).toBe('increasing')
  })

  it('retorna null quando não há cruzamento no intervalo', () => {
    const r = findInflection({
      driver: 'x', current: 5, min: 0, max: 10,
      outcome: () => 500, threshold: 800, // constante, nunca cruza
    })
    expect(r.breakpoint).toBeNull()
    expect(r.headroom).toBeNull()
    expect(r.direction).toBe('flat')
  })
})

describe('rankFragility — ordena por menor folga relativa', () => {
  it('driver com menor folga relativa vem primeiro', () => {
    const a = findInflection({ driver: 'a', current: 100, min: 0, max: 200, outcome: x => 200 - x, threshold: 90 }) // bp=110, folga 10 (10%)
    const b = findInflection({ driver: 'b', current: 100, min: 0, max: 200, outcome: x => 200 - x, threshold: 150 }) // bp=50, folga 50 (50%)
    const ranked = rankFragility([b, a])
    expect(ranked[0].driver).toBe('a') // 10% < 50%
  })
})

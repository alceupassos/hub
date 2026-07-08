import { describe, it, expect } from 'vitest'
import { scoreAnswer } from '../rubric'
import { checkEngine } from '@/lib/server/selfcheck'

describe('rubric de avaliação', () => {
  it('premia resposta ancorada, com método e cautelosa', () => {
    const s = scoreAnswer({ answer: 'O WACC = (E/V)Ke + (D/V)Kd(1−T) ≈ 14% (fonte: Damodaran, 2026).' })
    expect(s.anchored).toBe(true)
    expect(s.showsMethod).toBe(true)
    expect(s.cautious).toBe(true)
    expect(s.score).toBeGreaterThanOrEqual(75)
  })
  it('penaliza afirmação absoluta e ausência de fonte', () => {
    const s = scoreAnswer({ answer: 'Esse deal com certeza dá retorno garantido.' })
    expect(s.cautious).toBe(false)
    expect(s.anchored).toBe(false)
    expect(s.score).toBeLessThan(40)
  })
  it('checa match numérico contra o motor', () => {
    const ok = scoreAnswer({ answer: 'WACC = 12,48% (fonte interna)', expectedValue: 0.1248, engineValue: 0.1248 })
    expect(ok.numericMatch).toBe(true)
    const bad = scoreAnswer({ answer: 'WACC = 20% [1]', expectedValue: 0.1248, engineValue: 0.20 })
    expect(bad.numericMatch).toBe(false)
    expect(bad.notes.length).toBeGreaterThan(0)
  })
})

describe('selfcheck do motor (double-check)', () => {
  it('todas as checagens do motor passam (gabaritos)', () => {
    const results = checkEngine()
    expect(results.every(r => r.status === 'ok')).toBe(true)
  })
})

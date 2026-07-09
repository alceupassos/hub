import { describe, it, expect } from 'vitest'
import {
  computeZopa, anchorImpact,
  multiIssueOptimizer, deriveBatna, optimalOpeningOffer, concessionPlanner,
} from '../negotiation'

const near = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol)

describe('negotiation — ZOPA / BATNA (Raiffa/Bruner)', () => {
  it('há ZOPA: vendedor 80, comprador 120 → intervalo 80–120', () => {
    const r = computeZopa({ sellerWalkAway: 80, buyerWalkAway: 120 })
    expect(r.hasZopa).toBe(true)
    near(r.low, 80)
    near(r.high, 120)
    near(r.width, 40)
    near(r.midpoint, 100)
    expect(r.currentOffer).toBeNull()
    expect(r.offerPosition).toBeNull()
  })

  it('oferta 100 dentro da ZOPA → divide o excedente 50/50', () => {
    const r = computeZopa({ sellerWalkAway: 80, buyerWalkAway: 120, currentOffer: 100 })
    expect(r.offerPosition).toBe('in_zopa')
    expect(r.surplusSplit).not.toBeNull()
    near(r.surplusSplit!.buyer, 20) // 120 - 100
    near(r.surplusSplit!.seller, 20) // 100 - 80
  })

  it('oferta 70 abaixo do piso do vendedor → below', () => {
    const r = computeZopa({ sellerWalkAway: 80, buyerWalkAway: 120, currentOffer: 70 })
    expect(r.offerPosition).toBe('below')
    expect(r.surplusSplit).toBeNull()
  })

  it('oferta 130 acima do teto do comprador → above', () => {
    const r = computeZopa({ sellerWalkAway: 80, buyerWalkAway: 120, currentOffer: 130 })
    expect(r.offerPosition).toBe('above')
    expect(r.surplusSplit).toBeNull()
  })

  it('sem ZOPA: vendedor 130 acima do teto do comprador 120', () => {
    const r = computeZopa({ sellerWalkAway: 130, buyerWalkAway: 120 })
    expect(r.hasZopa).toBe(false)
    expect(r.offerPosition).toBeNull()
    expect(r.surplusSplit).toBeNull()
  })
})

describe('negotiation — ancoragem', () => {
  it('âncora mais alta puxa a estimativa final para cima', () => {
    const low = anchorImpact(100, 80, 0.5)
    const high = anchorImpact(140, 80, 0.5)
    expect(high.finalEstimate).toBeGreaterThan(low.finalEstimate)
  })

  it('concessionRate 0 → mantém a expectativa da contraparte', () => {
    near(anchorImpact(200, 80, 0).finalEstimate, 80)
  })

  it('concessionRate 1 → cede até a âncora', () => {
    near(anchorImpact(200, 80, 1).finalEstimate, 200)
  })
})

describe('multiIssueOptimizer — negociação integrativa (logrolling)', () => {
  const issues = [
    // Preço: comprador quer baixo (900), vendedor alto (1100); ambos ligam muito.
    { key: 'preco', label: 'Preço', buyerIdeal: 900, sellerIdeal: 1100, buyerWeight: 10, sellerWeight: 10, unit: 'R$' },
    // Earn-out: comprador adora (quer 40%, protege downside), vendedor não liga tanto.
    { key: 'earnout', label: 'Earn-out %', buyerIdeal: 40, sellerIdeal: 0, buyerWeight: 8, sellerWeight: 3, unit: '%' },
    // Não-compete: vendedor odeia prazo longo (quer 0), comprador quer 5 anos e liga muito.
    { key: 'noncompete', label: 'Não-compete (anos)', buyerIdeal: 5, sellerIdeal: 0, buyerWeight: 7, sellerWeight: 9, unit: 'anos' },
  ]
  const r = multiIssueOptimizer(issues)

  it('concede cada issue ao lado que mais o valoriza', () => {
    const earnout = r.settlements.find(s => s.key === 'earnout')!
    const noncompete = r.settlements.find(s => s.key === 'noncompete')!
    expect(earnout.favors).toBe('comprador')   // buyerWeight 8 > 3
    expect(earnout.settledValue).toBe(40)
    expect(noncompete.favors).toBe('vendedor')  // sellerWeight 9 > 7
    expect(noncompete.settledValue).toBe(0)
  })
  it('preço empatado em peso → meio-termo', () => {
    const preco = r.settlements.find(s => s.key === 'preco')!
    expect(preco.favors).toBe('meio-termo')
    near(preco.settledValue, 1000)
  })
  it('troca integrativa agrega valor vs. rachar tudo no meio', () => {
    expect(r.gainVsSplitDown).toBeGreaterThan(0)
    expect(r.buyerUtility).toBeGreaterThan(0); expect(r.buyerUtility).toBeLessThanOrEqual(1)
    expect(r.sellerUtility).toBeGreaterThan(0); expect(r.sellerUtility).toBeLessThanOrEqual(1)
  })
})

describe('deriveBatna — walk-aways a partir de valuations', () => {
  it('teto do comprador = min(valor com sinergias, próxima alternativa)', () => {
    const r = deriveBatna({ buyerStandaloneValue: 1200, buyerNextBestCost: 1100, sellerStandaloneValue: 800 })
    near(r.buyerWalkAway, 1100)
    near(r.sellerWalkAway, 800)
  })
  it('piso do vendedor = max(standalone, outra oferta)', () => {
    const r = deriveBatna({ buyerStandaloneValue: 1200, sellerStandaloneValue: 800, sellerOtherOffer: 950 })
    near(r.buyerWalkAway, 1200)
    near(r.sellerWalkAway, 950)
  })
})

describe('optimalOpeningOffer — abertura ótima sob incerteza', () => {
  it('comprador: oferta ótima dentro dos limites, reprodutível por semente', () => {
    const a = optimalOpeningOffer({ side: 'comprador', ownWalkAway: 1200, counterMin: 800, counterMax: 1100, runs: 3000, seed: 7 })
    const b = optimalOpeningOffer({ side: 'comprador', ownWalkAway: 1200, counterMin: 800, counterMax: 1100, runs: 3000, seed: 7 })
    near(a.bestOffer, b.bestOffer) // mesma semente → mesmo resultado
    expect(a.bestOffer).toBeGreaterThanOrEqual(800)
    expect(a.bestOffer).toBeLessThanOrEqual(1200)
    expect(a.probClose).toBeGreaterThanOrEqual(0); expect(a.probClose).toBeLessThanOrEqual(1)
    expect(a.expectedSurplus).toBeGreaterThan(0)
  })
})

describe('concessionPlanner — concessões decrescentes', () => {
  it('sai do anchor, chega ao target, com incrementos que encolhem', () => {
    const r = concessionPlanner({ side: 'comprador', anchor: 900, target: 1000, walkAway: 1100, rounds: 4 })
    expect(r.steps).toHaveLength(4)
    near(r.steps[r.steps.length - 1].offer, 1000, 1e-6) // termina no alvo
    // cada concessão menor que a anterior
    for (let k = 1; k < r.steps.length; k++) {
      expect(r.steps[k].concession).toBeLessThan(r.steps[k - 1].concession + 1e-9)
    }
  })
})

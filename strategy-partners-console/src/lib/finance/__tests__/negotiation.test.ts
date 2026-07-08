import { describe, it, expect } from 'vitest'
import { computeZopa, anchorImpact } from '../negotiation'

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

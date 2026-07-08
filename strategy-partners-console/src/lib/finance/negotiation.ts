// ─────────────────────────────────────────────────────────────────────────────
// Negociação M&A — analytics de BATNA / ZOPA e ancoragem (Raiffa/Bruner).
//
// ZOPA (Zone of Possible Agreement) é o intervalo entre o mínimo que o vendedor
// aceita e o máximo que o comprador paga; só há acordo racional se esse intervalo
// existir. A ancoragem modela como uma âncora inicial puxa a expectativa da
// contraparte. Tudo determinístico e auditável — nunca "a IA estimou".
// ─────────────────────────────────────────────────────────────────────────────

export interface NegotiationInput {
  /** Máximo que o comprador está disposto a pagar (teto / reservation price do comprador). */
  buyerWalkAway: number
  /** Mínimo que o vendedor aceita (piso / reservation price do vendedor). */
  sellerWalkAway: number
  /** BATNA do comprador — melhor alternativa sem acordo (opcional, informativo). */
  buyerBATNA?: number
  /** BATNA do vendedor — melhor alternativa sem acordo (opcional, informativo). */
  sellerBATNA?: number
  /** Oferta atual na mesa (opcional) para classificar a posição e dividir o excedente. */
  currentOffer?: number
}

export interface ZopaResult {
  hasZopa: boolean
  low: number
  high: number
  width: number
  midpoint: number
  currentOffer: number | null
  offerPosition: 'below' | 'in_zopa' | 'above' | null
  surplusSplit: { buyer: number; seller: number } | null
  note: string
}

/**
 * Calcula a ZOPA. Existe quando sellerWalkAway ≤ buyerWalkAway:
 * low = piso do vendedor, high = teto do comprador, width = high−low,
 * midpoint = (low+high)/2. Se houver oferta, classifica a posição e, dentro da
 * ZOPA, reparte o excedente: excedente do comprador = teto − oferta;
 * excedente do vendedor = oferta − piso.
 */
export function computeZopa(input: NegotiationInput): ZopaResult {
  const low = input.sellerWalkAway
  const high = input.buyerWalkAway
  const hasZopa = low <= high
  const width = high - low
  const midpoint = (low + high) / 2
  const offer = input.currentOffer ?? null

  // Sem ZOPA: piso do vendedor acima do teto do comprador — não há acordo racional.
  if (!hasZopa) {
    return {
      hasZopa: false,
      low,
      high,
      width,
      midpoint,
      currentOffer: offer,
      offerPosition: null,
      surplusSplit: null,
      note: `Sem ZOPA: walk-away do vendedor (${low}) acima do teto do comprador (${high}) — sem acordo racional sem reprecificar sinergias.`,
    }
  }

  // Há ZOPA. Sem oferta, retornamos apenas o intervalo.
  if (offer === null) {
    return {
      hasZopa: true,
      low,
      high,
      width,
      midpoint,
      currentOffer: null,
      offerPosition: null,
      surplusSplit: null,
      note: `Há ZOPA de ${low}–${high} (amplitude ${width}, ponto médio ${midpoint}). Sem oferta na mesa.`,
    }
  }

  // Classifica a oferta relativa ao intervalo.
  let offerPosition: 'below' | 'in_zopa' | 'above'
  if (offer < low) offerPosition = 'below'
  else if (offer > high) offerPosition = 'above'
  else offerPosition = 'in_zopa'

  if (offerPosition !== 'in_zopa') {
    const side = offerPosition === 'below' ? 'abaixo do piso do vendedor' : 'acima do teto do comprador'
    return {
      hasZopa: true,
      low,
      high,
      width,
      midpoint,
      currentOffer: offer,
      offerPosition,
      surplusSplit: null,
      note: `Há ZOPA de ${low}–${high}; oferta atual (${offer}) está ${side} — fora da ZOPA.`,
    }
  }

  // Oferta dentro da ZOPA: reparte o excedente entre as partes.
  const buyerSurplus = high - offer
  const sellerSurplus = offer - low
  const buyerPct = width === 0 ? 50 : (buyerSurplus / width) * 100
  const sellerPct = width === 0 ? 50 : (sellerSurplus / width) * 100

  return {
    hasZopa: true,
    low,
    high,
    width,
    midpoint,
    currentOffer: offer,
    offerPosition,
    surplusSplit: { buyer: buyerSurplus, seller: sellerSurplus },
    note: `Há ZOPA de ${low}–${high}; oferta atual (${offer}) divide o excedente ~${buyerPct.toFixed(0)}% comprador / ${sellerPct.toFixed(0)}% vendedor.`,
  }
}

/**
 * Modelo simples de ancoragem: a estimativa final parte da expectativa da
 * contraparte e é puxada em direção à âncora por uma fração do gap.
 * finalEstimate = counterExpectation + concessionRate·(anchor − counterExpectation).
 * concessionRate=0 → mantém a expectativa; concessionRate=1 → cede até a âncora.
 */
export function anchorImpact(
  anchor: number,
  counterExpectation: number,
  concessionRate: number,
): { finalEstimate: number; note: string } {
  const gap = anchor - counterExpectation
  const finalEstimate = counterExpectation + concessionRate * gap
  const direction = gap > 0 ? 'para cima' : gap < 0 ? 'para baixo' : 'sem deslocamento'
  return {
    finalEstimate,
    note: `Ancoragem: âncora ${anchor} puxa a expectativa ${counterExpectation} ${direction} a ${(concessionRate * 100).toFixed(0)}% do gap → estimativa final ${finalEstimate}.`,
  }
}

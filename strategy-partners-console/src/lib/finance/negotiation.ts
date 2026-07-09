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

// ─────────────────────────────────────────────────────────────────────────────
// 1) OTIMIZADOR MULTI-ISSUE (negociação integrativa, Raiffa) — expande a torta.
// Preço é um eixo; o valor real se troca entre earn-out, escrow, caps, working
// capital peg, cash/ações, não-compete, etc. Cada issue tem uma faixa e um PESO
// (importância) diferente para comprador e vendedor. O pacote ótimo concede a cada
// lado o que ele valoriza mais — maximiza o valor CONJUNTO (não é jogo de soma zero).
// ─────────────────────────────────────────────────────────────────────────────

export interface NegotiationIssue {
  key: string
  label: string
  /** Extremos da posição: `buyerIdeal` = valor que o comprador quer; `sellerIdeal` = o do vendedor. */
  buyerIdeal: number
  sellerIdeal: number
  /** Peso de importância 0..10 para cada lado (quanto cada um se importa com este issue). */
  buyerWeight: number
  sellerWeight: number
  /** Unidade para exibição (%, x, R$, meses…). */
  unit?: string
}

export interface IssueSettlement {
  key: string
  label: string
  settledValue: number       // valor de acordo recomendado
  favors: 'comprador' | 'vendedor' | 'meio-termo'
  unit?: string
}

export interface MultiIssueResult {
  settlements: IssueSettlement[]
  /** Utilidade capturada por cada lado (0..1) sob o pacote ótimo. */
  buyerUtility: number
  sellerUtility: number
  jointValue: number         // soma ponderada — proxy do tamanho da "torta"
  /** Ganho vs. simplesmente rachar cada issue no meio (valor da troca integrativa). */
  gainVsSplitDown: number
  note: string
}

/**
 * Aloca cada issue ao lado que MAIS o valoriza (concede ao vendedor onde o peso dele
 * é maior; ao comprador onde o dele é maior; meio-termo em empate). É a essência do
 * "logrolling" de Raiffa: trocar concessões em issues de baixo valor para você por
 * ganhos em issues de alto valor. Determinístico e auditável.
 */
export function multiIssueOptimizer(issues: NegotiationIssue[]): MultiIssueResult {
  if (issues.length === 0) {
    return { settlements: [], buyerUtility: 0, sellerUtility: 0, jointValue: 0, gainVsSplitDown: 0, note: 'Nenhum issue informado.' }
  }

  const settlements: IssueSettlement[] = []
  let buyerUtil = 0, sellerUtil = 0, splitDownJoint = 0, optimalJoint = 0
  let totalBuyerW = 0, totalSellerW = 0

  for (const it of issues) {
    totalBuyerW += it.buyerWeight
    totalSellerW += it.sellerWeight
    const mid = (it.buyerIdeal + it.sellerIdeal) / 2
    // Concede ao lado de maior peso; empate → meio-termo.
    let settledValue: number
    let favors: IssueSettlement['favors']
    if (it.buyerWeight > it.sellerWeight) { settledValue = it.buyerIdeal; favors = 'comprador' }
    else if (it.sellerWeight > it.buyerWeight) { settledValue = it.sellerIdeal; favors = 'vendedor' }
    else { settledValue = mid; favors = 'meio-termo' }

    settlements.push({ key: it.key, label: it.label, settledValue, favors, unit: it.unit })

    // Utilidade: quão perto o acordo ficou do ideal de cada lado (1 = ideal, 0 = ideal do oponente).
    const range = Math.abs(it.buyerIdeal - it.sellerIdeal) || 1
    const buyerU = 1 - Math.abs(settledValue - it.buyerIdeal) / range
    const sellerU = 1 - Math.abs(settledValue - it.sellerIdeal) / range
    buyerUtil += it.buyerWeight * buyerU
    sellerUtil += it.sellerWeight * sellerU
    optimalJoint += it.buyerWeight * buyerU + it.sellerWeight * sellerU

    // Cenário "rachar no meio": ambos ficam a 0.5 de utilidade em cada issue.
    splitDownJoint += it.buyerWeight * 0.5 + it.sellerWeight * 0.5
  }

  const buyerUtility = totalBuyerW ? buyerUtil / totalBuyerW : 0
  const sellerUtility = totalSellerW ? sellerUtil / totalSellerW : 0
  const jointValue = optimalJoint
  const gainVsSplitDown = optimalJoint - splitDownJoint

  return {
    settlements,
    buyerUtility,
    sellerUtility,
    jointValue,
    gainVsSplitDown,
    note: `Pacote integrativo captura utilidade ${(buyerUtility * 100).toFixed(0)}% comprador / ${(sellerUtility * 100).toFixed(0)}% vendedor. Trocar concessões por prioridade (logrolling) agrega ${gainVsSplitDown.toFixed(1)} de valor conjunto vs. rachar cada item no meio.`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) BATNA derivado — o walk-away não é chutado; vem da melhor alternativa.
// Comprador: paga no máximo o valor do ativo para ELE (valuation incl. sinergias),
// limitado pelo custo da próxima melhor alternativa (outro alvo / build-vs-buy).
// Vendedor: aceita no mínimo o maior entre valor standalone (DCF) e outra oferta.
// ─────────────────────────────────────────────────────────────────────────────

export interface BatnaInput {
  buyerStandaloneValue: number   // valor do alvo para o comprador (com sinergias)
  buyerNextBestCost?: number     // custo da próxima melhor alternativa (outro alvo/build)
  sellerStandaloneValue: number  // valor standalone do vendedor (DCF sozinho)
  sellerOtherOffer?: number      // melhor outra oferta na mesa para o vendedor
}

export interface BatnaResult {
  buyerWalkAway: number   // teto do comprador
  sellerWalkAway: number  // piso do vendedor
  note: string
}

/** Deriva walk-aways a partir de valuations — conecta a negociação ao motor (DCF/LBO). */
export function deriveBatna(i: BatnaInput): BatnaResult {
  // Comprador não paga mais que o valor para ele, nem mais que a próxima alternativa (se menor).
  const buyerWalkAway = i.buyerNextBestCost != null
    ? Math.min(i.buyerStandaloneValue, i.buyerNextBestCost)
    : i.buyerStandaloneValue
  // Vendedor não aceita menos que o maior entre ficar sozinho e a outra oferta.
  const sellerWalkAway = Math.max(i.sellerStandaloneValue, i.sellerOtherOffer ?? -Infinity)
  return {
    buyerWalkAway,
    sellerWalkAway,
    note: `Teto do comprador = min(valor com sinergias ${i.buyerStandaloneValue}${i.buyerNextBestCost != null ? `, próxima alternativa ${i.buyerNextBestCost}` : ''}) = ${buyerWalkAway}. Piso do vendedor = max(standalone ${i.sellerStandaloneValue}${i.sellerOtherOffer != null ? `, outra oferta ${i.sellerOtherOffer}` : ''}) = ${sellerWalkAway}.`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) OFERTA DE ABERTURA ÓTIMA sob incerteza (Monte Carlo). O reservation price da
// contraparte não é um ponto — é uma distribuição. Varremos ofertas possíveis e,
// para cada uma, estimamos P(fechar) e o excedente esperado, achando a abertura que
// MAXIMIZA o excedente esperado. RNG semeado (reprodutível).
// ─────────────────────────────────────────────────────────────────────────────

export interface OptimalOfferInput {
  side: 'comprador' | 'vendedor'
  ownWalkAway: number                 // seu limite (comprador: teto; vendedor: piso)
  counterMin: number                  // limite inferior do reservation price da contraparte
  counterMax: number                  // limite superior
  runs?: number
  seed?: number
}

export interface OptimalOfferResult {
  bestOffer: number
  expectedSurplus: number
  probClose: number
  curve: { offer: number; probClose: number; expectedSurplus: number }[]
  note: string
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export function optimalOpeningOffer(i: OptimalOfferInput): OptimalOfferResult {
  const runs = i.runs ?? 4000
  const rng = mulberry32(i.seed ?? 42)
  // Amostra do reservation price da contraparte ~ Uniforme[counterMin, counterMax].
  const samples = Array.from({ length: runs }, () => i.counterMin + rng() * (i.counterMax - i.counterMin))

  // Varre ofertas candidatas entre os limites relevantes.
  const lo = Math.min(i.ownWalkAway, i.counterMin)
  const hi = Math.max(i.ownWalkAway, i.counterMax)
  const steps = 40
  const curve: OptimalOfferResult['curve'] = []
  for (let s = 0; s <= steps; s++) {
    const offer = lo + ((hi - lo) * s) / steps
    let closes = 0, surplus = 0
    for (const rp of samples) {
      // Comprador oferece `offer`; fecha se offer ≥ reservation do vendedor E offer ≤ próprio teto.
      // Vendedor pede `offer`; fecha se offer ≤ reservation do comprador E offer ≥ próprio piso.
      let deal = false, myGain = 0
      if (i.side === 'comprador') {
        deal = offer >= rp && offer <= i.ownWalkAway
        myGain = deal ? i.ownWalkAway - offer : 0
      } else {
        deal = offer <= rp && offer >= i.ownWalkAway
        myGain = deal ? offer - i.ownWalkAway : 0
      }
      if (deal) { closes++; surplus += myGain }
    }
    curve.push({ offer, probClose: closes / runs, expectedSurplus: surplus / runs })
  }
  const best = curve.reduce((a, b) => (b.expectedSurplus > a.expectedSurplus ? b : a), curve[0])
  return {
    bestOffer: best.offer,
    expectedSurplus: best.expectedSurplus,
    probClose: best.probClose,
    curve,
    note: `Abertura ótima (${i.side}) ≈ ${best.offer.toFixed(0)}: maximiza o excedente esperado (${best.expectedSurplus.toFixed(1)}) com ${(best.probClose * 100).toFixed(0)}% de chance de fechar, dada a incerteza sobre o limite da contraparte.`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) PLANEJADOR DE CONCESSÕES — âncora → alvo → limite, com incrementos DECRESCENTES
// (sinalizam aproximação do limite, tática clássica). Gera a sequência de ofertas.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConcessionInput {
  side: 'comprador' | 'vendedor'
  anchor: number    // primeira oferta (agressiva a seu favor)
  target: number    // onde você quer fechar
  walkAway: number  // seu limite
  rounds: number    // nº de movimentos até o alvo
}

export interface ConcessionResult {
  steps: { round: number; offer: number; concession: number }[]
  note: string
}

/** Concessões decrescentes (cada passo menor que o anterior) do anchor até o target. */
export function concessionPlanner(i: ConcessionInput): ConcessionResult {
  const rounds = Math.max(1, Math.floor(i.rounds))
  // Pesos decrescentes (ex.: 1/2, 1/4, ...) normalizados para somar 1 → concessões que encolhem.
  const weights = Array.from({ length: rounds }, (_, k) => 1 / Math.pow(2, k + 1))
  const wsum = weights.reduce((a, b) => a + b, 0)
  const totalMove = i.target - i.anchor
  const steps: ConcessionResult['steps'] = []
  let cur = i.anchor
  for (let k = 0; k < rounds; k++) {
    const move = totalMove * (weights[k] / wsum)
    cur += move
    steps.push({ round: k + 1, offer: cur, concession: Math.abs(move) })
  }
  return {
    steps,
    note: `Plano de ${rounds} concessões decrescentes do anchor ${i.anchor} ao alvo ${i.target} (limite ${i.walkAway}). Incrementos que encolhem sinalizam à contraparte que você se aproxima do seu limite.`,
  }
}

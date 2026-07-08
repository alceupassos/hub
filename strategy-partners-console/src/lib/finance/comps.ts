// ─────────────────────────────────────────────────────────────────────────────
// Comparáveis — trading comps & precedent transactions.
//
// Estatística robusta (quartis por interpolação linear, mediana, média) sobre um
// conjunto de múltiplos, e valuation implícito (faixa) ao aplicar os múltiplos a
// uma métrica da empresa-alvo. Alimenta o "football field" (Fase E).
// ─────────────────────────────────────────────────────────────────────────────

export interface Stats {
  n: number
  min: number
  p25: number
  median: number
  p75: number
  max: number
  mean: number
}

/** Percentil por interpolação linear (método "linear"/R-7, igual ao Excel PERCENTILE.INC). */
export function percentile(sortedAsc: number[], p: number): number {
  const n = sortedAsc.length
  if (n === 0) return NaN
  if (n === 1) return sortedAsc[0]
  const rank = (p / 100) * (n - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  if (lo === hi) return sortedAsc[lo]
  const frac = rank - lo
  return sortedAsc[lo] + frac * (sortedAsc[hi] - sortedAsc[lo])
}

export function stats(values: number[]): Stats {
  const clean = values.filter(v => Number.isFinite(v)).slice().sort((a, b) => a - b)
  const n = clean.length
  if (n === 0) return { n: 0, min: NaN, p25: NaN, median: NaN, p75: NaN, max: NaN, mean: NaN }
  const mean = clean.reduce((a, v) => a + v, 0) / n
  return {
    n,
    min: clean[0],
    p25: percentile(clean, 25),
    median: percentile(clean, 50),
    p75: percentile(clean, 75),
    max: clean[n - 1],
    mean,
  }
}

export interface ImpliedValuation {
  metric: string
  metricValue: number
  multipleStats: Stats
  /** EV implícito nos quartis (p25/mediana/p75). */
  low: number
  base: number
  high: number
}

/** Aplica um conjunto de múltiplos (ex.: EV/EBITDA dos pares) a uma métrica-alvo. */
export function impliedValuation(metricName: string, metricValue: number, peerMultiples: number[]): ImpliedValuation {
  const s = stats(peerMultiples)
  return {
    metric: metricName,
    metricValue,
    multipleStats: s,
    low: s.p25 * metricValue,
    base: s.median * metricValue,
    high: s.p75 * metricValue,
  }
}

export interface FootballFieldBand {
  method: string
  low: number
  base: number
  high: number
}

export interface FootballField {
  bands: FootballFieldBand[]
  /** Faixa de consenso: mediana dos low e dos high, e mediana das bases. */
  overallLow: number
  overallBase: number
  overallHigh: number
}

/** Agrega várias metodologias de valuation numa faixa de consenso (football field). */
export function footballField(bands: FootballFieldBand[]): FootballField {
  if (bands.length === 0) return { bands, overallLow: NaN, overallBase: NaN, overallHigh: NaN }
  const lows = bands.map(b => b.low)
  const bases = bands.map(b => b.base)
  const highs = bands.map(b => b.high)
  return {
    bands,
    overallLow: percentile(lows.slice().sort((a, b) => a - b), 50),
    overallBase: percentile(bases.slice().sort((a, b) => a - b), 50),
    overallHigh: percentile(highs.slice().sort((a, b) => a - b), 50),
  }
}

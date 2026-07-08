// Monte Carlo (W4) — valuation probabilístico. RNG SEMEADO (mulberry32) para
// reprodutibilidade total: mesma semente → mesmo resultado. Amostra drivers de
// distribuições e roda o motor N vezes, agregando em percentis (P10/P50/P90).
import { dcf, type DcfInput } from './dcf'
import { lbo, type LboInput } from './lbo'

/** RNG determinístico mulberry32 — [0,1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Distribuição triangular (min, moda, max). */
export function sampleTriangular(rng: () => number, min: number, mode: number, max: number): number {
  const u = rng()
  const c = (mode - min) / (max - min || 1)
  if (u < c) return min + Math.sqrt(u * (max - min) * (mode - min))
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode))
}

/** Normal (Box-Muller) truncada a [min, max]. */
export function sampleNormalTrunc(rng: () => number, mean: number, sd: number, min: number, max: number): number {
  for (let i = 0; i < 20; i++) {
    const u1 = Math.max(rng(), 1e-12), u2 = rng()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const v = mean + z * sd
    if (v >= min && v <= max) return v
  }
  return Math.min(max, Math.max(min, mean))
}

export interface McDriver {
  key: 'growth' | 'exitMultiple' | 'wacc' | 'terminalGrowth'
  dist: 'triangular' | 'normal'
  params: number[] // triangular: [min,mode,max]; normal: [mean,sd,min,max]
}

export interface McResult {
  n: number
  values: number[]
  mean: number
  p10: number
  p50: number
  p90: number
  stdev: number
  probAboveHurdle: number | null
  bins: { x0: number; x1: number; count: number }[]
}

function sampleDriver(rng: () => number, d: McDriver): number {
  if (d.dist === 'triangular') return sampleTriangular(rng, d.params[0], d.params[1], d.params[2])
  return sampleNormalTrunc(rng, d.params[0], d.params[1], d.params[2], d.params[3])
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN
  if (sortedAsc.length === 1) return sortedAsc[0]
  const rank = (p / 100) * (sortedAsc.length - 1)
  const lo = Math.floor(rank), hi = Math.ceil(rank)
  return lo === hi ? sortedAsc[lo] : sortedAsc[lo] + (rank - lo) * (sortedAsc[hi] - sortedAsc[lo])
}

function aggregate(values: number[], hurdle: number | undefined, bins = 20): McResult {
  const sorted = values.slice().sort((a, b) => a - b)
  const n = sorted.length
  const mean = n ? sorted.reduce((s, v) => s + v, 0) / n : NaN
  const variance = n ? sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n : NaN
  const min = sorted[0] ?? NaN, max = sorted[n - 1] ?? NaN
  const width = (max - min) / bins || 1
  const hist = Array.from({ length: bins }, (_, i) => ({ x0: min + i * width, x1: min + (i + 1) * width, count: 0 }))
  for (const v of sorted) {
    let idx = Math.floor((v - min) / width)
    if (idx >= bins) idx = bins - 1
    if (idx < 0) idx = 0
    hist[idx].count++
  }
  return {
    n,
    values: sorted,
    mean,
    p10: percentile(sorted, 10),
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    stdev: Math.sqrt(variance),
    probAboveHurdle: hurdle == null ? null : sorted.filter(v => v >= hurdle).length / (n || 1),
    bins: hist,
  }
}

export interface McOpts { runs?: number; seed?: number; hurdle?: number }

/** Monte Carlo sobre LBO, coletando TIR (ignora runs sem solução). */
export function runMonteCarloLbo(base: LboInput, drivers: McDriver[], opts: McOpts = {}): McResult {
  const runs = opts.runs ?? 10000
  const rng = makeRng(opts.seed ?? 42)
  const values: number[] = []
  for (let i = 0; i < runs; i++) {
    const ov: Partial<Record<McDriver['key'], number>> = {}
    for (const d of drivers) ov[d.key] = sampleDriver(rng, d)
    const r = lbo({
      ...base,
      ebitdaGrowth: (base.ebitdaGrowth ?? 0) + (ov.growth ?? 0),
      exitMultiple: base.exitMultiple + (ov.exitMultiple ?? 0),
    })
    if (r.irr != null && Number.isFinite(r.irr)) values.push(r.irr)
  }
  return aggregate(values, opts.hurdle)
}

/** Monte Carlo sobre DCF, coletando Enterprise Value. */
export function runMonteCarloDcf(base: DcfInput, drivers: McDriver[], opts: McOpts = {}): McResult {
  const runs = opts.runs ?? 10000
  const rng = makeRng(opts.seed ?? 42)
  const values: number[] = []
  for (let i = 0; i < runs; i++) {
    const ov: Partial<Record<McDriver['key'], number>> = {}
    for (const d of drivers) ov[d.key] = sampleDriver(rng, d)
    try {
      const r = dcf({
        ...base,
        discountRate: base.discountRate + (ov.wacc ?? 0),
        terminalGrowth: ov.terminalGrowth ?? base.terminalGrowth,
      })
      if (Number.isFinite(r.enterpriseValue)) values.push(r.enterpriseValue)
    } catch { /* combinação inválida (ex.: WACC<=g) — descarta o run */ }
  }
  return aggregate(values, opts.hurdle)
}

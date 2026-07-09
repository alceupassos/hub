// ─────────────────────────────────────────────────────────────────────────────
// Análise de inflexão (Y3) — "o que mudaria minha decisão?". Dado um driver e uma
// função de resultado, encontra o VALOR DE VIRADA (breakpoint) onde o resultado
// cruza um limiar (ex.: a que churn o valuation cai abaixo do preço; a que WACC o
// spread ROIC−WACC zera). Determinístico (bisseção/varredura), auditável — o rigor
// que um comitê exige antes de aprovar um go/no-go.
// ─────────────────────────────────────────────────────────────────────────────

export interface InflectionInput {
  /** Nome do driver (ex.: 'churn', 'WACC', 'múltiplo de saída'). */
  driver: string
  /** Valor atual do driver. */
  current: number
  /** Limites de busca do driver. */
  min: number
  max: number
  /** f(driver) → resultado (ex.: valuation, TIR, spread). */
  outcome: (x: number) => number
  /** Limiar que define a virada da decisão (ex.: preço da oferta, hurdle, 0). */
  threshold: number
  /** Unidade do driver p/ exibição. */
  unit?: string
}

export interface InflectionResult {
  driver: string
  current: number
  currentOutcome: number
  threshold: number
  /** Valor do driver onde outcome cruza o threshold (null se não cruza no intervalo). */
  breakpoint: number | null
  /** Folga: distância do valor atual até o breakpoint (mesma unidade do driver). */
  headroom: number | null
  /** Direção: o resultado sobe ou desce com o driver? */
  direction: 'increasing' | 'decreasing' | 'flat'
  /** A decisão atual está acima ou abaixo do limiar? */
  currentSide: 'above' | 'below' | 'at'
  note: string
  unit?: string
}

/** Encontra onde outcome(x) = threshold por bisseção; assume monotonicidade no intervalo. */
export function findInflection(i: InflectionInput): InflectionResult {
  const fAtMin = i.outcome(i.min) - i.threshold
  const fAtMax = i.outcome(i.max) - i.threshold
  const currentOutcome = i.outcome(i.current)
  const direction: InflectionResult['direction'] =
    i.outcome(i.max) > i.outcome(i.min) + 1e-9 ? 'increasing'
    : i.outcome(i.max) < i.outcome(i.min) - 1e-9 ? 'decreasing' : 'flat'
  const currentSide: InflectionResult['currentSide'] =
    Math.abs(currentOutcome - i.threshold) < 1e-9 ? 'at' : currentOutcome > i.threshold ? 'above' : 'below'

  let breakpoint: number | null = null
  if (fAtMin * fAtMax <= 0 && direction !== 'flat') {
    // há cruzamento — bisseção
    let lo = i.min, hi = i.max
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2
      const fmid = i.outcome(mid) - i.threshold
      if (Math.abs(fmid) < 1e-7 || (hi - lo) / 2 < 1e-9) { breakpoint = mid; break }
      if ((i.outcome(lo) - i.threshold) * fmid < 0) hi = mid; else lo = mid
      breakpoint = (lo + hi) / 2
    }
  }

  const headroom = breakpoint == null ? null : breakpoint - i.current
  const u = i.unit ?? ''
  const note = breakpoint == null
    ? `No intervalo testado (${i.min}${u}–${i.max}${u}), ${i.driver} não faz o resultado cruzar o limiar — a decisão é robusta a este driver isoladamente.`
    : `Ponto de virada: ${i.driver} = ${breakpoint.toFixed(2)}${u} (hoje ${i.current}${u}, folga de ${Math.abs(headroom!).toFixed(2)}${u}). ${direction === 'decreasing' ? 'Acima disso' : 'Abaixo disso'} a decisão inverte.`

  return { driver: i.driver, current: i.current, currentOutcome, threshold: i.threshold, breakpoint, headroom, direction, currentSide, note, unit: i.unit }
}

/** Varre vários drivers e ranqueia por FRAGILIDADE (menor folga relativa = mais crítico). */
export function rankFragility(analyses: InflectionResult[]): InflectionResult[] {
  return [...analyses].sort((a, b) => {
    const fa = a.headroom == null ? Infinity : Math.abs(a.headroom / (a.current || 1))
    const fb = b.headroom == null ? Infinity : Math.abs(b.headroom / (b.current || 1))
    return fa - fb
  })
}

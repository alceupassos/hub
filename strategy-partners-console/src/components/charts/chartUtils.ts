// Primitivas compartilhadas dos gráficos SVG (W1). Sem dependência externa — SVG puro,
// temável via CSS vars do console. Segue o método dataviz: marcas finas, um eixo, cor por
// entidade (nunca por rank), texto em tokens de tinta (não na cor da série).

// Paleta categórica FIXA (ordem nunca ciclada) — coerente com o resto do app.
export const SERIES_COLORS = ['#0B3A78', '#1F9D6B', '#8B5CF6', '#C77800', '#B4462F', '#0E7490'] as const

// Formatadores
export const fmtNum = (n: number, d = 1) =>
  Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d }) : '—'
export const fmtPct = (n: number | null | undefined, d = 1) =>
  n == null || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(d)}%`
export const fmtCompact = (n: number) => {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return n.toFixed(0)
}

/** Interpola um valor [0..1] numa rampa sequencial (verde→âmbar→vermelho) para heatmaps. */
export function rampColor(t: number): string {
  const x = Math.max(0, Math.min(1, t))
  // 0 = verde (bom), 0.5 = âmbar, 1 = vermelho (ruim) — rampa diverging simples
  const stops = [
    { p: 0, c: [31, 157, 107] },   // success
    { p: 0.5, c: [199, 120, 0] },  // amber
    { p: 1, c: [180, 70, 47] },    // red
  ]
  let a = stops[0], b = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (x >= stops[i].p && x <= stops[i + 1].p) { a = stops[i]; b = stops[i + 1]; break }
  }
  const span = b.p - a.p || 1
  const f = (x - a.p) / span
  const rgb = a.c.map((ca, i) => Math.round(ca + (b.c[i] - ca) * f))
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

/** Escala linear → pixel. */
export function scale(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): number {
  const span = domainMax - domainMin || 1
  return rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin)
}

/** "Nice" ticks para eixos. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const span = max - min
  const step = Math.pow(10, Math.floor(Math.log10(span / count)))
  const err = (span / count) / step
  const mult = err >= 7.5 ? 10 : err >= 3 ? 5 : err >= 1.5 ? 2 : 1
  const niceStep = mult * step
  const start = Math.ceil(min / niceStep) * niceStep
  const ticks: number[] = []
  for (let t = start; t <= max + 1e-9; t += niceStep) ticks.push(Number(t.toFixed(10)))
  return ticks
}

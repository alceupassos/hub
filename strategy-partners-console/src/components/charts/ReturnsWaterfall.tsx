'use client'
import { useState } from 'react'
import { fmtCompact, scale } from './chartUtils'

// Waterfall de atribuição de retorno (LBO): equity de entrada → +crescimento EBITDA
// +expansão de múltiplo +desalavancagem → equity de saída. Verde=positivo, vermelho=negativo.

export interface WaterfallStep {
  label: string
  value: number       // delta (pode ser negativo); o primeiro e o último são "totais"
  isTotal?: boolean
}

export function ReturnsWaterfall({ steps, unit = '' }: { steps: WaterfallStep[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  if (!steps.length) return null

  const PAD_L = 16, PAD_R = 16, PAD_T = 24, PAD_B = 44
  const innerW = 620, innerH = 200
  const w = PAD_L + innerW + PAD_R
  const h = PAD_T + innerH + PAD_B
  const n = steps.length
  const gap = 14
  const barW = (innerW - gap * (n - 1)) / n

  // cumulativo p/ posicionar as barras
  let cum = 0
  const bars = steps.map((s) => {
    const start = s.isTotal ? 0 : cum
    const end = s.isTotal ? s.value : cum + s.value
    if (!s.isTotal) cum += s.value
    else cum = s.value
    return { ...s, start, end }
  })
  const allY = bars.flatMap(b => [b.start, b.end])
  const dmin = Math.min(0, ...allY)
  const dmax = Math.max(...allY) * 1.08
  const y = (v: number) => scale(v, dmin, dmax, PAD_T + innerH, PAD_T)

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 480 }} role="img" aria-label="Atribuição de retorno">
        {/* baseline zero */}
        <line x1={PAD_L} y1={y(0)} x2={PAD_L + innerW} y2={y(0)} stroke="var(--color-border-base)" strokeWidth={1} />
        {bars.map((b, i) => {
          const bx = PAD_L + i * (barW + gap)
          const top = Math.min(y(b.start), y(b.end))
          const barH = Math.max(2, Math.abs(y(b.end) - y(b.start)))
          const positive = b.end >= b.start
          const color = b.isTotal ? 'var(--color-accent)' : positive ? '#1F9D6B' : '#B4462F'
          const isHover = hover === i
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* conector pontilhado ao próximo */}
              {i < bars.length - 1 && (
                <line x1={bx + barW} y1={y(b.end)} x2={bx + barW + gap} y2={y(b.end)} stroke="var(--color-ink-7)" strokeWidth={1} strokeDasharray="2 2" />
              )}
              <rect x={bx} y={top} width={barW} height={barH} rx={4} fill={color} opacity={isHover ? 1 : 0.88} />
              {/* valor no topo */}
              <text x={bx + barW / 2} y={top - 5} textAnchor="middle" fontSize={9.5} fill="var(--color-ink-2)" fontFamily="var(--font-mono)" fontWeight={600}>
                {positive && !b.isTotal ? '+' : ''}{fmtCompact(b.end - (b.isTotal ? 0 : b.start))}
              </text>
              {/* rótulo (quebra em 2 linhas) */}
              <text x={bx + barW / 2} y={PAD_T + innerH + 16} textAnchor="middle" fontSize={9} fill="var(--color-ink-5)">
                {b.label.length > 14 ? b.label.slice(0, 13) + '…' : b.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

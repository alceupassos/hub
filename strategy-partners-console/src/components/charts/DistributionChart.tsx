'use client'
import { useState } from 'react'
import { fmtCompact, scale } from './chartUtils'

// Histograma de distribuição (Monte Carlo) com marcadores P10/P50/P90. Um eixo (valor);
// barras finas; percentis como linhas verticais rotuladas.

export interface DistributionData {
  bins: { x0: number; x1: number; count: number }[]
  p10: number
  p50: number
  p90: number
  hurdle?: number     // opcional: linha do hurdle (ex.: TIR mínima da tese)
  unit?: string
  isPct?: boolean
}

export function DistributionChart({ data }: { data: DistributionData }) {
  const [hover, setHover] = useState<number | null>(null)
  const { bins } = data
  if (!bins.length) return null

  const PAD_L = 16, PAD_R = 16, PAD_T = 30, PAD_B = 40
  const innerW = 620, innerH = 180
  const w = PAD_L + innerW + PAD_R
  const h = PAD_T + innerH + PAD_B

  const xMin = bins[0].x0, xMax = bins[bins.length - 1].x1
  const maxCount = Math.max(...bins.map(b => b.count))
  const x = (v: number) => scale(v, xMin, xMax, PAD_L, PAD_L + innerW)
  const barW = innerW / bins.length
  const fmtV = (v: number) => (data.isPct ? `${(v * 100).toFixed(0)}%` : fmtCompact(v)) + (data.unit ?? '')

  const marker = (v: number, label: string, color: string, dash = false) => (
    <g>
      <line x1={x(v)} y1={PAD_T - 4} x2={x(v)} y2={PAD_T + innerH} stroke={color} strokeWidth={1.5} strokeDasharray={dash ? '4 2' : undefined} />
      <text x={x(v)} y={PAD_T - 8} textAnchor="middle" fontSize={9} fill={color} fontFamily="var(--font-mono)" fontWeight={600}>{label} {fmtV(v)}</text>
    </g>
  )

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 480 }} role="img" aria-label="Distribuição Monte Carlo">
        <line x1={PAD_L} y1={PAD_T + innerH} x2={PAD_L + innerW} y2={PAD_T + innerH} stroke="var(--color-border-base)" strokeWidth={1} />
        {bins.map((b, i) => {
          const bh = maxCount ? (b.count / maxCount) * innerH : 0
          const isHover = hover === i
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x(b.x0) + 1} y={PAD_T + innerH - bh} width={Math.max(1, barW - 2)} height={bh} rx={2}
                fill="var(--color-accent)" opacity={isHover ? 0.9 : 0.55} />
              {isHover && (
                <text x={x((b.x0 + b.x1) / 2)} y={PAD_T + innerH - bh - 4} textAnchor="middle" fontSize={9} fill="var(--color-ink-3)" fontFamily="var(--font-mono)">{b.count}</text>
              )}
            </g>
          )
        })}
        {/* eixo x ticks */}
        {[xMin, (xMin + xMax) / 2, xMax].map((t, i) => (
          <text key={i} x={x(t)} y={PAD_T + innerH + 16} textAnchor="middle" fontSize={9.5} fill="var(--color-ink-6)" fontFamily="var(--font-mono)">{fmtV(t)}</text>
        ))}
        {/* percentis */}
        {marker(data.p10, 'P10', 'var(--color-ink-5)')}
        {marker(data.p50, 'P50', 'var(--color-accent)')}
        {marker(data.p90, 'P90', 'var(--color-ink-5)')}
        {data.hurdle != null && marker(data.hurdle, 'hurdle', '#B4462F', true)}
      </svg>
    </div>
  )
}

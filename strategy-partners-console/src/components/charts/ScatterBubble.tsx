'use client'
import { useState } from 'react'
import { scale, niceTicks, fmtCompact, toneColor, type Tone } from './chartUtils'

// Bubble scatter — cada ponto é uma entidade (deal). Dois eixos + gridlines; raio ∝ magnitude.
// Cor por tom semântico (go/no_go/watch), nunca por rank. Tooltip no hover mostra label/x/y.

export interface BubblePoint {
  x: number
  y: number
  r: number // raio "bruto" (ex.: ARR) — normalizado internamente para px
  label: string
  tone?: Tone
}

export function ScatterBubble({
  points,
  xLabel,
  yLabel,
  fmtX = fmtCompact,
  fmtY = fmtCompact,
  height = 260,
}: {
  points: BubblePoint[]
  xLabel: string
  yLabel: string
  fmtX?: (n: number) => string
  fmtY?: (n: number) => string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const pts = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
  if (!pts.length) return null

  const PAD_L = 52, PAD_R = 18, PAD_T = 14, PAD_B = 34
  const innerW = 620
  const w = PAD_L + innerW + PAD_R
  const h = height

  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const xmin = Math.min(...xs), xmax = Math.max(...xs)
  const ymin = Math.min(...ys), ymax = Math.max(...ys)
  const xlo = xmin === xmax ? xmin - 1 : xmin - (xmax - xmin) * 0.08
  const xhi = xmin === xmax ? xmax + 1 : xmax + (xmax - xmin) * 0.08
  const ylo = ymin === ymax ? Math.max(0, ymin - 1) : Math.max(0, ymin - (ymax - ymin) * 0.1)
  const yhi = ymin === ymax ? ymax + 1 : ymax + (ymax - ymin) * 0.1

  const px = (v: number) => scale(v, xlo, xhi, PAD_L, PAD_L + innerW)
  const py = (v: number) => scale(v, ylo, yhi, h - PAD_B, PAD_T)

  const rs = pts.map(p => (Number.isFinite(p.r) ? Math.abs(p.r) : 0))
  const rmax = Math.max(...rs, 1)
  const pr = (r: number) => 5 + Math.sqrt(Math.max(0, r) / rmax) * 16

  const xTicks = niceTicks(xlo, xhi, 5)
  const yTicks = niceTicks(ylo, yhi, 4)

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 520 }} role="img" aria-label={`${xLabel} vs ${yLabel}`}>
        {/* gridlines Y + eixo */}
        {yTicks.map((t, i) => (
          <g key={`y${i}`}>
            <line x1={PAD_L} y1={py(t)} x2={PAD_L + innerW} y2={py(t)} stroke="var(--color-border-div)" strokeWidth={1} />
            <text x={PAD_L - 6} y={py(t) + 3} textAnchor="end" fontSize={9.5} fill="var(--color-ink-6)" fontFamily="var(--font-mono)">{fmtY(t)}</text>
          </g>
        ))}
        {/* ticks X */}
        {xTicks.map((t, i) => (
          <text key={`x${i}`} x={px(t)} y={h - PAD_B + 15} textAnchor="middle" fontSize={9.5} fill="var(--color-ink-6)" fontFamily="var(--font-mono)">{fmtX(t)}</text>
        ))}
        {/* rótulos dos eixos */}
        <text x={PAD_L + innerW / 2} y={h - 4} textAnchor="middle" fontSize={10} fill="var(--color-ink-5)">{xLabel}</text>
        <text x={12} y={PAD_T + (h - PAD_T - PAD_B) / 2} textAnchor="middle" fontSize={10} fill="var(--color-ink-5)" transform={`rotate(-90 12 ${PAD_T + (h - PAD_T - PAD_B) / 2})`}>{yLabel}</text>

        {/* bolhas */}
        {pts.map((p, i) => {
          const c = toneColor(p.tone, '#0B3A78')
          const isHover = hover === i
          return (
            <circle
              key={i}
              cx={px(p.x)} cy={py(p.y)} r={pr(p.r)}
              fill={c} fillOpacity={isHover ? 0.42 : 0.24}
              stroke={c} strokeWidth={isHover ? 1.6 : 1}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer', transition: 'fill-opacity .12s' }}
            />
          )
        })}

        {/* tooltip */}
        {hover != null && pts[hover] && (() => {
          const p = pts[hover]
          const tx = Math.min(px(p.x) + 10, w - 150)
          const ty = Math.max(py(p.y) - 40, PAD_T)
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={144} height={40} rx={6} fill="var(--color-ink-0)" opacity={0.94} />
              <text x={tx + 9} y={ty + 15} fontSize={10.5} fill="#fff" fontWeight={600}>{p.label.length > 20 ? p.label.slice(0, 19) + '…' : p.label}</text>
              <text x={tx + 9} y={ty + 30} fontSize={9.5} fill="#cfd6e0" fontFamily="var(--font-mono)">{xLabel}: {fmtX(p.x)} · {yLabel}: {fmtY(p.y)}</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

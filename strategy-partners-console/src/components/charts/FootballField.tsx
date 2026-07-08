'use client'
import { useState } from 'react'
import { fmtCompact, scale, niceTicks } from './chartUtils'

// Football field — faixas de valuation (low–base–high) por metodologia, num eixo comum.
// Marca fina (faixa) + linha do base; hover mostra os três valores. Um eixo (EV).

export interface FootballBand {
  method: string
  low: number
  base: number
  high: number
  highlight?: boolean // faixa de consenso destacada
}

export function FootballField({ bands, unit = '', height }: { bands: FootballBand[]; unit?: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  if (!bands.length) return null

  const PAD_L = 130, PAD_R = 24, PAD_T = 10, PAD_B = 28
  const rowH = 34
  const innerW = 640
  const h = (height ?? bands.length * rowH) + PAD_T + PAD_B
  const w = PAD_L + innerW + PAD_R

  const allVals = bands.flatMap(b => [b.low, b.high]).filter(Number.isFinite)
  const dmin = Math.min(...allVals) * 0.95
  const dmax = Math.max(...allVals) * 1.05
  const x = (v: number) => scale(v, dmin, dmax, PAD_L, PAD_L + innerW)
  const ticks = niceTicks(dmin, dmax, 5)

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 520 }} role="img" aria-label="Football field de valuation">
        {/* grid vertical + eixo */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={x(t)} y1={PAD_T} x2={x(t)} y2={h - PAD_B} stroke="var(--color-border-div)" strokeWidth={1} />
            <text x={x(t)} y={h - PAD_B + 16} textAnchor="middle" fontSize={9.5} fill="var(--color-ink-6)" fontFamily="var(--font-mono)">{fmtCompact(t)}{unit}</text>
          </g>
        ))}
        {bands.map((b, i) => {
          const cy = PAD_T + i * rowH + rowH / 2
          const isHover = hover === i
          const color = b.highlight ? 'var(--color-accent)' : '#0B3A78'
          return (
            <g key={b.method} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
              <rect x={0} y={PAD_T + i * rowH} width={w} height={rowH} fill={isHover ? 'var(--color-hover-bg)' : 'transparent'} />
              <text x={PAD_L - 12} y={cy + 3.5} textAnchor="end" fontSize={11} fill="var(--color-ink-3)" fontWeight={b.highlight ? 600 : 400}>{b.method}</text>
              {/* faixa low–high */}
              <rect
                x={x(b.low)} y={cy - 6} width={Math.max(2, x(b.high) - x(b.low))} height={12} rx={4}
                fill={color} opacity={b.highlight ? 0.32 : 0.22}
              />
              {/* marcador do base */}
              <line x1={x(b.base)} y1={cy - 9} x2={x(b.base)} y2={cy + 9} stroke={color} strokeWidth={2.5} />
              {/* rótulos low/high só no hover */}
              {isHover && (
                <>
                  <text x={x(b.low) - 4} y={cy + 3.5} textAnchor="end" fontSize={9} fill="var(--color-ink-5)" fontFamily="var(--font-mono)">{fmtCompact(b.low)}</text>
                  <text x={x(b.high) + 4} y={cy + 3.5} textAnchor="start" fontSize={9} fill="var(--color-ink-5)" fontFamily="var(--font-mono)">{fmtCompact(b.high)}</text>
                  <text x={x(b.base)} y={cy - 13} textAnchor="middle" fontSize={9.5} fill="var(--color-ink-2)" fontFamily="var(--font-mono)" fontWeight={600}>{fmtCompact(b.base)}{unit}</text>
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { fmtCompact, rampColor } from './chartUtils'
import type { DataTable2D } from '@/lib/finance/sensitivity'

// Heatmap de sensibilidade 2D (ex.: EV vs WACC×g). Cor sequencial pela magnitude da célula.
// Consome DataTable2D do motor (dataTable2D). Um eixo por dimensão; célula rotulada.

export function SensitivityHeatmap({ table, unit = '', fmtAxis = (n: number) => String(n) }: {
  table: DataTable2D
  unit?: string
  fmtAxis?: (n: number) => string
}) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)
  const rows = table.rowValues.length
  const cols = table.colValues.length
  if (!rows || !cols) return null

  const flat = table.matrix.flat().filter(Number.isFinite)
  const min = Math.min(...flat), max = Math.max(...flat)
  const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min))

  const PAD_L = 76, PAD_T = 40, cellW = 74, cellH = 34, PAD_R = 12, PAD_B = 12
  const w = PAD_L + cols * cellW + PAD_R
  const h = PAD_T + rows * cellH + PAD_B

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 420 }} role="img" aria-label="Heatmap de sensibilidade">
        {/* rótulos de eixo */}
        <text x={PAD_L + (cols * cellW) / 2} y={14} textAnchor="middle" fontSize={10} fill="var(--color-ink-5)" fontWeight={600}>{table.colLabel}</text>
        <text x={16} y={PAD_T + (rows * cellH) / 2} textAnchor="middle" fontSize={10} fill="var(--color-ink-5)" fontWeight={600} transform={`rotate(-90 16 ${PAD_T + (rows * cellH) / 2})`}>{table.rowLabel}</text>
        {/* cabeçalho de colunas */}
        {table.colValues.map((cv, c) => (
          <text key={c} x={PAD_L + c * cellW + cellW / 2} y={PAD_T - 8} textAnchor="middle" fontSize={9.5} fill="var(--color-ink-4)" fontFamily="var(--font-mono)">{fmtAxis(cv)}</text>
        ))}
        {table.rowValues.map((rv, r) => (
          <g key={r}>
            <text x={PAD_L - 8} y={PAD_T + r * cellH + cellH / 2 + 3.5} textAnchor="end" fontSize={9.5} fill="var(--color-ink-4)" fontFamily="var(--font-mono)">{fmtAxis(rv)}</text>
            {table.colValues.map((_, c) => {
              const v = table.matrix[r][c]
              const isHover = hover?.r === r && hover?.c === c
              return (
                <g key={c} onMouseEnter={() => setHover({ r, c })} onMouseLeave={() => setHover(null)}>
                  <rect
                    x={PAD_L + c * cellW + 1} y={PAD_T + r * cellH + 1}
                    width={cellW - 2} height={cellH - 2} rx={3}
                    fill={rampColor(1 - norm(v))} opacity={isHover ? 1 : 0.85}
                    stroke={isHover ? 'var(--color-ink-0)' : 'transparent'} strokeWidth={isHover ? 1.5 : 0}
                  />
                  <text x={PAD_L + c * cellW + cellW / 2} y={PAD_T + r * cellH + cellH / 2 + 3.5} textAnchor="middle" fontSize={9.5} fill="#fff" fontFamily="var(--font-mono)" fontWeight={600}>{fmtCompact(v)}{unit}</text>
                </g>
              )
            })}
          </g>
        ))}
      </svg>
    </div>
  )
}

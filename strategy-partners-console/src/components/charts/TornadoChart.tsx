'use client'
import { fmtCompact, scale } from './chartUtils'
import type { TornadoResult } from '@/lib/finance/sensitivity'

// Tornado — fatores ranqueados pelo impacto (swing) sobre o resultado, barras divergindo
// do valor-base. O de maior swing no topo. Um eixo (resultado).

export function TornadoChart({ data, unit = '' }: { data: TornadoResult; unit?: string }) {
  const factors = data.factors
  if (!factors.length) return null

  const PAD_L = 150, PAD_R = 20, PAD_T = 26, PAD_B = 24
  const rowH = 30, innerW = 480
  const w = PAD_L + innerW + PAD_R
  const h = PAD_T + factors.length * rowH + PAD_B

  const allVals = [data.base, ...factors.flatMap(f => [f.low, f.high])]
  const dmin = Math.min(...allVals), dmax = Math.max(...allVals)
  const pad = (dmax - dmin) * 0.08 || 1
  const x = (v: number) => scale(v, dmin - pad, dmax + pad, PAD_L, PAD_L + innerW)

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 440 }} role="img" aria-label="Análise tornado">
        {/* linha do valor-base */}
        <line x1={x(data.base)} y1={PAD_T - 6} x2={x(data.base)} y2={h - PAD_B} stroke="var(--color-ink-6)" strokeWidth={1.5} strokeDasharray="3 2" />
        <text x={x(data.base)} y={PAD_T - 10} textAnchor="middle" fontSize={9} fill="var(--color-ink-5)" fontFamily="var(--font-mono)">base {fmtCompact(data.base)}{unit}</text>
        {factors.map((f, i) => {
          const cy = PAD_T + i * rowH + rowH / 2
          const lo = Math.min(f.low, f.high), hi = Math.max(f.low, f.high)
          const leftIsLow = x(lo) < x(data.base)
          return (
            <g key={f.name}>
              <text x={PAD_L - 12} y={cy + 3.5} textAnchor="end" fontSize={10.5} fill="var(--color-ink-3)">{f.name.length > 18 ? f.name.slice(0, 17) + '…' : f.name}</text>
              {/* metade baixa (vermelha) e alta (verde) em relação ao base */}
              <rect x={x(lo)} y={cy - 8} width={Math.max(1, x(data.base) - x(lo))} height={16} rx={3} fill="#B4462F" opacity={0.8} />
              <rect x={x(data.base)} y={cy - 8} width={Math.max(1, x(hi) - x(data.base))} height={16} rx={3} fill="#1F9D6B" opacity={0.8} />
              <text x={x(lo) - 4} y={cy + 3.5} textAnchor="end" fontSize={8.5} fill="var(--color-ink-6)" fontFamily="var(--font-mono)">{fmtCompact(lo)}</text>
              <text x={x(hi) + 4} y={cy + 3.5} textAnchor="start" fontSize={8.5} fill="var(--color-ink-6)" fontFamily="var(--font-mono)">{fmtCompact(hi)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

'use client'
import { SERIES_COLORS, toneColor, type Tone } from './chartUtils'

// Donut SVG — arcos proporcionais ao valor, com legenda. Serve como gauge (2 segmentos:
// preenchido + resto neutro) ou split de composição. Cor por tom quando informado, senão
// pela paleta categórica fixa. Rótulo/valor central opcionais.

export interface DonutSegment {
  label: string
  value: number
  tone?: Tone
}

export function Donut({
  segments,
  centerLabel,
  centerValue,
  size = 148,
}: {
  segments: DonutSegment[]
  centerLabel?: string
  centerValue?: string | number
  size?: number
}) {
  const segs = segments.filter(s => Number.isFinite(s.value) && s.value > 0)
  const total = segs.reduce((a, s) => a + s.value, 0)
  if (!segs.length || total <= 0) return null

  const stroke = 16
  const r = (size - stroke) / 2
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r

  let offset = 0
  const arcs = segs.map((s, i) => {
    const frac = s.value / total
    const color = toneColor(s.tone, SERIES_COLORS[i % SERIES_COLORS.length])
    const dash = frac * circ
    const arc = { color, dash, gap: circ - dash, off: offset, label: s.label, value: s.value, frac }
    offset += dash
    return arc
  })

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-track)" strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color} strokeWidth={stroke}
            strokeDasharray={`${a.dash} ${a.gap}`}
            strokeDashoffset={-a.off}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        ))}
        {(centerValue != null || centerLabel) && (
          <>
            {centerValue != null && (
              <text x={cx} y={centerLabel ? cy - 1 : cy + 5} textAnchor="middle" fontSize={22} fontWeight={600} fill="var(--color-ink-0)" fontFamily="var(--font-mono)">{centerValue}</text>
            )}
            {centerLabel && (
              <text x={cx} y={centerValue != null ? cy + 16 : cy + 4} textAnchor="middle" fontSize={10} fill="var(--color-ink-5)">{centerLabel}</text>
            )}
          </>
        )}
      </svg>
      <div className="space-y-1.5 min-w-0">
        {arcs.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-[11.5px]">
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: a.color }} />
            <span className="text-ink-3 truncate">{a.label}</span>
            <span className="text-ink-6 font-mono ml-auto pl-2">{(a.frac * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

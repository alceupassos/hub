'use client'
import { toneColor, type Tone } from './chartUtils'

// Linha de KPIs — tiles responsivos. Número grande em tinta forte; rótulo/legenda discretos.
// O 'tone' colore apenas um filete lateral (sinal), nunca o texto inteiro.

export interface StatTile {
  label: string
  value: string | number
  sub?: string
  tone?: Tone
}

export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  if (!tiles.length) return null
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
      {tiles.map((t, i) => (
        <div
          key={i}
          className="bg-surface border border-border-card rounded-[10px] px-4 py-3"
          style={{ borderLeft: `3px solid ${toneColor(t.tone, 'var(--color-border-input)')}` }}
        >
          <p className="text-[11px] text-ink-5 mb-1 truncate">{t.label}</p>
          <p className="text-[19px] font-semibold text-ink-0 leading-none font-mono">{t.value}</p>
          {t.sub && <p className="text-[10.5px] text-ink-6 mt-1 truncate">{t.sub}</p>}
        </div>
      ))}
    </div>
  )
}

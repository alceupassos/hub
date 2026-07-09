'use client'
import { fmtCompact } from './chartUtils'

// Funil horizontal — cada estágio é uma barra proporcional à contagem. Entre estágios,
// mostra a taxa de conversão (passo-a-passo). Um eixo implícito (contagem). Cor única sóbria.

export interface FunnelStage {
  label: string
  count: number
  value?: number | null // Σ opcional (ex.: ARR) exibido junto da contagem
}

export function Funnel({ stages, fmtValue = fmtCompact }: { stages: FunnelStage[]; fmtValue?: (n: number) => string }) {
  if (!stages.length) return null
  const maxCount = Math.max(...stages.map(s => s.count), 1)
  const rowH = 34
  const gap = 10

  return (
    <div className="w-full">
      <div className="space-y-0">
        {stages.map((s, i) => {
          const w = Math.max(4, (s.count / maxCount) * 100)
          const prev = i > 0 ? stages[i - 1].count : null
          const conv = prev && prev > 0 ? s.count / prev : null
          return (
            <div key={s.label}>
              {conv != null && (
                <div className="flex items-center justify-center" style={{ height: gap + 6 }}>
                  <span className="text-[9.5px] font-mono text-ink-6 leading-none">↓ {(conv * 100).toFixed(0)}%</span>
                </div>
              )}
              <div className="flex items-center gap-3" style={{ height: rowH }}>
                <span className="text-[11px] text-ink-4 w-[92px] shrink-0 text-right truncate">{s.label}</span>
                <div className="flex-1 min-w-0">
                  <div
                    className="h-[26px] rounded-[5px] flex items-center px-2.5 transition-all"
                    style={{ width: `${w}%`, minWidth: 40, background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)', borderLeft: '3px solid var(--color-accent)' }}
                  >
                    <span className="text-[11.5px] font-semibold text-ink-1 font-mono">{s.count}</span>
                    {s.value != null && Number.isFinite(s.value) && s.value > 0 && (
                      <span className="text-[10px] text-ink-5 font-mono ml-2">· {fmtValue(s.value)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'
// Comparação de barras agrupadas (ex.: Tradicional vs IA por fase). Duas séries com
// cor por entidade (fixa), legenda presente, valores como rótulo direto. Um eixo.

export interface ComparisonRow {
  label: string
  a: number   // série A (ex.: Tradicional)
  b: number   // série B (ex.: IA)
}

export function BarComparison({
  rows, seriesA = 'Tradicional', seriesB = 'IA Angra', fmt = (n: number) => String(Math.round(n)),
  colorA = '#B4462F', colorB = 'var(--color-accent)',
}: {
  rows: ComparisonRow[]
  seriesA?: string
  seriesB?: string
  fmt?: (n: number) => string
  colorA?: string
  colorB?: string
}) {
  if (!rows.length) return null
  const max = Math.max(...rows.flatMap(r => [r.a, r.b]), 1)

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1.5 text-[10px] text-ink-5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorA }} /> {seriesA}</span>
        <span className="flex items-center gap-1.5 text-[10px] text-ink-5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorB }} /> {seriesB}</span>
      </div>
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.label}>
            <div className="text-[11px] text-ink-5 mb-1">{r.label}</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-4 rounded bg-track overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(r.a / max) * 100}%`, background: colorA }} />
                </div>
                <span className="w-24 text-right text-[10px] font-mono text-ink-4">{fmt(r.a)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-4 rounded bg-track overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(r.b / max) * 100}%`, background: colorB }} />
                </div>
                <span className="w-24 text-right text-[10px] font-mono text-ink-2 font-semibold">{fmt(r.b)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

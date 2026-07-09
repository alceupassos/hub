'use client'
import { useMemo, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { CalendarRange, Info } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { buildDealTimeline } from '@/lib/finance/dealTimeline'
import { scale } from '@/components/charts/chartUtils'

export default function CronogramaPage() {
  const { lang } = useLang()
  const en = lang === 'en'
  const [complexity, setComplexity] = useState(1.5)

  const tl = useMemo(() => buildDealTimeline({ dataroomComplexity: complexity, lang: en ? 'en' : 'pt' }), [complexity, en])

  const L = en ? {
    title: 'Deal timeline', sub: 'Sourcing → closing schedule with milestones, owners and the critical path.',
    noteWhat: 'Deal timeline — the end-to-end schedule with the critical path.',
    noteUse: 'Generates the M&A calendar (sourcing to closing) with each phase’s duration and owner, highlighting the critical path (the sequence that determines the closing date). Adjust the dataroom complexity — diligence is the main bottleneck.',
    fComplexity: 'Dataroom complexity (×)', total: 'Total', critical: 'Critical path', weeks: 'weeks', days: 'days',
    phase: 'Phase', owner: 'Owner', duration: 'Duration', criticalBadge: 'critical',
  } : {
    title: 'Cronograma do deal', sub: 'Calendário sourcing → fechamento com marcos, responsáveis e caminho crítico.',
    noteWhat: 'Cronograma do deal — o calendário ponta a ponta com o caminho crítico.',
    noteUse: 'Gera o calendário do M&A (do sourcing ao fechamento) com a duração e o responsável de cada fase, destacando o caminho crítico (a sequência que determina a data de fechamento). Ajuste a complexidade do dataroom — a diligence é o principal gargalo.',
    fComplexity: 'Complexidade do dataroom (×)', total: 'Total', critical: 'Caminho crítico', weeks: 'semanas', days: 'dias',
    phase: 'Fase', owner: 'Responsável', duration: 'Duração', criticalBadge: 'crítico',
  }

  const maxDay = tl.totalDays || 1
  const x = (d: number) => scale(d, 0, maxDay, 0, 100)

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto px-8 py-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0"><CalendarRange size={18} className="text-white" /></div>
            <div>
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">{L.title}</h1>
              <p className="text-[12.5px] text-ink-5">{L.sub}</p>
            </div>
          </div>

          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
            <Info size={15} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-ink-3 leading-relaxed"><strong>{L.noteWhat}</strong> {L.noteUse}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
            <div className="content-start">
              <label className="block mb-4">
                <span className="block text-[10px] uppercase tracking-wider text-ink-6 mb-1">{L.fComplexity}</span>
                <input type="number" value={complexity} step={0.1} min={1} onChange={e => setComplexity(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
              </label>
              <div className="p-4 rounded-xl border border-border-card bg-surface space-y-2">
                <div><div className="text-[10px] uppercase tracking-wider text-ink-6">{L.total}</div><div className="text-[22px] font-semibold text-accent">{tl.totalDays} {L.days}</div><div className="text-[11px] text-ink-5">{tl.totalWeeks} {L.weeks}</div></div>
                <div className="pt-2 border-t border-border-soft"><div className="text-[10px] uppercase tracking-wider text-ink-6">{L.critical}</div><div className="text-[18px] font-semibold text-[#B4462F]">{tl.criticalPathDays} {L.days}</div></div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border-card bg-surface">
              {/* Gantt SVG simples */}
              <div className="space-y-2">
                {tl.items.map(it => (
                  <div key={it.key} className="grid grid-cols-[150px_1fr_70px] items-center gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-ink-1 truncate">{it.label}</div>
                      <div className="text-[10px] text-ink-6 truncate">{it.owner}</div>
                    </div>
                    <div className="relative h-6 rounded bg-track">
                      <div className="absolute h-full rounded flex items-center px-2"
                        style={{ left: `${x(it.startDay)}%`, width: `${x(it.endDay) - x(it.startDay)}%`, background: it.critical ? '#B4462F' : 'var(--color-accent)', opacity: it.critical ? 0.9 : 0.7 }}>
                        {it.critical && <span className="text-[8px] text-white uppercase tracking-wider">{L.criticalBadge}</span>}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-ink-4 text-right">{it.durationDays} {L.days}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-ink-6 leading-relaxed">{tl.note}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

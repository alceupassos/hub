'use client'
import { ChevronRight, ChevronLeft, FileText } from 'lucide-react'
import type { Model } from '@/lib/types'
import { useLang } from '@/lib/lang'
import { getT } from '@/lib/i18n'

interface Props {
  open: boolean
  models: Model[]
  activeCount: number
  toggleModel: (id: string) => void
  toggleInspector: () => void
}

const ATTACHMENTS = ['Câmbio_LATAM_Q2.xlsx', 'Plano_Expansão_MX.pdf']

export function Inspector({ open, models, activeCount, toggleModel, toggleInspector }: Props) {
  const { lang } = useLang()
  const t = getT(lang)

  if (!open) {
    return (
      <aside className="w-[46px] shrink-0 border-l border-border-base bg-surface flex flex-col items-center py-4 gap-3 transition-[width] duration-150">
        <button
          onClick={toggleInspector}
          aria-label={t.openPanel}
          className="w-[30px] h-[30px] flex items-center justify-center rounded-lg hover:bg-hover-bg transition-colors text-ink-5"
        >
          <ChevronLeft size={15} strokeWidth={1.7} />
        </button>
        <span
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-6 mt-2"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {t.execution.toUpperCase()} · {activeCount}/{models.length}
        </span>
      </aside>
    )
  }

  return (
    <aside className="w-[276px] shrink-0 border-l border-border-base bg-surface flex flex-col overflow-y-auto transition-[width] duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-[15px] py-[14px] shrink-0">
        <span className="text-[11.5px] font-semibold text-ink-0">{t.execution}</span>
        <button
          onClick={toggleInspector}
          aria-label={t.collapsePanel}
          className="w-[26px] h-[26px] flex items-center justify-center rounded-md hover:bg-hover-bg transition-colors text-ink-5"
        >
          <ChevronRight size={14} strokeWidth={1.7} />
        </button>
      </div>

      <div className="px-[15px] pb-4 space-y-4 overflow-y-auto">
        {/* Metrics */}
        <div className="space-y-[9px]">
          {[
            { label: t.latency, value: '1.24s' },
            { label: t.tokens,  value: '4 812' },
            { label: t.cost,    value: 'US$ 0.14' },
            { label: t.agentsNav ?? 'Agents', value: `${activeCount}/${models.length}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[11.5px] text-ink-5">{label}</span>
              <span className="font-mono text-[12px] text-ink-0">{value}</span>
            </div>
          ))}
        </div>

        <div className="h-px bg-border-div" />

        {/* Agreement */}
        <div>
          <p className="text-[11.5px] font-semibold text-ink-0 mb-2">{t.agreement}</p>
          <div className="space-y-[10px]">
            <AgreementBar label={t.phased} count={2} total={3} color="#1F9D6B" ofLabel={t.of} />
            <AgreementBar label={t.awaitQ4} count={1} total={3} color="#C2C8D2" ofLabel={t.of} />
          </div>
        </div>

        <div className="h-px bg-border-div" />

        {/* Agent toggles */}
        <div>
          <p className="text-[11.5px] font-semibold text-ink-0 mb-2">{t.activeAgents}</p>
          <div className="space-y-[2px]">
            {models.map(model => (
              <ModelToggleRow
                key={model.id}
                model={model}
                onToggle={() => toggleModel(model.id)}
              />
            ))}
          </div>
        </div>

        <div className="h-px bg-border-div" />

        {/* Context */}
        <div>
          <p className="text-[11.5px] font-semibold text-ink-0 mb-2">{t.context}</p>
          <div className="space-y-[6px]">
            {ATTACHMENTS.map(name => (
              <div
                key={name}
                className="flex items-center gap-2 bg-subtle-bg border border-border-soft rounded-[7px] px-[8px] py-[5px]"
              >
                <FileText size={12} strokeWidth={1.6} className="text-ink-6 shrink-0" />
                <span className="text-[11.5px] text-ink-5 truncate">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

function AgreementBar({
  label,
  count,
  total,
  color,
  ofLabel,
}: {
  label: string
  count: number
  total: number
  color: string
  ofLabel: string
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-ink-5">{label}</span>
        <span className="font-mono text-[10.5px] text-ink-6">
          {count} {ofLabel} {total}
        </span>
      </div>
      <div className="w-full h-[6px] bg-track rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(count / total) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function ModelToggleRow({ model, onToggle }: { model: Model; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-[10px] py-[6px] rounded-[7px] hover:bg-hover-bg transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-[8px]">
        <span
          className="w-[8px] h-[8px] rounded-full shrink-0 transition-colors"
          style={{ backgroundColor: model.on ? model.dot : '#D4D8DF' }}
        />
        <span
          className={`text-[12px] transition-colors ${
            model.on ? 'text-ink-0' : 'text-ink-6'
          }`}
        >
          {model.name}
        </span>
      </div>

      {/* Pill switch */}
      <div
        className="relative w-[30px] h-[17px] rounded-full transition-colors duration-150 shrink-0"
        style={{ backgroundColor: model.on ? '#0B3A78' : '#E0E3E9' }}
      >
        <div
          className="absolute top-[2px] w-[13px] h-[13px] rounded-full bg-white shadow-sm transition-all duration-150"
          style={{ left: model.on ? '15px' : '2px' }}
        />
      </div>
    </button>
  )
}

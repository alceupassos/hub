'use client'
import { Download, MessageCircleQuestion, PanelRight } from 'lucide-react'
import type { Tab } from '@/lib/types'
import { useLang } from '@/lib/lang'
import { getT } from '@/lib/i18n'

interface Props {
  tab: Tab
  setTab: (t: Tab) => void
  inspectorOpen: boolean
  toggleInspector: () => void
  onExport: () => void
  discoveryMode: boolean
  onToggleDiscovery: () => void
}

export function ConsoleHeader({ tab, setTab, inspectorOpen, toggleInspector, onExport, discoveryMode, onToggleDiscovery }: Props) {
  const { lang } = useLang()
  const t = getT(lang)

  const TABS: { id: Tab; label: string }[] = [
    { id: 'comparar', label: t.tabCompare },
    { id: 'sintese',  label: t.tabSynthesis },
    { id: 'timeline', label: t.tabTimeline },
  ]

  return (
    <header className="h-[54px] shrink-0 border-b border-border-base bg-surface px-[18px] flex items-center justify-between gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 shrink">
        <span className="text-[12.5px] text-ink-5 whitespace-nowrap overflow-hidden text-ellipsis">
          {t.projects} /{' '}
          <strong className="text-[13.5px] font-semibold text-ink-0">
            Expansão LATAM — Q3
          </strong>
        </span>
        <span className="font-mono text-[10px] text-success bg-success-bg px-[7px] py-[2px] rounded-[5px] shrink-0">
          {t.completed}
        </span>
      </div>

      {/* Tab control */}
      <div className="flex items-center bg-track rounded-lg p-[3px] shrink-0">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-[13px] py-[5px] rounded-md text-[12px] transition-all ${
              tab === id
                ? 'bg-surface text-ink-0 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.07)]'
                : 'text-ink-5 hover:text-ink-0'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleDiscovery}
          title="Ativar perguntas de descoberta antes da análise"
          className={`flex items-center gap-[6px] px-3 py-[6px] rounded-lg border text-[12px] transition-colors ${
            discoveryMode
              ? 'border-accent bg-accent-soft text-accent font-medium'
              : 'border-border-input text-ink-4 hover:bg-hover-bg'
          }`}
        >
          <MessageCircleQuestion size={13} strokeWidth={1.6} />
          Discovery
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-[6px] px-3 py-[6px] rounded-lg border border-border-input text-[12px] text-ink-4 hover:bg-hover-bg transition-colors"
        >
          <Download size={13} strokeWidth={1.6} />
          {t.export}
        </button>
        <button
          onClick={toggleInspector}
          aria-label={inspectorOpen ? t.collapsePanel : t.openPanel}
          className="w-[32px] h-[32px] flex items-center justify-center rounded-lg border border-border-input text-ink-4 hover:bg-hover-bg transition-colors"
        >
          <PanelRight size={15} strokeWidth={1.6} />
        </button>
      </div>
    </header>
  )
}

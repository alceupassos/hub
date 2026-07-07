'use client'
import { useState } from 'react'
import { CheckCircle2, XCircle, Plus, Minus, Users } from 'lucide-react'
import type { Agent } from '@/lib/types'
import { useAgentConfig } from '@/lib/agent-config'

interface ExcludedEntry {
  id: string
  reason: string
}

interface Props {
  selected: string[]
  excluded: ExcludedEntry[]
  allAgents: Agent[]
  lang: 'pt' | 'en'
  onConfirm: (finalIds: string[]) => void
  onCancel: () => void
}

const L = {
  pt: {
    title: 'Painel de Controle — Seleção de Agentes',
    subtitle: 'Analisamos a questão e selecionamos os agentes mais relevantes. Ajuste conforme necessário.',
    colSelected: 'Serão chamados',
    colExcluded: 'Não selecionados',
    btnInclude: '+ Incluir',
    btnRemove: '− Remover',
    actionAll: 'Todos',
    actionRecommended: 'Recomendados',
    cta: (n: number) => `Iniciar análise com ${n} agente${n !== 1 ? 's' : ''}`,
    cancel: 'Cancelar',
    reason: 'Motivo:',
  },
  en: {
    title: 'Control Panel — Agent Selection',
    subtitle: 'We analyzed the question and selected the most relevant agents. Adjust as needed.',
    colSelected: 'Will be called',
    colExcluded: 'Not selected',
    btnInclude: '+ Include',
    btnRemove: '− Remove',
    actionAll: 'All',
    actionRecommended: 'Recommended',
    cta: (n: number) => `Run analysis with ${n} agent${n !== 1 ? 's' : ''}`,
    cancel: 'Cancel',
    reason: 'Reason:',
  },
}

export function AgentSelectionModal({
  selected,
  excluded,
  allAgents,
  lang,
  onConfirm,
  onCancel,
}: Props) {
  const t = L[lang] ?? L['pt']
  const { getDisplayName } = useAgentConfig()
  const [included, setIncluded] = useState<Set<string>>(() => new Set(selected))

  const recommendedIds = new Set(selected)

  function include(id: string) {
    setIncluded(prev => new Set([...prev, id]))
  }

  function remove(id: string) {
    setIncluded(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function selectAll() {
    setIncluded(new Set(allAgents.map(a => a.id)))
  }

  function selectRecommended() {
    setIncluded(new Set(recommendedIds))
  }

  const includedAgents = allAgents.filter(a => included.has(a.id))
  const excludedEntries = [
    ...excluded.filter(e => !included.has(e.id)),
    ...allAgents
      .filter(a => !recommendedIds.has(a.id) && !included.has(a.id) && !excluded.find(e => e.id === a.id))
      .map(a => ({ id: a.id, reason: '' })),
  ]

  function getAgent(id: string) {
    return allAgents.find(a => a.id === id)
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-[780px] max-h-[88vh] flex flex-col bg-app-bg border border-border-base rounded-[16px] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-[22px] py-[16px] border-b border-border-base flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-0">{t.title}</h2>
            <p className="text-[12px] text-ink-5 mt-[3px] leading-snug">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-[6px] shrink-0 mt-[2px]">
            <button
              onClick={selectAll}
              className="px-[10px] py-[5px] rounded-lg border border-border-input text-[11.5px] text-ink-4 hover:bg-hover-bg transition-colors"
            >
              {t.actionAll}
            </button>
            <button
              onClick={selectRecommended}
              className="px-[10px] py-[5px] rounded-lg border border-accent/40 text-[11.5px] text-accent hover:bg-accent-soft transition-colors"
            >
              {t.actionRecommended}
            </button>
          </div>
        </div>

        {/* Body — two columns */}
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 divide-x divide-border-base">

          {/* Left — selected */}
          <div className="p-[14px] space-y-[2px]">
            <div className="flex items-center gap-[6px] mb-[10px]">
              <CheckCircle2 size={13} className="text-success shrink-0" />
              <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-wide">
                {t.colSelected}
              </span>
              <span className="ml-auto font-mono text-[10px] text-ink-7 bg-track px-[6px] py-[2px] rounded-[5px]">
                {includedAgents.length}
              </span>
            </div>

            {includedAgents.map(agent => (
              <div
                key={agent.id}
                className="flex items-center gap-[8px] px-[10px] py-[7px] rounded-[8px] hover:bg-hover-bg group transition-colors"
              >
                <span
                  className="w-[8px] h-[8px] rounded-full shrink-0"
                  style={{ backgroundColor: agent.dot }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-ink-1 truncate">{getDisplayName(agent.id)}</p>
                  <p className="text-[10.5px] text-ink-6 truncate">{agent.role}</p>
                </div>
                <button
                  onClick={() => remove(agent.id)}
                  title={t.btnRemove}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-[10.5px] text-ink-6 hover:text-error px-[6px] py-[2px] rounded-[5px] hover:bg-error/8 transition-all"
                >
                  {t.btnRemove}
                </button>
              </div>
            ))}

            {includedAgents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users size={22} className="text-ink-7 mb-2" />
                <p className="text-[11.5px] text-ink-7">
                  {lang === 'pt' ? 'Nenhum agente selecionado' : 'No agents selected'}
                </p>
              </div>
            )}
          </div>

          {/* Right — excluded */}
          <div className="p-[14px] space-y-[2px]">
            <div className="flex items-center gap-[6px] mb-[10px]">
              <XCircle size={13} className="text-ink-6 shrink-0" />
              <span className="text-[11px] font-semibold text-ink-5 uppercase tracking-wide">
                {t.colExcluded}
              </span>
              <span className="ml-auto font-mono text-[10px] text-ink-7 bg-track px-[6px] py-[2px] rounded-[5px]">
                {excludedEntries.length}
              </span>
            </div>

            {excludedEntries.map(entry => {
              const agent = getAgent(entry.id)
              if (!agent) return null
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-[8px] px-[10px] py-[7px] rounded-[8px] hover:bg-hover-bg group transition-colors opacity-60 hover:opacity-90"
                >
                  <span
                    className="w-[8px] h-[8px] rounded-full shrink-0 mt-[5px] grayscale"
                    style={{ backgroundColor: agent.dot }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-ink-3 truncate">{getDisplayName(agent.id)}</p>
                    {entry.reason && (
                      <p className="text-[10px] text-ink-7 truncate">
                        <span className="font-medium">{t.reason}</span> {entry.reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => include(entry.id)}
                    title={t.btnInclude}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-[10.5px] text-accent px-[6px] py-[2px] rounded-[5px] border border-accent/30 hover:bg-accent-soft transition-all whitespace-nowrap"
                  >
                    {t.btnInclude}
                  </button>
                </div>
              )
            })}

            {excludedEntries.length === 0 && (
              <p className="text-[11.5px] text-ink-7 text-center py-8">
                {lang === 'pt' ? 'Todos os agentes selecionados' : 'All agents selected'}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-[22px] py-[14px] border-t border-border-base flex items-center justify-between gap-4">
          <button
            onClick={onCancel}
            className="text-[12px] text-ink-5 hover:text-ink-2 transition-colors px-3 py-[6px] rounded-lg hover:bg-hover-bg"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => onConfirm(Array.from(included))}
            disabled={included.size === 0}
            className="px-[20px] py-[9px] rounded-[10px] bg-accent text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {t.cta(included.size)}
          </button>
        </div>
      </div>
    </div>
  )
}

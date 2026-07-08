'use client'

import { Sparkles, Check, X, Info } from 'lucide-react'
import { AGENTS } from '@/lib/agents'
import { useAgentConfig } from '@/lib/agent-config'

// Uma recomendação do orquestrador: qual agente adicional ativar para ESTE desafio,
// acompanhada de uma justificativa curta. Espelha o shape retornado por
// /api/agent-selection (campo `recommendations`).
export type AgentRecommendation = { agentId: string; reason: string }

interface Props {
  /** Agentes recomendados para o desafio atual, com justificativa cada. */
  recommendations: AgentRecommendation[]
  /** Ativar um agente (o pai liga a participação — ex.: toggleModel/setModels). */
  onAccept: (agentId: string) => void
  /** Descartar a sugestão (nada é ativado). */
  onDismiss: (agentId: string) => void
  /** Opcional: aceitar todas as recomendações de uma vez. */
  onAcceptAll?: () => void
  lang?: 'pt' | 'en'
}

const L = {
  pt: {
    title: 'Recomendados para este desafio',
    note: 'O orquestrador identificou especialistas adicionais que reforçam esta análise.',
    use: 'Cada sugestão traz o porquê; aceite os que fizerem sentido — nada é ativado sem sua confirmação.',
    accept: 'Ativar',
    dismiss: 'Dispensar',
    acceptAll: 'Ativar todos',
  },
  en: {
    title: 'Recommended for this challenge',
    note: 'The orchestrator identified additional specialists that strengthen this analysis.',
    use: 'Each suggestion explains why; accept the ones that fit — nothing is activated without your confirmation.',
    accept: 'Activate',
    dismiss: 'Dismiss',
    acceptAll: 'Activate all',
  },
}

export function AgentSuggestions({
  recommendations,
  onAccept,
  onDismiss,
  onAcceptAll,
  lang = 'pt',
}: Props) {
  const t = L[lang] ?? L.pt
  const { getDisplayName } = useAgentConfig()

  if (!recommendations.length) return null

  return (
    <section className="rounded-[12px] border border-border-card bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-[15px] pt-[13px] pb-[10px]">
        <Sparkles size={14} className="text-accent shrink-0" strokeWidth={1.8} />
        <h3 className="text-[12.5px] font-semibold text-ink-0">{t.title}</h3>
        {onAcceptAll && recommendations.length > 1 && (
          <button
            onClick={onAcceptAll}
            className="ml-auto text-[11px] font-medium text-accent hover:bg-accent-soft px-[9px] py-[4px] rounded-lg transition-colors"
          >
            {t.acceptAll}
          </button>
        )}
      </div>

      {/* PanelNote-style explanation: what it is / what for / how to use */}
      <div className="mx-[15px] mb-[11px] flex items-start gap-2.5 rounded-lg border border-border-card bg-subtle-bg px-3.5 py-2.5">
        <Info size={13} className="text-accent mt-0.5 shrink-0" />
        <p className="text-[11.5px] text-ink-4 leading-relaxed">
          <span className="text-ink-2 font-medium">{t.note}</span> {t.use}
        </p>
      </div>

      {/* Suggestions list */}
      <ul className="px-[9px] pb-[10px] space-y-[2px]">
        {recommendations.map(({ agentId, reason }) => {
          const agent = AGENTS.find(a => a.id === agentId)
          if (!agent) return null
          return (
            <li
              key={agentId}
              className="flex items-center gap-[10px] px-[8px] py-[8px] rounded-[9px] hover:bg-hover-bg transition-colors"
            >
              <span
                className="w-[9px] h-[9px] rounded-full shrink-0"
                style={{ backgroundColor: agent.dot }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-ink-1 truncate">
                  {getDisplayName(agentId)}
                </p>
                <p className="text-[11px] text-ink-5 leading-snug">{reason}</p>
              </div>
              <div className="flex items-center gap-[5px] shrink-0">
                <button
                  onClick={() => onAccept(agentId)}
                  title={t.accept}
                  className="flex items-center gap-[4px] text-[11px] font-medium text-accent border border-accent/35 hover:bg-accent-soft px-[9px] py-[5px] rounded-lg transition-colors"
                >
                  <Check size={12} strokeWidth={2} />
                  {t.accept}
                </button>
                <button
                  onClick={() => onDismiss(agentId)}
                  title={t.dismiss}
                  aria-label={t.dismiss}
                  className="flex items-center justify-center w-[26px] h-[26px] text-ink-6 hover:text-ink-2 hover:bg-hover-bg rounded-lg transition-colors"
                >
                  <X size={13} strokeWidth={1.9} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

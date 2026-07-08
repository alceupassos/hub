'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Model } from '@/lib/types'
import type { Translations } from '@/lib/i18n'
import { isPrincipal } from '@/lib/agentTiers'
import { DeliverableButtons } from '@/components/DeliverableButtons'

interface Props {
  activeModels: Model[]
  agentConf: Record<string, number>
  question: string
  synthesis: string
  synthLoading: boolean
  t: Translations
}

export function SinteseView({ activeModels, agentConf, question, synthesis, synthLoading, t }: Props) {
  // Só agentes que de fato responderam (confiança > 0; fora de escopo = 0).
  const confs = Object.values(agentConf).filter(c => c > 0)
  const activeCount = confs.length || activeModels.length
  const avgConf = confs.length > 0 ? Math.round(confs.reduce((s, v) => s + v, 0) / confs.length) : 0
  // Concordância REAL: quantos com alta convicção (≥72%), coerente com o Inspector.
  const agreementCount = confs.filter(c => c >= 72).length

  return (
    <div className="bg-surface border border-border-card rounded-[10px] p-[26px_30px] space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-[25px] h-[25px] rounded-[7px] bg-accent-soft flex items-center justify-center shrink-0">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
              d="M6.5 1L8.2 4.7L12 5.3L9.25 8L9.9 12L6.5 10.1L3.1 12L3.75 8L1 5.3L4.8 4.7L6.5 1Z"
              stroke="#0B3A78"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-[12.5px] font-semibold text-ink-0 flex-1">{t.strategicSynth}</p>
        <span className="font-mono text-[10px] text-ink-6">
          {t.consensusOf(activeCount)}{avgConf > 0 ? ` · ${avgConf}% conf.` : ''}
        </span>
      </div>

      {/* Question */}
      {question && (
        <div className="bg-subtle-bg border border-border-soft rounded-[8px] px-[14px] py-[10px]">
          <p className="text-[11.5px] text-ink-5 mb-[3px]">{t.tabCompare}</p>
          <p className="text-[13.5px] text-ink-1 leading-[1.5] font-medium">{question}</p>
        </div>
      )}

      {/* Synthesis body */}
      {synthLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-active-bg rounded w-3/4" />
          <div className="h-3 bg-active-bg rounded w-full" />
          <div className="h-3 bg-active-bg rounded w-5/6" />
          <div className="h-3 bg-active-bg rounded w-2/3" />
        </div>
      ) : synthesis ? (
        <div className="prose prose-sm max-w-none text-ink-2
          [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:text-ink-0 [&_h2]:mt-5 [&_h2]:mb-2
          [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-ink-1 [&_h3]:mt-4 [&_h3]:mb-1
          [&_p]:text-[13.5px] [&_p]:leading-[1.7] [&_p]:text-ink-2
          [&_ul]:pl-4 [&_li]:text-[13.5px] [&_li]:leading-[1.7] [&_li]:text-ink-2
          [&_ol]:pl-4
          [&_strong]:text-ink-0 [&_strong]:font-semibold
          [&_table]:text-[12px] [&_table]:w-full [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink-0 [&_th]:py-1 [&_th]:pr-3
          [&_td]:text-ink-3 [&_td]:py-1 [&_td]:pr-3 [&_tr]:border-b [&_tr]:border-border-soft">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{synthesis}</ReactMarkdown>
        </div>
      ) : (
        false
      )}

      {/* Entregáveis — só quando há síntese pronta */}
      {!synthLoading && synthesis && (
        <div className="border-t border-border-foot pt-4">
          <DeliverableButtons data={{ dealName: question ? question.slice(0, 60) : 'Mandato', synthesis }} />
        </div>
      )}

      {!synthLoading && !synthesis && (
        <p className="text-[13.5px] text-ink-6 leading-[1.7] italic">
          {t.synthBody}
        </p>
      )}

      {/* Footer — principais em destaque, subagentes subordinados */}
      {(() => {
        const principais = activeModels.filter(m => isPrincipal(m.id))
        const subagentes = activeModels.filter(m => !isPrincipal(m.id))
        const chip = (model: Model, lead: boolean) => (
          <span key={model.id} className="flex items-center gap-[5px]">
            <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ backgroundColor: model.dot }} />
            <span className={`text-[11.5px] ${lead ? 'text-ink-1 font-medium' : 'text-ink-5'}`}>{model.name}</span>
            {agentConf[model.id] != null && (
              <span className="font-mono text-[10px] text-ink-7">{agentConf[model.id]}%</span>
            )}
          </span>
        )
        return (
          <div className="border-t border-border-foot pt-3 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11.5px] text-ink-5">{t.synthesizedFrom}</span>
                {principais.length > 0 ? principais.map(m => chip(m, true)) : <span className="text-[11.5px] text-ink-6">—</span>}
              </div>
              <span className="font-mono text-[10.5px] text-success">{t.agreementFrac(agreementCount, activeCount)}</span>
            </div>
            {subagentes.length > 0 && (
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.08em] text-ink-6">
                  {t.subagentsLabel}
                </span>
                {subagentes.map(m => chip(m, false))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

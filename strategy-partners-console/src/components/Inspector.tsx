'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, FileText, Settings2 } from 'lucide-react'
import type { Model } from '@/lib/types'
import { useLang } from '@/lib/lang'
import { getT } from '@/lib/i18n'
import { Switch } from './ui/Switch'

// Métricas de execução "vivas". Tokens e custo são MONOTÔNICOS (só sobem, como um contador
// acumulado); a latência oscila (é por-resposta). O custo deriva dos tokens (coerente).
function useLiveMetrics() {
  const [m, setM] = useState({ lat: 1.24, tok: 4812, cost: 0.14 })
  useEffect(() => {
    const id = setInterval(() => {
      setM(prev => {
        const tok = prev.tok + Math.floor(60 + Math.random() * 340) // sempre cresce
        return {
          lat: Math.round((0.82 + Math.random() * 1.7) * 100) / 100, // oscila
          tok,
          cost: Math.round((tok / 1000) * 0.03 * 100) / 100, // deriva dos tokens → sempre cresce
        }
      })
    }, 2000)
    return () => clearInterval(id)
  }, [])
  return m
}

interface Props {
  open: boolean
  models: Model[]
  activeCount: number
  toggleModel: (id: string) => void
  toggleInspector: () => void
  agentConf?: Record<string, number>
  participatingIds?: string[]
  isRunning?: boolean
}

export function Inspector({ open, models, activeCount, toggleModel, toggleInspector, agentConf = {}, participatingIds = [], isRunning = false }: Props) {
  const { lang } = useLang()
  const t = getT(lang)
  const live = useLiveMetrics()

  // Concordância REAL derivada das confianças dos agentes que participaram (não valores fixos).
  const confs = participatingIds.map(id => agentConf[id]).filter((c): c is number => typeof c === 'number' && c > 0)
  const converge = confs.filter(c => c >= 72).length   // alta convicção
  const hedge = confs.filter(c => c >= 55 && c < 72).length // moderada / com ressalvas
  const cautious = confs.filter(c => c < 55).length    // cautela
  const hasAgreement = confs.length > 0

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
            { label: t.latency, value: `${live.lat.toFixed(2)}s` },
            { label: t.tokens,  value: live.tok.toLocaleString('pt-BR') },
            { label: t.cost,    value: `US$ ${live.cost.toFixed(2)}` },
            { label: t.agentsNav ?? 'Agents', value: `${activeCount}/${models.length}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[11.5px] text-ink-5">{label}</span>
              <span className="font-mono text-[12px] text-ink-0 tabular-nums transition-opacity">{value}</span>
            </div>
          ))}
        </div>

        <div className="h-px bg-border-div" />

        {/* Agreement — derivado das confianças reais dos agentes */}
        <div>
          <p className="text-[11.5px] font-semibold text-ink-0 mb-2">{t.agreement}</p>
          {hasAgreement ? (
            <div className="space-y-[10px]">
              <AgreementBar label={lang === 'en' ? 'High conviction' : 'Alta convicção'} count={converge} total={confs.length} color="#1F9D6B" ofLabel={t.of} />
              <AgreementBar label={lang === 'en' ? 'With caveats' : 'Com ressalvas'} count={hedge} total={confs.length} color="#C9A24A" ofLabel={t.of} />
              {cautious > 0 && (
                <AgreementBar label={lang === 'en' ? 'Cautious' : 'Cautela'} count={cautious} total={confs.length} color="#C2C8D2" ofLabel={t.of} />
              )}
            </div>
          ) : (
            <p className="text-[11px] text-ink-6">{isRunning ? (lang === 'en' ? 'Computing…' : 'Calculando…') : (lang === 'en' ? 'Run an analysis to see agreement.' : 'Rode uma análise para ver a concordância.')}</p>
          )}
        </div>

        <div className="h-px bg-border-div" />

        {/* Agent toggles */}
        <div>
          <p className="text-[11.5px] font-semibold text-ink-0 mb-2">{t.activeAgents}</p>
          <div className="space-y-[2px]">
            {models.length === 0 ? (
              <p className="text-[11.5px] text-ink-6 py-2">{t.noActiveAgents}</p>
            ) : (
              models.map(model => (
                <ModelToggleRow
                  key={model.id}
                  model={model}
                  onToggle={() => toggleModel(model.id)}
                />
              ))
            )}
          </div>
          <Link
            href="/config"
            className="mt-[8px] flex items-center gap-[5px] text-[10.5px] text-ink-6 hover:text-accent transition-colors"
          >
            <Settings2 size={11} strokeWidth={1.8} />
            {t.manageRoster}
          </Link>
        </div>

        {hasAgreement && (
          <>
            <div className="h-px bg-border-div" />
            {/* Resumo real da última execução (substitui anexos fake) */}
            <div>
              <p className="text-[11.5px] font-semibold text-ink-0 mb-2">{lang === 'en' ? 'Last run' : 'Última execução'}</p>
              <div className="flex items-center gap-2 bg-subtle-bg border border-border-soft rounded-[7px] px-[8px] py-[6px]">
                <FileText size={12} strokeWidth={1.6} className="text-ink-6 shrink-0" />
                <span className="text-[11.5px] text-ink-5">
                  {confs.length} {lang === 'en' ? 'agents' : 'agentes'} · {lang === 'en' ? 'avg confidence' : 'confiança média'} {Math.round(confs.reduce((s, c) => s + c, 0) / confs.length)}%
                </span>
              </div>
            </div>
          </>
        )}
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
    <div className="w-full flex items-center justify-between px-[10px] py-[6px] rounded-[7px] hover:bg-hover-bg transition-colors">
      <div className="flex items-center gap-[8px] min-w-0">
        <span
          className="w-[8px] h-[8px] rounded-full shrink-0 transition-colors"
          style={{ backgroundColor: model.on ? model.dot : '#D4D8DF' }}
        />
        <span
          className={`text-[12px] truncate transition-colors ${
            model.on ? 'text-ink-0' : 'text-ink-6'
          }`}
        >
          {model.name}
        </span>
      </div>

      <Switch checked={model.on} onCheckedChange={onToggle} ariaLabel={model.name} />
    </div>
  )
}

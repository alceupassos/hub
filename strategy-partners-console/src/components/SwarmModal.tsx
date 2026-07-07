'use client'
import { useEffect } from 'react'
import { X, Loader2, Check, AlertTriangle, Sparkles } from 'lucide-react'
import type { Model } from '@/lib/types'
import { useLang } from '@/lib/lang'

interface Props {
  open: boolean
  onClose: () => void
  models: Model[]
  participatingIds: string[]
  agentLoading: Record<string, boolean>
  agentTimings: Record<string, number>
  agentTexts: Record<string, string>
  synthLoading: boolean
  synthesis: string
  question: string
}

type Status = 'pending' | 'running' | 'done' | 'timeout' | 'scope'

// Modal de execução ao vivo: mostra em tempo real o que cada agente está fazendo e garante
// que o usuário veja o encerramento (concluído / sem resposta) — nunca uma tela "travada".
export function SwarmModal({ open, onClose, models, participatingIds, agentLoading, agentTimings, agentTexts, synthLoading, synthesis, question }: Props) {
  const { lang } = useLang()
  const en = lang === 'en'

  // Fecha no ESC
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  const ids = participatingIds.length ? participatingIds : models.filter(m => m.on).map(m => m.id)
  const statusOf = (id: string): Status => {
    if (agentLoading[id]) return 'running'
    const txt = agentTexts[id]
    if (txt == null) return 'pending'
    const t = txt.trim()
    if (t.startsWith('⏳')) return 'timeout'
    if (t.startsWith('ℹ')) return 'scope'
    return t ? 'done' : 'scope'
  }

  const done = ids.filter(id => !agentLoading[id] && agentTexts[id] != null).length
  const total = ids.length || 1
  const allDone = done >= total && ids.length > 0
  const synthDone = Boolean(synthesis && !synthLoading)
  const complete = allDone && !synthLoading
  const pct = complete ? 100 : Math.round((done / total) * 85 + (synthLoading ? 8 : synthDone ? 15 : 0))

  const L = en
    ? { title: 'Live execution', running: 'analyzing…', doneL: 'done', timeoutL: 'timed out', scopeL: 'out of scope', pending: 'queued', synth: 'Synthesis (CAIO)', synthRun: 'consolidating…', synthOk: 'ready', complete: 'Execution complete', inflight: 'Running', close: 'Close' }
    : { title: 'Execução ao vivo', running: 'analisando…', doneL: 'concluído', timeoutL: 'tempo excedido', scopeL: 'fora de escopo', pending: 'na fila', synth: 'Síntese (CAIO)', synthRun: 'consolidando…', synthOk: 'pronta', complete: 'Execução concluída', inflight: 'Em execução', close: 'Fechar' }

  const badge = (s: Status, id: string) => {
    if (s === 'running') return <span className="flex items-center gap-1 text-[11px] text-accent"><Loader2 size={12} className="animate-spin" />{L.running}</span>
    if (s === 'done') return <span className="flex items-center gap-1 text-[11px] text-green-700"><Check size={12} />{L.doneL}{agentTimings[id] ? ` · ${agentTimings[id].toFixed(1)}s` : ''}</span>
    if (s === 'timeout') return <span className="flex items-center gap-1 text-[11px] text-orange-600"><AlertTriangle size={12} />{L.timeoutL}</span>
    if (s === 'scope') return <span className="text-[11px] text-ink-6">{L.scopeL}</span>
    return <span className="text-[11px] text-ink-6">{L.pending}</span>
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div className="bg-surface rounded-[14px] w-[520px] max-w-full max-h-[85vh] overflow-hidden flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        {/* header + progress */}
        <div className="px-5 py-4 border-b border-border-div">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-accent" />
            <span className="text-[14px] font-semibold text-ink-0">{L.title}</span>
            <span className={`ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${complete ? 'bg-green-100 text-green-700' : 'bg-accent-soft text-accent'}`}>
              {complete ? L.complete : L.inflight}
            </span>
            <button onClick={onClose} className="ml-auto text-ink-6 hover:text-ink-0" aria-label={L.close}><X size={16} /></button>
          </div>
          {question && <p className="text-[11.5px] text-ink-5 mt-2 line-clamp-2">{question}</p>}
          <div className="mt-3 h-[7px] rounded-full bg-track overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10.5px] text-ink-6">{done}/{total} {en ? 'agents' : 'agentes'}</span>
            <span className="text-[10.5px] font-mono font-semibold text-accent">{pct}%</span>
          </div>
        </div>

        {/* agents */}
        <div className="px-5 py-3 overflow-y-auto space-y-1">
          {ids.map(id => {
            const m = models.find(x => x.id === id)
            const s = statusOf(id)
            return (
              <div key={id} className="flex items-center gap-2.5 py-2 border-b border-border-div last:border-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m?.dot ?? '#98A1B0' }} />
                <span className="text-[12.5px] text-ink-0 flex-1 min-w-0 truncate">{m?.name ?? id}</span>
                {badge(s, id)}
              </div>
            )
          })}
          {/* synthesis row */}
          <div className="flex items-center gap-2.5 py-2 mt-1 border-t border-border-div">
            <span className="w-2 h-2 rounded-full shrink-0 bg-accent" />
            <span className="text-[12.5px] font-medium text-ink-0 flex-1">{L.synth}</span>
            {synthLoading
              ? <span className="flex items-center gap-1 text-[11px] text-accent"><Loader2 size={12} className="animate-spin" />{L.synthRun}</span>
              : synthDone
                ? <span className="flex items-center gap-1 text-[11px] text-green-700"><Check size={12} />{L.synthOk}</span>
                : <span className="text-[11px] text-ink-6">{L.pending}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

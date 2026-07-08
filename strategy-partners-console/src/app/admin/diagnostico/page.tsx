'use client'
import { useEffect, useState, useCallback } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { useLang } from '@/lib/lang'

interface Check { key: string; label: string; status: 'ok' | 'degraded' | 'fail'; detail: string }
interface DeepHealth { ok: boolean; checkedAt: string; summary: { ok: number; degraded: number; fail: number }; checks: Check[] }

const ICON = {
  ok: <CheckCircle2 size={16} className="text-success" />,
  degraded: <AlertTriangle size={16} className="text-[#C77800]" />,
  fail: <XCircle size={16} className="text-[#B4462F]" />,
}

export default function DiagnosticoPage() {
  const { lang } = useLang()
  const en = lang === 'en'
  const [health, setHealth] = useState<DeepHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  const run = useCallback(() => {
    setLoading(true)
    fetch('/api/health/deep')
      .then(async r => { if (r.status === 403) { setDenied(true); return null } return r.json() })
      .then(d => { if (d) setHealth(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { run() }, [run])

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-ink-0 flex items-center gap-2"><Activity size={17} className="text-accent" /> {en ? 'System diagnostics' : 'Diagnóstico do sistema'}</h1>
            <p className="text-[12px] text-ink-5 mt-0.5">{en ? 'End-to-end double-check before releasing to the evaluator.' : 'Double-check ponta a ponta antes de liberar para o avaliador.'}</p>
          </div>
          <button onClick={run} disabled={loading} className="flex items-center gap-1.5 text-[12px] border border-border-input rounded-lg px-3 py-2 text-ink-5 hover:bg-hover-bg disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {en ? 'Re-run' : 'Rodar de novo'}
          </button>
        </div>

        <div className="px-8 py-6 max-w-3xl">
          {denied && <p className="text-[13px] text-[#B4462F]">{en ? 'Admin access required.' : 'Requer acesso de administrador.'}</p>}

          {health && (
            <>
              <div className={`mb-5 p-4 rounded-xl border ${health.ok ? 'border-success/40 bg-success-bg' : 'border-[#B4462F]/30 bg-[#FBEAE5]'}`}>
                <div className="text-[15px] font-semibold" style={{ color: health.ok ? '#1F9D6B' : '#B4462F' }}>
                  {health.ok ? (en ? 'All systems operational' : 'Todos os sistemas operacionais') : (en ? 'Failures detected' : 'Falhas detectadas')}
                </div>
                <div className="text-[12px] text-ink-5 mt-1">
                  {health.summary.ok} OK · {health.summary.degraded} {en ? 'degraded' : 'degradados'} · {health.summary.fail} {en ? 'failing' : 'falhando'}
                </div>
              </div>

              <div className="rounded-xl border border-border-card bg-surface divide-y divide-border-soft">
                {health.checks.map(c => (
                  <div key={c.key} className="flex items-start gap-3 px-4 py-3">
                    <div className="mt-0.5 shrink-0">{ICON[c.status]}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink-1">{c.label}</p>
                      <p className="text-[11.5px] text-ink-5 font-mono">{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

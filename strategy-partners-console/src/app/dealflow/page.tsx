'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { NavSidebar } from '@/components/NavSidebar'
import { WhatsNewBanner } from '@/components/WhatsNewBanner'
import { Sparkles, Upload, X, TrendingUp, Trophy } from 'lucide-react'
import { useLang } from '@/lib/lang'

interface Deal {
  id: string
  name: string
  clientName: string | null
  stage: string
  scoreCache: number | null
  sourceType: string | null
}

const STAGE_LABEL: Record<string, string> = { sourcing: 'Sourcing', screening: 'Screening', diligence: 'Diligence', loi: 'LOI', closing: 'Closing', closed: 'Fechado' }

function scoreColor(s: number | null): string {
  if (s == null) return 'bg-gray-100 text-gray-500'
  if (s >= 70) return 'bg-green-100 text-green-700'
  if (s >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

const DEMO: Deal[] = [
  { id: 'demo-1', name: 'Nimbus Analytics', clientName: 'B2B SaaS · observability', stage: 'diligence', scoreCache: 82, sourceType: 'ingest' },
  { id: 'demo-2', name: 'Cargolink', clientName: 'Logtech marketplace', stage: 'screening', scoreCache: 64, sourceType: 'sourcing' },
  { id: 'demo-3', name: 'Vitalis Health', clientName: 'Healthtech · B2B2C', stage: 'sourcing', scoreCache: null, sourceType: 'manual' },
]

export default function DealflowPage() {
  const { lang } = useLang()
  const [deals, setDeals] = useState<Deal[]>(DEMO)
  const [live, setLive] = useState(false)
  const [showIngest, setShowIngest] = useState(false)
  const [scoring, setScoring] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/deals')
      const data = await res.json()
      if (data.dbConfigured && Array.isArray(data.deals)) { setLive(true); setDeals(data.deals) }
    } catch { /* fallback demo */ }
  }
  useEffect(() => { load() }, [])

  async function scoreDeal(id: string) {
    setScoring(id)
    try { await fetch(`/api/deals/${id}/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); await load() }
    finally { setScoring(null) }
  }

  const L = lang === 'en'
    ? { title: 'Dealflow', sub: 'Targets ranked by diligence score', ingest: 'Ingest deck', leaderboard: 'Leaderboard', score: 'Score', rescore: 'Re-score', demo: 'Demo data — connect the database to persist real deals.' }
    : { title: 'Dealflow', sub: 'Targets ranqueados por score de diligência', ingest: 'Ingerir deck', leaderboard: 'Leaderboard', score: 'Pontuar', rescore: 'Repontuar', demo: 'Dados de demonstração — conecte o banco para persistir deals reais.' }

  const ranked = [...deals].sort((a, b) => (b.scoreCache ?? -1) - (a.scoreCache ?? -1))

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <WhatsNewBanner />
        <div className="border-b border-border-base bg-surface px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-ink-0 flex items-center gap-2"><Sparkles size={17} className="text-accent" /> {L.title}</h1>
            <p className="text-[12px] text-ink-5 mt-0.5">{L.sub}</p>
          </div>
          <button onClick={() => setShowIngest(true)} className="flex items-center gap-2 bg-accent text-white text-[12px] font-medium px-4 py-2 rounded-lg hover:opacity-90">
            <Upload size={14} strokeWidth={2.2} /> {L.ingest}
          </button>
        </div>

        <div className="px-8 py-6">
          {!live && <p className="text-[12px] text-ink-6 mb-4">{L.demo}</p>}
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-0 mb-3"><Trophy size={14} className="text-accent" /> {L.leaderboard}</div>
          <div className="space-y-2">
            {ranked.map((d, i) => (
              <div key={d.id} className="bg-surface border border-border-card rounded-[10px] px-5 py-3.5 flex items-center gap-4 hover:shadow-sm transition-all">
                <span className="text-[13px] font-mono text-ink-6 w-6 text-center">{i + 1}</span>
                <div className={`w-11 h-11 rounded-[8px] flex items-center justify-center shrink-0 font-semibold text-[14px] ${scoreColor(d.scoreCache)}`}>
                  {d.scoreCache ?? '—'}
                </div>
                <Link href={`/projetos/${d.id}`} className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-ink-0 truncate">{d.name}</p>
                  <p className="text-[12px] text-ink-5 truncate">{d.clientName ?? '—'}</p>
                </Link>
                <span className="text-[10.5px] font-medium px-2 py-1 rounded-full bg-accent-soft text-accent shrink-0">{STAGE_LABEL[d.stage] ?? d.stage}</span>
                {live && (
                  <button onClick={() => scoreDeal(d.id)} disabled={scoring === d.id}
                    className="flex items-center gap-1.5 text-[11.5px] text-accent border border-border-input rounded-lg px-3 py-1.5 hover:bg-accent-soft disabled:opacity-50 shrink-0">
                    <TrendingUp size={12} /> {scoring === d.id ? '…' : d.scoreCache == null ? L.score : L.rescore}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {showIngest && <IngestModal lang={lang} onClose={() => setShowIngest(false)} onDone={() => { setShowIngest(false); load() }} />}
    </div>
  )
}

function IngestModal({ lang, onClose, onDone }: { lang: 'pt' | 'en'; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const L = lang === 'en'
    ? { title: 'Ingest a deck', hint: 'Paste the deck / spreadsheet / memo text. The AI extracts ARR, MRR, growth, burn and team size and creates the deal.', name: 'Company name (optional — AI infers if empty)', body: 'Document text', go: 'Extract & create', cancel: 'Cancel' }
    : { title: 'Ingerir um deck', hint: 'Cole o texto do deck / planilha / memo. A IA extrai ARR, MRR, crescimento, burn e time e cria o deal.', name: 'Nome da empresa (opcional — IA infere se vazio)', body: 'Texto do documento', go: 'Extrair & criar', cancel: 'Cancelar' }

  async function submit() {
    if (!text.trim()) { setError(L.body); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/deals/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, name: name.trim() || undefined }) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Falha na ingestão.'); setBusy(false); return }
      onDone()
    } catch { setError('Falha de rede.'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-surface rounded-[12px] w-[560px] max-w-[94vw] p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[15px] font-semibold text-ink-0">{L.title}</h2>
          <button onClick={onClose} className="text-ink-6 hover:text-ink-0"><X size={16} /></button>
        </div>
        <p className="text-[12px] text-ink-5 mb-4">{L.hint}</p>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={L.name}
          className="w-full border border-border-card rounded-lg px-3 py-2 text-[13px] text-ink-0 bg-app-bg mb-3 outline-none focus:border-accent" />
        <textarea value={text} onChange={e => setText(e.target.value)} rows={9} placeholder={L.body}
          className="w-full border border-border-card rounded-lg px-3 py-2 text-[12.5px] text-ink-0 bg-app-bg mb-3 outline-none focus:border-accent resize-none" />
        {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-[12px] px-4 py-2 rounded-lg text-ink-5 hover:bg-app-bg">{L.cancel}</button>
          <button onClick={submit} disabled={busy} className="text-[12px] px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50">{busy ? '…' : L.go}</button>
        </div>
      </div>
    </div>
  )
}

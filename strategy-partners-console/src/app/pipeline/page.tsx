'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NavSidebar } from '@/components/NavSidebar'
import { KanbanSquare } from 'lucide-react'
import { useLang } from '@/lib/lang'

interface Deal { id: string; name: string; clientName: string | null; stage: string; scoreCache: number | null }

const STAGES = ['sourcing', 'screening', 'diligence', 'loi', 'closing', 'closed'] as const
const STAGE_LABEL: Record<string, { pt: string; en: string }> = {
  sourcing: { pt: 'Sourcing', en: 'Sourcing' }, screening: { pt: 'Triagem', en: 'Screening' },
  diligence: { pt: 'Diligence', en: 'Diligence' }, loi: { pt: 'LOI', en: 'LOI' },
  closing: { pt: 'Closing', en: 'Closing' }, closed: { pt: 'Fechado', en: 'Closed' },
}

function scoreColor(s: number | null): string {
  if (s == null) return 'bg-gray-100 text-gray-500'
  if (s >= 70) return 'bg-green-100 text-green-700'
  if (s >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

const DEMO: Deal[] = [
  { id: 'demo-1', name: 'Nimbus Analytics', clientName: 'B2B SaaS', stage: 'diligence', scoreCache: 82 },
  { id: 'demo-2', name: 'Cargolink', clientName: 'Logtech', stage: 'screening', scoreCache: 64 },
  { id: 'demo-3', name: 'Vitalis Health', clientName: 'Healthtech', stage: 'sourcing', scoreCache: null },
  { id: 'demo-4', name: 'Fintide', clientName: 'Fintech B2B', stage: 'loi', scoreCache: 76 },
]

export default function PipelinePage() {
  const { lang } = useLang()
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>(DEMO)
  const [live, setLive] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/deals')
      const data = await res.json()
      if (data.dbConfigured && Array.isArray(data.deals)) { setLive(true); setDeals(data.deals) }
    } catch { /* fallback */ }
  }
  useEffect(() => { load() }, [])

  async function move(id: string, stage: string) {
    setDeals(ds => ds.map(d => (d.id === id ? { ...d, stage } : d))) // optimistic
    if (!live) return
    await fetch(`/api/deals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) }).catch(() => load())
  }

  const label = (s: string) => (lang === 'en' ? STAGE_LABEL[s]?.en : STAGE_LABEL[s]?.pt) ?? s

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="border-b border-border-base bg-surface px-8 py-5">
          <h1 className="text-[17px] font-semibold text-ink-0 flex items-center gap-2"><KanbanSquare size={17} className="text-accent" /> Pipeline</h1>
          <p className="text-[12px] text-ink-5 mt-0.5">{lang === 'en' ? 'Drag deals across stages' : 'Arraste deals entre os estágios'}{!live && (lang === 'en' ? ' · demo' : ' · demonstração')}</p>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 px-8 py-6 h-full min-w-max">
            {STAGES.map(stage => {
              const col = deals.filter(d => d.stage === stage)
              return (
                <div key={stage}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (dragId) { move(dragId, stage); setDragId(null) } }}
                  className="w-[240px] shrink-0 flex flex-col bg-track/40 rounded-[10px] border border-border-div"
                >
                  <div className="px-3 py-2.5 flex items-center justify-between border-b border-border-div">
                    <span className="text-[12px] font-semibold text-ink-0">{label(stage)}</span>
                    <span className="text-[11px] text-ink-6 font-mono">{col.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {col.map(d => (
                      <div key={d.id} draggable
                        onDragStart={() => setDragId(d.id)}
                        onClick={() => router.push(`/projetos/${d.id}`)}
                        className="bg-surface border border-border-card rounded-[8px] p-3 cursor-grab active:cursor-grabbing hover:border-accent/40 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-[12.5px] font-medium text-ink-0 leading-tight">{d.name}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${scoreColor(d.scoreCache)}`}>{d.scoreCache ?? '—'}</span>
                        </div>
                        {d.clientName && <p className="text-[11px] text-ink-5 truncate">{d.clientName}</p>}
                      </div>
                    ))}
                    {col.length === 0 && <p className="text-[11px] text-ink-7 text-center py-4">—</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { NavSidebar } from '@/components/NavSidebar'
import { ArrowLeft, GitMerge, Target, CalendarClock, AlertTriangle } from 'lucide-react'
import { useLang } from '@/lib/lang'

interface Synergy { id: string; type: string; description: string; targetValue: string | null; owner: string | null; status: string }
interface Milestone { id: string; title: string; owner: string | null; dueDate: string | null; status: string; isDay100: number }
interface PmiRisk { id: string; category: string; description: string; severity: string; owner: string | null }

const SEV_STYLES: Record<string, string> = { baixa: 'bg-gray-100 text-gray-600', media: 'bg-yellow-100 text-yellow-700', alta: 'bg-orange-100 text-orange-700', critica: 'bg-red-100 text-red-700' }
const SYN_STATUS: Record<string, string> = { planejada: 'bg-gray-100 text-gray-500', em_captura: 'bg-yellow-100 text-yellow-700', capturada: 'bg-green-100 text-green-700', em_risco: 'bg-red-100 text-red-700' }
const MS_STATUS: Record<string, string> = { pendente: 'bg-gray-100 text-gray-500', em_andamento: 'bg-blue-100 text-blue-700', concluido: 'bg-green-100 text-green-700', atrasado: 'bg-red-100 text-red-700' }

export default function PmiPage() {
  const { id } = useParams<{ id: string }>()
  const { lang } = useLang()
  const [synergies, setSynergies] = useState<Synergy[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [risks, setRisks] = useState<PmiRisk[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${id}/pmi`)
      .then(r => r.json())
      .then(d => { setSynergies(d.synergies ?? []); setMilestones(d.milestones ?? []); setRisks(d.risks ?? []) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [id])

  const totalSynergy = useMemo(() => synergies.reduce((s, v) => s + (Number(v.targetValue) || 0), 0), [synergies])
  const day100 = milestones.filter(m => m.isDay100 === 1)

  const L = lang === 'en'
    ? { back: 'Project', title: 'Post-merger integration', syn: 'Synergies', synTotal: 'Total target', plan: '100-day plan', risks: 'Integration risks', empty: 'No data yet. Connect the database to populate the PMI workspace.', noOwner: 'no owner', owner: 'owner' }
    : { back: 'Projeto', title: 'Integração pós-fusão (PMI)', syn: 'Sinergias', synTotal: 'Meta total', plan: 'Plano de 100 dias', risks: 'Riscos de integração', empty: 'Sem dados ainda. Conecte o banco para preencher o workspace de PMI.', noOwner: 'sem dono', owner: 'dono' }

  const money = (n: number) => n.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 0 })

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5">
          <Link href={`/projetos/${id}`} className="flex items-center gap-1.5 text-[12px] text-ink-5 hover:text-ink-0 mb-2 w-fit">
            <ArrowLeft size={13} /> {L.back}
          </Link>
          <h1 className="text-[17px] font-semibold text-ink-0 flex items-center gap-2">
            <GitMerge size={18} className="text-accent" /> {L.title}
          </h1>
        </div>

        <div className="px-8 py-6 space-y-8 max-w-4xl">
          {loaded && synergies.length === 0 && milestones.length === 0 && risks.length === 0 && (
            <p className="text-[12px] text-ink-6">{L.empty}</p>
          )}

          {/* Synergies */}
          {synergies.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold text-ink-0 flex items-center gap-1.5"><Target size={14} className="text-accent" /> {L.syn}</h2>
                <span className="text-[11.5px] text-ink-5">{L.synTotal}: <b className="text-ink-0">{money(totalSynergy)}</b></span>
              </div>
              <div className="space-y-2">
                {synergies.map(s => (
                  <div key={s.id} className="bg-surface border border-border-card rounded-[10px] px-4 py-3 flex items-center gap-3">
                    <span className="text-[10px] font-medium px-[7px] py-[2px] rounded-full bg-accent-soft text-accent shrink-0">{s.type}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-ink-0">{s.description}</p>
                      <p className="text-[11px] text-ink-6 mt-0.5">{s.owner ? `${L.owner}: ${s.owner}` : L.noOwner}</p>
                    </div>
                    <span className="text-[12px] text-ink-0 shrink-0">{s.targetValue ? money(Number(s.targetValue)) : '—'}</span>
                    <span className={`text-[10px] font-medium px-[7px] py-[2px] rounded-full shrink-0 ${SYN_STATUS[s.status] ?? ''}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 100-day plan */}
          {milestones.length > 0 && (
            <section>
              <h2 className="text-[13px] font-semibold text-ink-0 mb-3 flex items-center gap-1.5"><CalendarClock size={14} className="text-accent" /> {L.plan} {day100.length > 0 && <span className="text-[11px] text-ink-6">({day100.length})</span>}</h2>
              <div className="space-y-1.5">
                {milestones.map(m => (
                  <div key={m.id} className={`bg-surface border rounded-[8px] px-4 py-2.5 flex items-center gap-3 ${m.isDay100 === 1 ? 'border-accent/40' : 'border-border-card'}`}>
                    <span className={`text-[10px] font-medium px-[7px] py-[2px] rounded-full shrink-0 ${MS_STATUS[m.status] ?? ''}`}>{m.status}</span>
                    <span className="text-[12.5px] text-ink-0 flex-1 min-w-0">{m.title}</span>
                    {m.owner && <span className="text-[11px] text-ink-6 shrink-0">{m.owner}</span>}
                    {m.dueDate && <span className="text-[11px] text-ink-6 shrink-0">{new Date(m.dueDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR')}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Risks */}
          {risks.length > 0 && (
            <section>
              <h2 className="text-[13px] font-semibold text-ink-0 mb-3 flex items-center gap-1.5"><AlertTriangle size={14} className="text-orange-500" /> {L.risks}</h2>
              <div className="space-y-2">
                {risks.map(r => (
                  <div key={r.id} className="bg-surface border border-border-card rounded-[10px] px-4 py-3 flex items-start gap-3">
                    <span className={`text-[10px] font-medium px-[7px] py-[2px] rounded-full shrink-0 ${SEV_STYLES[r.severity] ?? ''}`}>{r.severity}</span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-ink-0">{r.description}</p>
                      <p className="text-[11px] text-ink-6 mt-0.5">{r.category}{r.owner ? ` · ${r.owner}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

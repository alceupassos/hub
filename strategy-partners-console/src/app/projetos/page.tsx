'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { NavSidebar } from '@/components/NavSidebar'
import { Plus, Folder, Clock, Users, X } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { getT } from '@/lib/i18n'
import { StatTiles } from '@/components/charts/StatTiles'
import type { Tone } from '@/components/charts/chartUtils'

type ProjType = 'pre_deal' | 'pmi'

interface ProjectRow {
  id: string
  name: string
  description: string
  type?: ProjType
  agents?: string[]
  status?: string
  updatedAt?: string
}

// Fallback de demonstração — usado enquanto o banco (Fase 2) não está provisionado.
const DEMO_PROJECTS: ProjectRow[] = [
  { id: 'latam-q3', name: 'Expansão LATAM — Q3', description: 'Análise de mercado e entrada no México e Colômbia', agents: ['NOVAE', 'TYCEN', 'Jurista'], status: 'ativo', updatedAt: 'Hoje, 14h32' },
  { id: 'ma-logistica', name: 'M&A · Setor Logístico', description: 'Due diligence e valuation de alvo buy-side', type: 'pre_deal', agents: ['MERKO', 'TYCEN', 'Jurista'], status: 'ativo', updatedAt: 'Ontem, 09h15' },
  { id: 'orcamento-2026', name: 'Orçamento 2026', description: 'Projeções financeiras e cenários macro', agents: ['ASTEN', 'Contábil', 'NOVAE'], status: 'revisão', updatedAt: '23 jun' },
  { id: 'posicionamento', name: 'Posicionamento Competitivo', description: 'Análise de concorrência e diferenciadores', agents: ['Pesquisador', 'Redator', 'NOVAE'], status: 'concluído', updatedAt: '18 jun' },
]

const STATUS_STYLES: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  revisão: 'bg-yellow-100 text-yellow-700',
  concluído: 'bg-gray-100 text-gray-500',
}
const TYPE_STYLES: Record<ProjType, string> = {
  pre_deal: 'bg-blue-100 text-blue-700',
  pmi: 'bg-purple-100 text-purple-700',
}

export default function ProjetosPage() {
  const { lang } = useLang()
  const t = getT(lang)
  const [projects, setProjects] = useState<ProjectRow[]>(DEMO_PROJECTS)
  const [live, setLive] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const typeLabel = (ty?: ProjType) => (ty === 'pmi' ? 'PMI' : ty === 'pre_deal' ? (lang === 'en' ? 'Pre-deal' : 'Pré-deal') : null)

  async function load() {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      if (data.dbConfigured && Array.isArray(data.projects) && data.projects.length > 0) {
        setLive(true)
        setProjects(
          data.projects.map((p: { id: string; name: string; type: ProjType; clientName: string | null }) => ({
            id: p.id,
            name: p.name,
            description: p.clientName ?? (p.type === 'pmi' ? 'Integração pós-deal (PMI)' : 'Due diligence pré-deal'),
            type: p.type,
          })),
        )
      }
    } catch {
      /* mantém o fallback de demonstração */
    }
  }
  useEffect(() => { load() }, [])

  const activeCount = projects.filter(p => p.status === 'ativo').length
  const preDealCount = projects.filter(p => p.type === 'pre_deal').length
  const pmiCount = projects.filter(p => p.type === 'pmi').length
  const PL = lang === 'en'
    ? { total: 'Projects', active: 'Active', preDeal: 'Pre-deal', pmi: 'PMI' }
    : { total: 'Projetos', active: 'Ativos', preDeal: 'Pré-deal', pmi: 'PMI' }
  const portfolioTiles = [
    { label: PL.total, value: projects.length, tone: 'accent' as Tone },
    { label: PL.active, value: activeCount, tone: activeCount > 0 ? ('success' as Tone) : ('neutral' as Tone) },
    { label: PL.preDeal, value: preDealCount, tone: 'info' as Tone },
    { label: PL.pmi, value: pmiCount, tone: 'neutral' as Tone },
  ]

  const statusLabel = (s?: string) => {
    if (s === 'ativo') return t.statusActive
    if (s === 'revisão') return t.statusReview
    if (s === 'concluído') return t.statusDone
    return s
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-ink-0">{t.pageProjects}</h1>
            <p className="text-[12px] text-ink-5 mt-0.5">{t.projectsCount(projects.length, activeCount)}</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-accent text-white text-[12px] font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} strokeWidth={2.2} />
            {t.newProject}
          </button>
        </div>

        <div className="px-8 py-6 space-y-3">
          <div className="mb-3"><StatTiles tiles={portfolioTiles} /></div>
          {projects.map(proj => (
            <Link
              key={proj.id}
              href={`/projetos/${proj.id}`}
              className="bg-surface border border-border-card rounded-[10px] px-5 py-4 flex items-center gap-4 hover:border-border-hover hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-[8px] bg-accent-soft flex items-center justify-center shrink-0">
                <Folder size={18} strokeWidth={1.5} className="text-accent" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13.5px] font-medium text-ink-0">{proj.name}</p>
                  {proj.type && (
                    <span className={`text-[10px] font-medium px-[7px] py-[2px] rounded-full ${TYPE_STYLES[proj.type]}`}>
                      {typeLabel(proj.type)}
                    </span>
                  )}
                  {proj.status && (
                    <span className={`text-[10px] font-medium px-[7px] py-[2px] rounded-full ${STATUS_STYLES[proj.status] ?? ''}`}>
                      {statusLabel(proj.status)}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-ink-5">{proj.description}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-ink-6">
                {proj.agents && (
                  <div className="flex items-center gap-1.5 text-[11.5px]">
                    <Users size={12} strokeWidth={1.6} />
                    {proj.agents.join(', ')}
                  </div>
                )}
                {proj.updatedAt && (
                  <div className="flex items-center gap-1.5 text-[11.5px]">
                    <Clock size={12} strokeWidth={1.6} />
                    {proj.updatedAt}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>

      {showNew && <NewProjectModal lang={lang} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }} />}
    </div>
  )
}

function NewProjectModal({ lang, onClose, onCreated }: { lang: 'pt' | 'en'; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<ProjType>('pre_deal')
  const [clientName, setClientName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const L = lang === 'en'
    ? { title: 'New project', name: 'Project name', client: 'Client (optional)', type: 'Type', preDeal: 'Pre-deal (due diligence)', pmi: 'PMI (post-deal integration)', create: 'Create', cancel: 'Cancel' }
    : { title: 'Novo projeto', name: 'Nome do projeto', client: 'Cliente (opcional)', type: 'Tipo', preDeal: 'Pré-deal (due diligence)', pmi: 'PMI (integração pós-deal)', create: 'Criar', cancel: 'Cancelar' }

  async function submit() {
    if (!name.trim()) { setError(L.name); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type, clientName: clientName.trim() || undefined }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Falha ao criar projeto.')
        setSaving(false)
        return
      }
      onCreated()
    } catch {
      setError('Falha de rede.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-surface rounded-[12px] w-[420px] max-w-[92vw] p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-ink-0">{L.title}</h2>
          <button onClick={onClose} className="text-ink-6 hover:text-ink-0"><X size={16} /></button>
        </div>

        <label className="block text-[12px] text-ink-5 mb-1">{L.name}</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus
          className="w-full border border-border-card rounded-lg px-3 py-2 text-[13px] text-ink-0 bg-app-bg mb-3 outline-none focus:border-accent" />

        <label className="block text-[12px] text-ink-5 mb-1">{L.type}</label>
        <div className="flex gap-2 mb-3">
          {(['pre_deal', 'pmi'] as ProjType[]).map(ty => (
            <button key={ty} onClick={() => setType(ty)}
              className={`flex-1 text-[12px] px-3 py-2 rounded-lg border transition-colors ${type === ty ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-border-card text-ink-5'}`}>
              {ty === 'pre_deal' ? L.preDeal : L.pmi}
            </button>
          ))}
        </div>

        <label className="block text-[12px] text-ink-5 mb-1">{L.client}</label>
        <input value={clientName} onChange={e => setClientName(e.target.value)}
          className="w-full border border-border-card rounded-lg px-3 py-2 text-[13px] text-ink-0 bg-app-bg mb-4 outline-none focus:border-accent" />

        {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-[12px] px-4 py-2 rounded-lg text-ink-5 hover:bg-app-bg">{L.cancel}</button>
          <button onClick={submit} disabled={saving}
            className="text-[12px] px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? '…' : L.create}
          </button>
        </div>
      </div>
    </div>
  )
}

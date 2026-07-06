'use client'
import Link from 'next/link'
import { NavSidebar } from '@/components/NavSidebar'
import { Plus, Folder, Clock, Users } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { getT } from '@/lib/i18n'

const PROJECTS = [
  {
    id: 'latam-q3',
    name: 'Expansão LATAM — Q3',
    description: 'Análise de mercado e entrada no México e Colômbia',
    agents: ['NOVAE', 'TYCEN', 'Jurista'],
    status: 'ativo' as const,
    updatedAt: 'Hoje, 14h32',
  },
  {
    id: 'ma-logistica',
    name: 'M&A · Setor Logístico',
    description: 'Due diligence e valuation de alvo buy-side',
    agents: ['MERKO', 'TYCEN', 'Jurista'],
    status: 'ativo' as const,
    updatedAt: 'Ontem, 09h15',
  },
  {
    id: 'orcamento-2026',
    name: 'Orçamento 2026',
    description: 'Projeções financeiras e cenários macro',
    agents: ['ASTEN', 'Contábil', 'NOVAE'],
    status: 'revisão' as const,
    updatedAt: '23 jun',
  },
  {
    id: 'posicionamento',
    name: 'Posicionamento Competitivo',
    description: 'Análise de concorrência e diferenciadores',
    agents: ['Pesquisador', 'Redator', 'NOVAE'],
    status: 'concluído' as const,
    updatedAt: '18 jun',
  },
  {
    id: 'plano-sucessao',
    name: 'Plano de Sucessão',
    description: 'Governança e continuidade de liderança',
    agents: ['Jurista', 'NOVAE'],
    status: 'concluído' as const,
    updatedAt: '10 jun',
  },
]

const STATUS_STYLES: Record<string, string> = {
  ativo:    'bg-green-100 text-green-700',
  revisão:  'bg-yellow-100 text-yellow-700',
  concluído:'bg-gray-100 text-gray-500',
}

export default function ProjetosPage() {
  const { lang } = useLang()
  const t = getT(lang)

  const activeCount = PROJECTS.filter(p => p.status === 'ativo').length

  const statusLabel = (s: string) => {
    if (s === 'ativo')     return t.statusActive
    if (s === 'revisão')   return t.statusReview
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
            <p className="text-[12px] text-ink-5 mt-0.5">{t.projectsCount(PROJECTS.length, activeCount)}</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 bg-accent text-white text-[12px] font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} strokeWidth={2.2} />
            {t.newProject}
          </Link>
        </div>

        <div className="px-8 py-6 space-y-3">
          {PROJECTS.map(proj => (
            <div
              key={proj.id}
              className="bg-surface border border-border-card rounded-[10px] px-5 py-4 flex items-center gap-4 hover:border-border-hover hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-[8px] bg-accent-soft flex items-center justify-center shrink-0">
                <Folder size={18} strokeWidth={1.5} className="text-accent" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13.5px] font-medium text-ink-0">{proj.name}</p>
                  <span className={`text-[10px] font-medium px-[7px] py-[2px] rounded-full ${STATUS_STYLES[proj.status]}`}>
                    {statusLabel(proj.status)}
                  </span>
                </div>
                <p className="text-[12px] text-ink-5">{proj.description}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-ink-6">
                <div className="flex items-center gap-1.5 text-[11.5px]">
                  <Users size={12} strokeWidth={1.6} />
                  {proj.agents.join(', ')}
                </div>
                <div className="flex items-center gap-1.5 text-[11.5px]">
                  <Clock size={12} strokeWidth={1.6} />
                  {proj.updatedAt}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

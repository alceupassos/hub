'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { NavSidebar } from '@/components/NavSidebar'
import { ArrowLeft, ClipboardCheck, GitMerge, Folder } from 'lucide-react'
import { useLang } from '@/lib/lang'

interface Project {
  id: string
  name: string
  type: 'pre_deal' | 'pmi'
  clientName: string | null
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { lang } = useLang()
  const [project, setProject] = useState<Project | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => setProject(d?.project ?? null))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [id])

  const L = lang === 'en'
    ? { back: 'Projects', dd: 'Due diligence', ddSub: 'Checklist, red flags and valuation triangulation', pmi: 'Post-merger integration', pmiSub: 'Synergies, 100-day plan and integration risks', demo: 'Demo project — connect the database to persist real data.' }
    : { back: 'Projetos', dd: 'Due diligence', ddSub: 'Checklist, red flags e triangulação de valuation', pmi: 'Integração pós-fusão (PMI)', pmiSub: 'Sinergias, plano de 100 dias e riscos de integração', demo: 'Projeto de demonstração — conecte o banco para persistir dados reais.' }

  const name = project?.name ?? decodeURIComponent(id)
  const type = project?.type
  const modules = [
    { key: 'due-diligence', href: `/projetos/${id}/due-diligence`, icon: ClipboardCheck, title: L.dd, sub: L.ddSub, on: type !== 'pmi' },
    { key: 'pmi', href: `/projetos/${id}/pmi`, icon: GitMerge, title: L.pmi, sub: L.pmiSub, on: type !== 'pre_deal' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5">
          <Link href="/projetos" className="flex items-center gap-1.5 text-[12px] text-ink-5 hover:text-ink-0 mb-2 w-fit">
            <ArrowLeft size={13} /> {L.back}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-accent-soft flex items-center justify-center shrink-0">
              <Folder size={18} strokeWidth={1.5} className="text-accent" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold text-ink-0">{name}</h1>
              <p className="text-[12px] text-ink-5 mt-0.5">
                {project?.clientName ? `${project.clientName} · ` : ''}
                {type === 'pmi' ? 'PMI' : type === 'pre_deal' ? (lang === 'en' ? 'Pre-deal' : 'Pré-deal') : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {loaded && !project && (
            <p className="text-[12px] text-ink-6 mb-4">{L.demo}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            {modules.map(m => (
              <Link key={m.key} href={m.href}
                className={`bg-surface border rounded-[12px] p-5 transition-all hover:shadow-sm ${m.on ? 'border-accent/40' : 'border-border-card'}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <m.icon size={18} className="text-accent" strokeWidth={1.6} />
                  <span className="text-[14px] font-medium text-ink-0">{m.title}</span>
                </div>
                <p className="text-[12px] text-ink-5">{m.sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

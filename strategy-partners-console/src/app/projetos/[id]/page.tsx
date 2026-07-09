'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { NavSidebar } from '@/components/NavSidebar'
import { ArrowLeft, ClipboardCheck, GitMerge, Folder, Calculator } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { StatTiles } from '@/components/charts/StatTiles'
import { Donut } from '@/components/charts/Donut'
import { FootballField, type FootballBand } from '@/components/charts/FootballField'
import { fmtCompact, type Tone } from '@/components/charts/chartUtils'

interface Project {
  id: string
  name: string
  type: 'pre_deal' | 'pmi'
  clientName: string | null
}
interface Metrics { arr: string | null; mrr: string | null; growthRate: string | null; burn: string | null; teamSize: number | null; churn: string | null }
interface Score { score: number; recommendation: string }
interface Valuation { method: string; low: string | null; base: string | null; high: string | null }

const RECO_TONE: Record<string, Tone> = { go: 'success', no_go: 'danger', watch: 'warn' }
const num = (v: string | number | null | undefined): number | null => {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { lang } = useLang()
  const [project, setProject] = useState<Project | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [score, setScore] = useState<Score | null>(null)
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        setProject(d?.project ?? null)
        setMetrics(d?.metrics ?? null)
        setScore(d?.score ?? null)
        setValuations(Array.isArray(d?.valuations) ? d.valuations : [])
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [id])

  const L = lang === 'en'
    ? { back: 'Projects', dd: 'Due diligence', ddSub: 'Checklist, red flags and valuation triangulation', pmi: 'Post-merger integration', pmiSub: 'Synergies, 100-day plan and integration risks', model: 'Model deal', modelSub: 'Valuation, scenarios and ROI modeling', demo: 'Demo project — connect the database to persist real data.',
        dash: 'Deal dashboard', dashCaption: 'What: the deal at a glance — ARR, growth, diligence score and recommendation, plus the valuation football field when methods exist. For: a one-screen read on whether to advance the target.',
        arr: 'ARR', growth: 'Growth', scoreK: 'Score', reco: 'Recommendation', scoreGauge: 'Diligence score', vf: 'Valuation football field', noData: 'No deal data yet.', achieved: 'Score', remaining: 'To 100' }
    : { back: 'Projetos', dd: 'Due diligence', ddSub: 'Checklist, red flags e triangulação de valuation', pmi: 'Integração pós-fusão (PMI)', pmiSub: 'Sinergias, plano de 100 dias e riscos de integração', model: 'Modelar deal', modelSub: 'Valuation, cenários e modelagem de ROI', demo: 'Projeto de demonstração — conecte o banco para persistir dados reais.',
        dash: 'Dashboard do deal', dashCaption: 'O que é: o deal num relance — ARR, crescimento, score de diligência e recomendação, além do football field de valuation quando há métodos. Para que serve: uma leitura em uma tela sobre avançar ou não com o alvo.',
        arr: 'ARR', growth: 'Crescimento', scoreK: 'Score', reco: 'Recomendação', scoreGauge: 'Score de diligência', vf: 'Football field de valuation', noData: 'Sem dados do deal ainda.', achieved: 'Score', remaining: 'Até 100' }

  const recoLabel = (r?: string | null) => {
    if (!r) return '—'
    const map: Record<string, [string, string]> = { go: ['Go', 'Go'], no_go: ['No-go', 'No-go'], watch: ['Watch', 'Observar'] }
    return (map[r] ?? [r, r])[lang === 'en' ? 0 : 1]
  }

  const arrVal = num(metrics?.arr)
  const growthVal = num(metrics?.growthRate)
  const scoreVal = score?.score ?? null
  const hasDashData = metrics != null || score != null || valuations.length > 0
  const dashTiles = [
    { label: L.arr, value: arrVal != null ? fmtCompact(arrVal) : '—', tone: 'info' as Tone },
    { label: L.growth, value: growthVal != null ? `${growthVal.toFixed(0)}%` : '—', tone: growthVal != null && growthVal >= 0 ? ('success' as Tone) : ('neutral' as Tone) },
    { label: L.scoreK, value: scoreVal != null ? String(scoreVal) : '—', tone: 'accent' as Tone },
    { label: L.reco, value: recoLabel(score?.recommendation), tone: score?.recommendation ? RECO_TONE[score.recommendation] : ('neutral' as Tone) },
  ]
  const bands: FootballBand[] = valuations
    .map(v => ({ method: v.method, low: num(v.low), base: num(v.base), high: num(v.high) }))
    .filter((b): b is FootballBand => b.low != null && b.base != null && b.high != null)

  const name = project?.name ?? decodeURIComponent(id)
  const type = project?.type
  const modules = [
    { key: 'due-diligence', href: `/projetos/${id}/due-diligence`, icon: ClipboardCheck, title: L.dd, sub: L.ddSub, on: type !== 'pmi' },
    { key: 'pmi', href: `/projetos/${id}/pmi`, icon: GitMerge, title: L.pmi, sub: L.pmiSub, on: type !== 'pre_deal' },
    { key: 'modelagem', href: `/projetos/${id}/modelagem`, icon: Calculator, title: L.model, sub: L.modelSub, on: true },
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

          {loaded && hasDashData && (
            <div className="bg-surface border border-border-card rounded-[12px] p-5 mb-6 max-w-3xl">
              <p className="text-[12px] font-semibold text-ink-0 mb-1">{L.dash}</p>
              <p className="text-[11px] text-ink-6 mb-4 leading-relaxed">{L.dashCaption}</p>
              <div className="mb-5"><StatTiles tiles={dashTiles} /></div>
              <div className="flex flex-wrap items-start gap-8">
                {scoreVal != null && (
                  <div>
                    <p className="text-[11px] text-ink-5 mb-2">{L.scoreGauge}</p>
                    <Donut
                      segments={[
                        { label: L.achieved, value: scoreVal, tone: score?.recommendation ? RECO_TONE[score.recommendation] : 'accent' },
                        { label: L.remaining, value: Math.max(0, 100 - scoreVal), tone: 'neutral' },
                      ]}
                      centerValue={scoreVal}
                      centerLabel={L.scoreK}
                    />
                  </div>
                )}
                {bands.length > 0 && (
                  <div className="flex-1 min-w-[280px]">
                    <p className="text-[11px] text-ink-5 mb-2">{L.vf}</p>
                    <FootballField bands={bands} />
                  </div>
                )}
              </div>
            </div>
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

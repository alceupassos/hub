'use client'
import { useEffect, useMemo, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { Radar, Info, AlertTriangle } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { StatTiles } from '@/components/charts/StatTiles'
import { Donut } from '@/components/charts/Donut'
import { ScatterBubble } from '@/components/charts/ScatterBubble'
import type { Tone } from '@/components/charts/chartUtils'

interface Deal {
  id: string; name: string; clientName: string | null; stage: string
  scoreCache: number | null; arr?: number | null; recommendation?: string | null
}

const DEMO: Deal[] = [
  { id: '1', name: 'Projeto Atlas', clientName: 'LogTech LATAM', stage: 'diligence', scoreCache: 82, arr: 48, recommendation: 'go' },
  { id: '2', name: 'Projeto Bdevon', clientName: 'HealthCo', stage: 'screening', scoreCache: 61, arr: 22, recommendation: 'watch' },
  { id: '3', name: 'Projeto Cortez', clientName: 'FinScale', stage: 'loi', scoreCache: 74, arr: 90, recommendation: 'go' },
  { id: '4', name: 'Projeto Duna', clientName: 'RetailX', stage: 'sourcing', scoreCache: 39, arr: 12, recommendation: 'no_go' },
  { id: '5', name: 'Projeto Elba', clientName: 'AgroData', stage: 'diligence', scoreCache: 55, arr: 30, recommendation: 'watch' },
]

const ADVANCED = ['diligence', 'loi', 'closing']
const RECO_TONE: Record<string, Tone> = { go: 'success', no_go: 'danger', watch: 'warn' }

export default function TorrePage() {
  const { lang } = useLang()
  const en = lang === 'en'
  const [deals, setDeals] = useState<Deal[]>(DEMO)
  const [live, setLive] = useState(false)

  useEffect(() => {
    fetch('/api/deals').then(r => r.json()).then(d => {
      if (d.dbConfigured && Array.isArray(d.deals)) { setDeals(d.deals); setLive(true) }
    }).catch(() => {})
  }, [])

  const stats = useMemo(() => {
    const withScore = deals.filter(d => d.scoreCache != null)
    const totalArr = deals.reduce((s, d) => s + (d.arr ?? 0), 0)
    const go = deals.filter(d => d.recommendation === 'go').length
    const avg = withScore.length ? Math.round(withScore.reduce((s, d) => s + (d.scoreCache ?? 0), 0) / withScore.length) : 0
    return { count: deals.length, totalArr, go, avg }
  }, [deals])

  // Alertas: score baixo em estágio avançado; sem score em estágio avançado; no_go ainda ativo.
  const alerts = useMemo(() => {
    const out: { deal: string; msg: string; tone: Tone }[] = []
    for (const d of deals) {
      const adv = ADVANCED.includes(d.stage)
      if (adv && (d.scoreCache ?? 0) < 50 && d.scoreCache != null)
        out.push({ deal: d.name, tone: 'danger', msg: en ? `Low score (${d.scoreCache}) in advanced stage (${d.stage}) — reassess or drop.` : `Score baixo (${d.scoreCache}) em estágio avançado (${d.stage}) — reavaliar ou descartar.` })
      if (adv && d.scoreCache == null)
        out.push({ deal: d.name, tone: 'warn', msg: en ? `In ${d.stage} without a score — run scoring.` : `Em ${d.stage} sem score — rodar pontuação.` })
      if (d.recommendation === 'no_go' && d.stage !== 'closed')
        out.push({ deal: d.name, tone: 'warn', msg: en ? 'Recommendation is no-go but still active in the pipeline.' : 'Recomendação é no-go mas segue ativo no pipeline.' })
    }
    return out
  }, [deals, en])

  const recoSplit = useMemo(() => {
    const g = deals.filter(d => d.recommendation === 'go').length
    const w = deals.filter(d => d.recommendation === 'watch').length
    const n = deals.filter(d => d.recommendation === 'no_go').length
    const u = deals.length - g - w - n
    return [
      { label: 'Go', value: g, tone: 'success' as Tone },
      { label: en ? 'Watch' : 'Acompanhar', value: w, tone: 'warn' as Tone },
      { label: 'No-go', value: n, tone: 'danger' as Tone },
      ...(u > 0 ? [{ label: en ? 'Unscored' : 'Sem score', value: u, tone: 'neutral' as Tone }] : []),
    ]
  }, [deals, en])

  const points = useMemo(() => deals.filter(d => d.scoreCache != null).map(d => ({
    x: d.scoreCache!, y: d.arr ?? 0, r: Math.max(6, Math.sqrt(d.arr ?? 1) * 3),
    label: d.name, tone: RECO_TONE[d.recommendation ?? ''] ?? 'neutral' as Tone,
  })), [deals])

  const L = en ? {
    title: 'Command Tower', sub: 'Portfolio at a glance: risk distribution, alerts and next actions across all deals.',
    noteWhat: 'Command Tower — the single pane of glass over the portfolio.',
    noteUse: 'Aggregates every deal: KPIs, the recommendation split, a score × value map and automatic alerts (low score in advanced stage, unscored deals, no-go still active). Use to run the Monday pipeline review in one screen.',
    kCount: 'Deals', kArr: 'Total ARR', kGo: 'Go', kAvg: 'Avg score',
    riskTitle: 'Recommendation split', mapTitle: 'Score × value (bubble = ARR)', alertsTitle: 'Alerts & next actions',
    noAlerts: 'No alerts — portfolio healthy.', demo: 'Illustrative data', liveTag: 'Live data',
    scoreAxis: 'Score', valueAxis: 'ARR',
  } : {
    title: 'Torre de Comando', sub: 'Portfólio num relance: distribuição de risco, alertas e próximas ações de todos os deals.',
    noteWhat: 'Torre de Comando — o painel único sobre o portfólio.',
    noteUse: 'Agrega todos os deals: KPIs, a divisão por recomendação, um mapa score × valor e alertas automáticos (score baixo em estágio avançado, deals sem score, no-go ainda ativo). Use para conduzir a revisão de pipeline de segunda-feira numa só tela.',
    kCount: 'Deals', kArr: 'ARR total', kGo: 'Go', kAvg: 'Score médio',
    riskTitle: 'Divisão por recomendação', mapTitle: 'Score × valor (bolha = ARR)', alertsTitle: 'Alertas & próximas ações',
    noAlerts: 'Sem alertas — portfólio saudável.', demo: 'Dados ilustrativos', liveTag: 'Dados reais',
    scoreAxis: 'Score', valueAxis: 'ARR',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0"><Radar size={18} className="text-white" /></div>
            <div className="flex-1">
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">{L.title}</h1>
              <p className="text-[12.5px] text-ink-5">{L.sub}</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-full" style={{ background: live ? 'var(--color-success-bg)' : 'var(--color-track)', color: live ? '#1F9D6B' : 'var(--color-ink-6)' }}>
              {live ? L.liveTag : L.demo}
            </span>
          </div>

          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
            <Info size={15} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-ink-3 leading-relaxed"><strong>{L.noteWhat}</strong> {L.noteUse}</p>
          </div>

          <div className="mb-5">
            <StatTiles tiles={[
              { label: L.kCount, value: stats.count },
              { label: L.kArr, value: `R$ ${stats.totalArr.toLocaleString('pt-BR')}` },
              { label: L.kGo, value: stats.go, tone: 'success' },
              { label: L.kAvg, value: stats.avg, tone: stats.avg >= 60 ? 'success' : stats.avg >= 45 ? 'warn' : 'danger' },
            ]} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <div className="p-5 rounded-xl border border-border-card bg-surface">
              <h3 className="text-[13px] font-semibold text-ink-1 mb-3">{L.riskTitle}</h3>
              <Donut segments={recoSplit} centerLabel={L.kCount} centerValue={String(stats.count)} />
            </div>
            <div className="p-5 rounded-xl border border-border-card bg-surface">
              <h3 className="text-[13px] font-semibold text-ink-1 mb-3">{L.mapTitle}</h3>
              <ScatterBubble points={points} xLabel={L.scoreAxis} yLabel={L.valueAxis} fmtX={(n) => String(Math.round(n))} fmtY={(n) => `R$${Math.round(n)}`} />
            </div>
          </div>

          <div className="p-5 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[13px] font-semibold text-ink-1 mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-[#C77800]" /> {L.alertsTitle}</h3>
            {alerts.length === 0 ? (
              <p className="text-[12.5px] text-success">{L.noAlerts}</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12.5px]">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: a.tone === 'danger' ? '#B4462F' : '#C77800' }} />
                    <span><strong className="text-ink-1">{a.deal}:</strong> <span className="text-ink-4">{a.msg}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

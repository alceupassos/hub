'use client'
import { useMemo, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { WhatsNewBanner } from '@/components/WhatsNewBanner'
import { AGENTS } from '@/lib/agents'
import { getSubagentsFor } from '@/lib/agentTiers'
import { PRINCIPAL_META, SHOWCASE_CASES, ACTIVITY_BY_PRINCIPAL } from '@/lib/fleetShowcase'
import { DependencyGraph } from '@/components/charts/DependencyGraph'
import { useLang } from '@/lib/lang'
import { ArrowRight } from 'lucide-react'

// CAIO primeiro (orquestrador), depois os 4 especialistas.
const ORDER = ['caio', 'merko', 'asten', 'novae', 'tycen']
const RING = ['merko', 'asten', 'novae', 'tycen']

export default function FrotaPage() {
  const { lang } = useLang()
  const en = lang === 'en'
  const [focus, setFocus] = useState<string | null>(null)
  const totalSub = AGENTS.filter(a => a.tier === 'subagente').length
  const meta = (id: string) => PRINCIPAL_META[id]
  const subsOf = (id: string) => getSubagentsFor(id)

  // constelação: CAIO centro, 4 ao redor
  const VB = { w: 440, h: 330 }, cx = 220, cy = 158, R = 116
  const ring = useMemo(() => {
    const ang: Record<string, number> = { merko: -138, asten: -42, novae: 42, tycen: 138 }
    return RING.map(id => {
      const a = (ang[id] * Math.PI) / 180
      return { id, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }
    })
  }, [])
  const nodePos: Record<string, { x: number; y: number }> = { caio: { x: cx, y: cy }, ...Object.fromEntries(ring.map(r => [r.id, { x: r.x, y: r.y }])) }
  const maxActions = Math.max(...ACTIVITY_BY_PRINCIPAL.map(a => a.actions))

  const L = en
    ? { manifestoLead: '5 lead specialists. 22 subagents. One decision.',
        manifesto: 'CAIO orchestrates; the four partners go deep; the subagents do the heavy lifting. You get one integrated recommendation — never four stapled opinions.',
        leads: 'The five lead agents', supported: 'supported by', actions: 'actions', mandates: 'mandates',
        subTitle: 'Subagents', subLead: `${totalSub} specialists executing the heavy work under each lead agent`,
        activity: 'Actions by lead agent', activitySub: 'Accumulated across mandates',
        casesT: 'Example cases', casesSub: 'Illustrative past mandates — how the team acts end to end', lead: 'lead', outcome: 'Outcome',
        graphT: 'How the fleet is wired',
        graphSub: 'The fleet is a constellation: CAIO orchestrates at the center, the four partners (MERKO, ASTEN, NOVAE, TYCEN) go deep on each discipline, and the 22 subagents orbit the lead they serve, doing the heavy lifting. Each node lights up when the agent goes to work.' }
    : { manifestoLead: '5 especialistas principais. 22 subagentes. Uma decisão.',
        manifesto: 'CAIO orquestra; os quatro partners aprofundam; os subagentes fazem o trabalho pesado. Você recebe uma recomendação integrada — nunca quatro opiniões grampeadas.',
        leads: 'Os cinco agentes principais', supported: 'apoiado por', actions: 'ações', mandates: 'mandatos',
        subTitle: 'Subagentes', subLead: `${totalSub} especialistas executando o trabalho pesado sob cada agente principal`,
        activity: 'Ações por agente principal', activitySub: 'Acumulado ao longo de mandatos',
        casesT: 'Casos de exemplo', casesSub: 'Mandatos passados ilustrativos — como o time atua de ponta a ponta', lead: 'líder', outcome: 'Resultado',
        graphT: 'Como a frota se organiza',
        graphSub: 'A frota é uma constelação: o CAIO orquestra no centro, os quatro partners (MERKO, ASTEN, NOVAE, TYCEN) aprofundam cada disciplina e os 22 subagentes orbitam o principal que servem, fazendo o trabalho pesado. Cada nó acende quando o agente entra em ação.' }

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <WhatsNewBanner />
        <div className="border-b border-border-base bg-surface px-8 py-5">
          <h1 className="text-[18px] font-semibold text-ink-0 tracking-[-0.01em]">{en ? 'Team' : 'Time'}</h1>
          <p className="text-[12.5px] text-ink-5 mt-0.5">{en ? '5 lead agents · 22 subagents' : '5 agentes principais · 22 subagentes'}</p>
        </div>

        <div className="px-8 py-8 max-w-[1040px] mx-auto">

          {/* ── Hero: grafo de dependência da frota ── */}
          <section className="frota-rise mb-14">
            <h2 className="text-[13px] font-semibold text-ink-0">{L.graphT}</h2>
            <p className="text-[12.5px] leading-[1.6] text-ink-4 mt-1 mb-4 max-w-[80ch]">{L.graphSub}</p>
            <div className="rounded-[14px] bg-surface border border-border-card px-4 pt-4 pb-3">
              <DependencyGraph
                activeIds={ORDER}
                doneIds={AGENTS.filter(a => a.tier === 'subagente').map(a => a.id)}
                en={en}
              />
            </div>
          </section>

          {/* ── Hero: constelação + manifesto ── */}
          <section className="frota-rise grid lg:grid-cols-[minmax(0,440px)_1fr] gap-8 items-center mb-14">
            <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="w-full h-auto" role="img" aria-label="Constelação da frota">
              {ring.map(p => (
                <line key={`l${p.id}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={meta(p.id).color} strokeWidth={1} opacity={0.28} />
              ))}
              {/* halo respirando atrás do CAIO */}
              <circle className="frota-halo" cx={cx} cy={cy} r={52} fill={meta('caio').color} />
              {/* nós dos 4 especialistas */}
              {ring.map(p => {
                const m = meta(p.id); const sub = subsOf(p.id).length; const on = focus === p.id || focus === null
                return (
                  <g key={p.id} onMouseEnter={() => setFocus(p.id)} onMouseLeave={() => setFocus(null)} style={{ cursor: 'default', opacity: on ? 1 : 0.4, transition: 'opacity .2s' }}>
                    <circle cx={p.x} cy={p.y} r={30} fill={m.color} stroke="#fff" strokeWidth={3} />
                    <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#fff">{m.label}</text>
                    <text x={p.x} y={p.y + 46} textAnchor="middle" fontSize="9.5" fill="#5A6472">+{sub} {en ? 'subagents' : 'subagentes'}</text>
                  </g>
                )
              })}
              {/* CAIO centro */}
              <g onMouseEnter={() => setFocus('caio')} onMouseLeave={() => setFocus(null)} style={{ opacity: focus === 'caio' || focus === null ? 1 : 0.4, transition: 'opacity .2s' }}>
                <circle cx={cx} cy={cy} r={40} fill={meta('caio').color} stroke="#fff" strokeWidth={4} />
                <text x={cx} y={cy - 3} textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">CAIO</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8.5" fill="#fff" opacity={0.9}>{en ? 'orchestrator' : 'orquestrador'}</text>
              </g>
            </svg>

            <div>
              <p className="text-[24px] leading-[1.25] font-semibold text-ink-0 tracking-[-0.015em] text-balance">{L.manifestoLead}</p>
              <p className="text-[14px] leading-[1.65] text-ink-3 mt-3 max-w-[62ch]">{L.manifesto}</p>
            </div>
          </section>

          {/* ── Roster: os 5 principais ── */}
          <section className="mb-14">
            <h2 className="text-[13px] font-semibold text-ink-0 mb-4">{L.leads}</h2>
            <div className="divide-y divide-border-div border-y border-border-div">
              {ORDER.map((id, i) => {
                const m = meta(id); const subs = subsOf(id)
                const act = ACTIVITY_BY_PRINCIPAL.find(a => a.id === id)
                return (
                  <div key={id} className="frota-rise flex gap-4 py-5" style={{ animationDelay: `${i * 60}ms` }}>
                    {/* monograma */}
                    <div className="shrink-0 flex flex-col items-center gap-1.5 w-[68px]">
                      <div className="w-[52px] h-[52px] rounded-[13px] flex items-center justify-center text-white font-bold text-[15px] shadow-sm" style={{ background: m.color }}>
                        {m.label[0]}
                      </div>
                      <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-app-bg text-ink-6">{m.tier}</span>
                    </div>
                    {/* corpo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-[16px] font-semibold text-ink-0">{m.label}</span>
                        <span className="text-[12px] text-ink-5">{en ? m.disciplineEn : m.discipline}</span>
                        {id === 'caio' && <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, ' + m.color + ' 14%, transparent)', color: m.color }}>{en ? 'orchestrator' : 'orquestrador'}</span>}
                      </div>
                      <p className="text-[13px] leading-[1.6] text-ink-3 mt-1.5 max-w-[68ch]">{en ? m.descEn : m.desc}</p>
                      {subs.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap mt-2.5">
                          <span className="text-[10.5px] text-ink-6">{L.supported}:</span>
                          {subs.map(s => (
                            <span key={s.id} className="inline-flex items-center gap-1.5 text-[11px] text-ink-5" title={s.role}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />{s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* atividade */}
                    {act && (
                      <div className="shrink-0 w-[116px] hidden sm:flex flex-col justify-center gap-1.5">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-[17px] font-semibold tabular-nums" style={{ color: m.color }}>{act.actions}</span>
                          <span className="text-[10.5px] text-ink-6">{L.actions}</span>
                        </div>
                        <div className="h-[5px] rounded-full bg-track overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(act.actions / maxActions) * 100}%`, background: m.color }} />
                        </div>
                        <span className="text-[10px] text-ink-6 text-right">{act.cases} {L.mandates}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Subagentes (subordinados) ── */}
          <section className="mb-14">
            <div className="flex items-baseline gap-3 mb-1">
              <h2 className="text-[13px] font-semibold text-ink-0">{L.subTitle}</h2>
              <span className="text-[11.5px] text-ink-6">{L.subLead}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {ORDER.filter(id => subsOf(id).length > 0).map(id => {
                const m = meta(id)
                return (
                  <div key={id} className="rounded-[12px] bg-surface border border-border-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="text-[12px] font-semibold text-ink-1">{m.label}</span>
                      <span className="text-[11px] text-ink-6">· {subsOf(id).length}</span>
                    </div>
                    <div className="space-y-2">
                      {subsOf(id).map(s => (
                        <div key={s.id} className="flex items-baseline gap-2">
                          <span className="text-[12px] font-medium text-ink-1 w-[74px] shrink-0">{s.name}</span>
                          <span className="text-[11.5px] text-ink-5 leading-snug">{s.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Ações por principal ── */}
          <section className="mb-14">
            <h2 className="text-[13px] font-semibold text-ink-0">{L.activity}</h2>
            <p className="text-[11.5px] text-ink-6 mb-4">{L.activitySub}</p>
            <div className="space-y-3.5">
              {ORDER.map(id => {
                const m = meta(id); const a = ACTIVITY_BY_PRINCIPAL.find(x => x.id === id)!
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className="w-14 text-[12px] font-semibold text-ink-1 shrink-0">{m.label}</span>
                    <div className="flex-1 h-7 rounded-md bg-track overflow-hidden">
                      <div className="h-full flex items-center justify-end pr-2.5 rounded-md transition-all" style={{ width: `${(a.actions / maxActions) * 100}%`, background: m.color }}>
                        <span className="text-[11px] font-semibold text-white tabular-nums">{a.actions}</span>
                      </div>
                    </div>
                    <span className="w-24 text-[11px] text-ink-6 text-right shrink-0">{a.cases} {L.mandates}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Casos (ledger) ── */}
          <section>
            <h2 className="text-[13px] font-semibold text-ink-0">{L.casesT}</h2>
            <p className="text-[11.5px] text-ink-6 mb-4">{L.casesSub}</p>
            <div className="space-y-3">
              {SHOWCASE_CASES.map(c => {
                const lm = meta(c.lead)
                return (
                  <div key={c.id} className="rounded-[12px] bg-surface border border-border-card overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border-div">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ background: lm.color }}>{lm.label[0]}</span>
                      <span className="text-[13.5px] font-semibold text-ink-0">{c.name}</span>
                      <span className="text-[11px] text-ink-6">· {lm.label} {L.lead}</span>
                      <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-app-bg text-ink-5">{c.type}</span>
                    </div>
                    <div className="px-5 py-3.5 space-y-2.5">
                      {c.actions.map((act, i) => {
                        const am = meta(act.agentId)
                        return (
                          <div key={i} className="flex gap-3 items-baseline">
                            <span className="text-[11px] font-semibold shrink-0 w-14" style={{ color: am.color }}>{am.label}</span>
                            <p className="text-[12.5px] text-ink-2 leading-snug flex-1 min-w-0">
                              {act.action} <span className="text-ink-6">— {act.metric}{act.supporting.length > 0 && <> · {L.supported}: {act.supporting.join(', ')}</>}</span>
                            </p>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[12px] text-ink-3 px-5 py-2.5 bg-app-bg/60 flex items-start gap-2">
                      <ArrowRight size={13} className="text-accent mt-0.5 shrink-0" /> <span><b className="text-ink-1 font-medium">{L.outcome}:</b> {c.outcome}</span>
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

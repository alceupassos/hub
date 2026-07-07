'use client'
import { useMemo, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { WhatsNewBanner } from '@/components/WhatsNewBanner'
import { AGENTS } from '@/lib/agents'
import { getPrincipais, getSubagentsFor } from '@/lib/agentTiers'
import { PRINCIPAL_META, SHOWCASE_CASES, ACTIVITY_BY_PRINCIPAL } from '@/lib/fleetShowcase'
import { useLang } from '@/lib/lang'
import { Sparkles, Users, ArrowRight, Activity } from 'lucide-react'

// Ordem visual dos principais: CAIO no centro; os 4 especialistas ao redor.
const RING = ['merko', 'asten', 'tycen', 'novae']

export default function FrotaPage() {
  const { lang } = useLang()
  const principais = getPrincipais()
  const [sel, setSel] = useState<string>('caio')

  const meta = (id: string) => PRINCIPAL_META[id]
  const subsOf = (id: string) => getSubagentsFor(id)
  const totalSub = AGENTS.filter(a => a.tier === 'subagente').length

  const L = lang === 'en'
    ? { title: 'The Fleet', sub: `5 lead specialists, ${totalSub} supporting subagents`, lead: 'lead', serves: 'subagents', cases: 'Example cases', casesSub: 'Illustrative past mandates — how the fleet acts end to end', activity: 'Actions by lead agent', activitySub: 'Accumulated across mandates', supported: 'supported by', outcome: 'Outcome', principaisLbl: 'Lead agents', subLbl: 'Subagents' }
    : { title: 'A Frota', sub: `5 especialistas principais, ${totalSub} subagentes de apoio`, lead: 'líder', serves: 'subagentes', cases: 'Casos de exemplo', casesSub: 'Mandatos passados ilustrativos — como a frota atua de ponta a ponta', activity: 'Ações por agente principal', activitySub: 'Acumulado ao longo de mandatos', supported: 'apoiado por', outcome: 'Resultado', principaisLbl: 'Agentes principais', subLbl: 'Subagentes' }

  // posições da constelação (viewBox 800x420): CAIO centro, 4 ao redor
  const cx = 400, cy = 200, R = 150
  const ringPos = useMemo(() => {
    const angles = [200, 340, 20, 160] // graus, distribui os 4
    return RING.map((id, i) => {
      const a = (angles[i] * Math.PI) / 180
      return { id, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }
    })
  }, [])

  const maxActions = Math.max(...ACTIVITY_BY_PRINCIPAL.map(a => a.actions))
  const selAgent = AGENTS.find(a => a.id === sel)
  const selMeta = meta(sel)

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <WhatsNewBanner />
        <div className="border-b border-border-base bg-surface px-8 py-5">
          <h1 className="text-[17px] font-semibold text-ink-0 flex items-center gap-2"><Sparkles size={17} className="text-accent" /> {L.title}</h1>
          <p className="text-[12px] text-ink-5 mt-0.5">{L.sub}</p>
        </div>

        <div className="px-8 py-6 space-y-9 max-w-5xl">
          {/* ── Constelação: 5 principais em destaque ── */}
          <section className="bg-surface border border-border-card rounded-[14px] p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.1em] text-ink-6">{L.principaisLbl}</span>
              <span className="text-[11px] text-ink-6">{principais.length} principais · {totalSub} {L.subLbl.toLowerCase()}</span>
            </div>
            <svg viewBox="0 0 800 420" className="w-full h-auto">
              {/* linhas CAIO → especialistas */}
              {ringPos.map(p => (
                <line key={`l-${p.id}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#D4D8DF" strokeWidth={1.5} />
              ))}
              {/* subagentes orbitando cada especialista + CAIO */}
              {[{ id: 'caio', x: cx, y: cy }, ...ringPos].map(p => {
                const subs = subsOf(p.id)
                return subs.map((s, i) => {
                  const ang = (i / subs.length) * Math.PI * 2
                  const rr = 46
                  const sx = p.x + rr * Math.cos(ang), sy = p.y + rr * Math.sin(ang)
                  return <g key={`s-${s.id}`}>
                    <line x1={p.x} y1={p.y} x2={sx} y2={sy} stroke="#E7EAEF" strokeWidth={1} />
                    <circle cx={sx} cy={sy} r={4} fill={s.dot} opacity={0.7} />
                  </g>
                })
              })}
              {/* nós dos especialistas */}
              {ringPos.map(p => {
                const m = meta(p.id)
                const on = sel === p.id
                return (
                  <g key={`n-${p.id}`} onClick={() => setSel(p.id)} style={{ cursor: 'pointer' }}>
                    <circle cx={p.x} cy={p.y} r={on ? 30 : 26} fill={m.color} opacity={on ? 1 : 0.9} stroke="#fff" strokeWidth={3} />
                    <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{m.label}</text>
                  </g>
                )
              })}
              {/* CAIO no centro (maior, orquestrador) */}
              <g onClick={() => setSel('caio')} style={{ cursor: 'pointer' }}>
                <circle cx={cx} cy={cy} r={sel === 'caio' ? 42 : 38} fill={meta('caio').color} stroke="#fff" strokeWidth={4} />
                <text x={cx} y={cy - 2} textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">CAIO</text>
                <text x={cx} y={cy + 13} textAnchor="middle" fontSize="8.5" fill="#fff" opacity={0.85}>orquestrador</text>
              </g>
            </svg>

            {/* detalhe do principal selecionado */}
            {selAgent && selMeta && (
              <div className="mt-2 border-t border-border-div pt-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: selMeta.color }} />
                  <span className="text-[15px] font-semibold text-ink-0">{selMeta.label}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-soft text-accent">{selMeta.tier}</span>
                  <span className="text-[12px] text-ink-5">· {lang === 'en' ? selMeta.disciplineEn : selMeta.discipline}</span>
                </div>
                <p className="text-[11.5px] text-ink-6 mb-2 flex items-center gap-1.5"><Users size={12} /> {subsOf(sel).length} {L.serves}</p>
                <div className="flex flex-wrap gap-1.5">
                  {subsOf(sel).map(s => (
                    <span key={s.id} className="text-[11px] px-2 py-1 rounded-md border border-border-card text-ink-5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} /> {s.name}
                    </span>
                  ))}
                  {subsOf(sel).length === 0 && <span className="text-[11px] text-ink-6">—</span>}
                </div>
              </div>
            )}
          </section>

          {/* ── Gráfico: ações por principal ── */}
          <section>
            <h2 className="text-[13px] font-semibold text-ink-0 flex items-center gap-1.5 mb-1"><Activity size={14} className="text-accent" /> {L.activity}</h2>
            <p className="text-[11.5px] text-ink-6 mb-3">{L.activitySub}</p>
            <div className="bg-surface border border-border-card rounded-[12px] p-5 space-y-3">
              {ACTIVITY_BY_PRINCIPAL.map(a => {
                const m = meta(a.id)
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="w-14 text-[12px] font-semibold text-ink-0 shrink-0">{m.label}</span>
                    <div className="flex-1 h-6 rounded-md bg-track relative overflow-hidden">
                      <div className="h-full rounded-md flex items-center justify-end pr-2" style={{ width: `${(a.actions / maxActions) * 100}%`, background: m.color }}>
                        <span className="text-[11px] font-semibold text-white">{a.actions}</span>
                      </div>
                    </div>
                    <span className="w-20 text-[11px] text-ink-6 shrink-0 text-right">{a.cases} {lang === 'en' ? 'mandates' : 'mandatos'}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Casos de exemplo ── */}
          <section>
            <h2 className="text-[13px] font-semibold text-ink-0 mb-1">{L.cases}</h2>
            <p className="text-[11.5px] text-ink-6 mb-3">{L.casesSub}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SHOWCASE_CASES.map(c => {
                const lm = meta(c.lead)
                return (
                  <div key={c.id} className="bg-surface border border-border-card rounded-[12px] p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: lm.color }} />
                      <span className="text-[13.5px] font-semibold text-ink-0">{c.name}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-soft text-accent ml-auto">{c.type}</span>
                    </div>
                    <p className="text-[11px] text-ink-6 mb-3">{lm.label} {L.lead}</p>
                    <div className="space-y-2.5">
                      {c.actions.map((act, i) => {
                        const am = meta(act.agentId)
                        return (
                          <div key={i} className="flex gap-2.5">
                            <span className="w-1.5 rounded-full shrink-0 mt-1" style={{ background: am.color }} />
                            <div className="min-w-0">
                              <p className="text-[12px] text-ink-0 leading-snug">
                                <b>{am.label}</b> {act.action}
                              </p>
                              <p className="text-[10.5px] text-ink-6 mt-0.5">
                                {act.metric}{act.supporting.length > 0 && <> · {L.supported}: {act.supporting.join(', ')}</>}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[11.5px] text-ink-4 italic mt-3 border-t border-border-div pt-2.5 flex items-start gap-1.5">
                      <ArrowRight size={12} className="text-accent mt-0.5 shrink-0" /> {c.outcome}
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

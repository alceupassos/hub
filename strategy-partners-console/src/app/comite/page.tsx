'use client'
import { useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { Gavel, Info, ThumbsUp, ThumbsDown, Eye, Loader2 } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { SynthesisPulse } from '@/components/SynthesisPulse'

type Vote = 'go' | 'no_go' | 'watch'
interface Member { agentId: string; agentName: string; role: string; stance: string; vote: Vote; rationale: string }
interface DebatePoint { topic: string; tension: string; positions: string }
interface Result {
  mandate: string; decision: Vote; decisionHeadline: string
  members: Member[]; debate: DebatePoint[]; dissents: string[]; conditions: string[]
  tally: { go: number; no_go: number; watch: number }
}

const VOTE_META: Record<Vote, { color: string; bg: string; icon: typeof ThumbsUp }> = {
  go: { color: '#1F9D6B', bg: 'bg-success-bg', icon: ThumbsUp },
  no_go: { color: '#B4462F', bg: 'bg-[#FBEAE5]', icon: ThumbsDown },
  watch: { color: '#C77800', bg: 'bg-[#FEF6E7]', icon: Eye },
}
const DOT: Record<string, string> = { merko: '#0B3A78', asten: '#1F9D6B', novae: '#8B5CF6', tycen: '#C77800' }

export default function ComitePage() {
  const { lang } = useLang()
  const en = lang === 'en'
  const [mandate, setMandate] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  const L = en ? {
    title: 'Investment Committee', sub: 'The five principals deliberate a mandate, debate divergences and vote go / no-go.',
    noteWhat: 'Live Investment Committee — the fleet deliberates like a real IC.',
    noteUse: 'Describe the mandate (target, thesis, key facts). The four partners take positions, the committee debates the divergences and each votes go/no-go/watch with a rationale; the chair (CAIO) records the decision, dissents and conditions precedent.',
    ph: 'Describe the mandate for the committee — e.g. acquisition of a fintech with $8M ARR, two BACEN fines, exclusivity expiring in 90 days…',
    run: 'Convene committee', running: 'Committee in session…',
    voteLabel: { go: 'GO', no_go: 'NO-GO', watch: 'WATCH' } as Record<Vote, string>,
    decision: 'Committee decision', tally: 'Vote tally', debate: 'Debate — key divergences',
    dissents: 'Dissents & caveats', conditions: 'Conditions precedent', stance: 'Position', rationale: 'Rationale',
  } : {
    title: 'Comitê de Investimento', sub: 'Os cinco principais deliberam um mandato, debatem as divergências e votam go / no-go.',
    noteWhat: 'Comitê de Investimento ao vivo — a frota delibera como um IC real.',
    noteUse: 'Descreva o mandato (alvo, tese, fatos-chave). Os quatro sócios tomam posição, o comitê debate as divergências e cada um vota go/no-go/watch com justificativa; o presidente (CAIO) registra a decisão, as dissidências e as condições precedentes.',
    ph: 'Descreva o mandato para o comitê — ex.: aquisição de fintech com R$8M de ARR, duas multas do BACEN, exclusividade expirando em 90 dias…',
    run: 'Convocar comitê', running: 'Comitê em sessão…',
    voteLabel: { go: 'GO', no_go: 'NO-GO', watch: 'ACOMPANHAR' } as Record<Vote, string>,
    decision: 'Decisão do comitê', tally: 'Apuração dos votos', debate: 'Debate — divergências centrais',
    dissents: 'Dissidências e ressalvas', conditions: 'Condições precedentes', stance: 'Posição', rationale: 'Justificativa',
  }

  async function convene() {
    if (!mandate.trim() || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/committee', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mandate, lang }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro.'); return }
      setResult(data)
    } catch {
      setError(en ? 'Connection error.' : 'Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const dm = result ? VOTE_META[result.decision] : null

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto px-8 py-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0"><Gavel size={18} className="text-white" /></div>
            <div>
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">{L.title}</h1>
              <p className="text-[12.5px] text-ink-5">{L.sub}</p>
            </div>
          </div>

          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
            <Info size={15} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-ink-3 leading-relaxed"><strong>{L.noteWhat}</strong> {L.noteUse}</p>
          </div>

          <div className="mb-5">
            <textarea value={mandate} onChange={e => setMandate(e.target.value)} rows={3} placeholder={L.ph}
              className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border-input bg-white text-ink-1 outline-none focus:border-accent resize-none" />
            <div className="mt-2 flex items-center gap-3">
              <button onClick={convene} disabled={loading || !mandate.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-[12.5px] font-medium hover:opacity-90 disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />}
                {loading ? L.running : L.run}
              </button>
              {error && <span className="text-[12px] text-[#B4462F]">{error}</span>}
            </div>
          </div>

          {loading && (
            <div className="p-6 rounded-xl border border-border-card bg-surface">
              <SynthesisPulse activeModels={[
                { id: 'merko', name: 'MERKO', dot: DOT.merko }, { id: 'asten', name: 'ASTEN', dot: DOT.asten },
                { id: 'novae', name: 'NOVAE', dot: DOT.novae }, { id: 'tycen', name: 'TYCEN', dot: DOT.tycen },
              ]} />
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5">
              {/* Decisão + apuração */}
              <div className={`p-5 rounded-xl border ${dm!.bg}`} style={{ borderColor: `${dm!.color}55` }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    {dm && <dm.icon size={26} style={{ color: dm.color }} />}
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.decision}</div>
                      <div className="text-[24px] font-bold" style={{ color: dm!.color }}>{L.voteLabel[result.decision]}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[12px]">
                    <span className="flex items-center gap-1.5"><ThumbsUp size={13} className="text-success" /> {result.tally.go}</span>
                    <span className="flex items-center gap-1.5"><Eye size={13} className="text-[#C77800]" /> {result.tally.watch}</span>
                    <span className="flex items-center gap-1.5"><ThumbsDown size={13} className="text-[#B4462F]" /> {result.tally.no_go}</span>
                  </div>
                </div>
                {result.decisionHeadline && <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">{result.decisionHeadline}</p>}
              </div>

              {/* Membros e votos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.members.map(m => {
                  const vm = VOTE_META[m.vote]
                  return (
                    <div key={m.agentId} className="p-4 rounded-xl border border-border-card bg-surface">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: DOT[m.agentId] ?? '#0B3A78' }} />
                          <span className="text-[13px] font-semibold text-ink-0">{m.agentName}</span>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: vm.color, background: `${vm.color}18` }}>
                          <vm.icon size={11} /> {L.voteLabel[m.vote]}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-6 mb-1.5 italic">{m.role}</p>
                      {m.stance && <p className="text-[12px] text-ink-2 leading-relaxed"><span className="text-ink-5">{L.stance}: </span>{m.stance}</p>}
                      {m.rationale && <p className="text-[11.5px] text-ink-4 leading-relaxed mt-1.5"><span className="text-ink-6">{L.rationale}: </span>{m.rationale}</p>}
                    </div>
                  )
                })}
              </div>

              {/* Debate */}
              {result.debate.length > 0 && (
                <div className="p-5 rounded-xl border border-border-card bg-surface">
                  <h3 className="text-[13px] font-semibold text-ink-1 mb-3">{L.debate}</h3>
                  <div className="space-y-3">
                    {result.debate.map((d, i) => (
                      <div key={i} className="border-l-2 border-accent pl-3">
                        <p className="text-[12.5px] font-medium text-ink-1">{d.topic}</p>
                        <p className="text-[12px] text-ink-4 leading-relaxed">{d.tension}</p>
                        {d.positions && <p className="text-[11.5px] text-ink-6 mt-0.5">{d.positions}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dissidências + condições */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.dissents.length > 0 && (
                  <div className="p-4 rounded-xl border border-border-card bg-surface">
                    <h3 className="text-[12px] font-semibold text-ink-1 mb-2">{L.dissents}</h3>
                    <ul className="space-y-1.5">
                      {result.dissents.map((d, i) => <li key={i} className="text-[12px] text-ink-4 leading-relaxed flex gap-2"><span className="text-[#C77800]">•</span>{d}</li>)}
                    </ul>
                  </div>
                )}
                {result.conditions.length > 0 && (
                  <div className="p-4 rounded-xl border border-border-card bg-surface">
                    <h3 className="text-[12px] font-semibold text-ink-1 mb-2">{L.conditions}</h3>
                    <ul className="space-y-1.5">
                      {result.conditions.map((c, i) => <li key={i} className="text-[12px] text-ink-4 leading-relaxed flex gap-2"><span className="text-success">✓</span>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

'use client'
import { useMemo, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { Crosshair, Info, Swords, Loader2 } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { findInflection, rankFragility, type InflectionResult } from '@/lib/finance/inflection'
import { dcf } from '@/lib/finance/dcf'
import { ChatMarkdown } from '@/components/ChatMarkdown'

const brl = (n: number) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—')

function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-ink-6 mb-1">{label}</span>
      <input type="number" value={value} step={step} onChange={e => onChange(Number(e.target.value))}
        className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
    </label>
  )
}

export default function InflexaoPage() {
  const { lang } = useLang()
  const en = lang === 'en'
  // Deal-base: um DCF simples cujo EV é comparado ao preço da oferta.
  const [fcff0, setFcff0] = useState(20)
  const [wacc, setWacc] = useState(0.145)
  const [g, setG] = useState(0.03)
  const [growth, setGrowth] = useState(0.1)     // crescimento do FCFF
  const [offer, setOffer] = useState(200)        // preço da oferta (limiar)

  const evAt = (opts: { wacc?: number; g?: number; growth?: number }) => {
    const gr = opts.growth ?? growth
    const fcff = [0, 1, 2, 3, 4].map(t => fcff0 * Math.pow(1 + gr, t))
    try { return dcf({ fcff, discountRate: opts.wacc ?? wacc, terminalGrowth: opts.g ?? g }).enterpriseValue }
    catch { return NaN }
  }

  const analyses: InflectionResult[] = useMemo(() => {
    const list = [
      findInflection({ driver: en ? 'WACC' : 'WACC', current: wacc, min: g + 0.005, max: 0.30, outcome: (w) => evAt({ wacc: w }), threshold: offer, unit: '' }),
      findInflection({ driver: en ? 'Perpetual g' : 'g perpétuo', current: g, min: -0.02, max: wacc - 0.005, outcome: (gg) => evAt({ g: gg }), threshold: offer, unit: '' }),
      findInflection({ driver: en ? 'FCFF growth' : 'Cresc. FCFF', current: growth, min: -0.1, max: 0.4, outcome: (gr) => evAt({ growth: gr }), threshold: offer, unit: '' }),
    ]
    return rankFragility(list)
  }, [fcff0, wacc, g, growth, offer, en])

  const currentEv = evAt({})
  const verdict = currentEv >= offer

  // Red-team (advogado do diabo) — ataca a tese descrita pelo usuário.
  const [thesis, setThesis] = useState('')
  const [rtLoading, setRtLoading] = useState(false)
  const [critique, setCritique] = useState('')
  const [rtError, setRtError] = useState('')
  async function runRedTeam() {
    if (!thesis.trim() || rtLoading) return
    setRtLoading(true); setRtError(''); setCritique('')
    try {
      const res = await fetch('/api/red-team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ thesis, lang }) })
      const data = await res.json()
      if (!res.ok) { setRtError(data.error ?? 'Erro.'); return }
      setCritique(data.critique ?? '')
    } catch { setRtError(en ? 'Connection error.' : 'Erro de conexão.') } finally { setRtLoading(false) }
  }

  const L = en ? {
    title: 'Inflection analysis', sub: 'What would flip the decision? The exact breakpoint of each driver.',
    noteWhat: 'Inflection analysis — the threshold at which the go/no-go flips.',
    noteUse: 'The deal value (DCF enterprise value) is compared to the offer price. For each driver, the engine finds the exact value at which value crosses the offer — and ranks drivers by fragility (least headroom first). Rigor a committee expects before approving.',
    ev: 'Deal value (EV)', offer: 'Offer (threshold)', verdict: 'Current call',
    accept: 'Value ≥ offer → GO', reject: 'Value < offer → NO-GO',
    driver: 'Driver', current: 'Current', breakpoint: 'Breakpoint', headroom: 'Headroom', fFcff: 'FCFF year 1', fWacc: 'WACC (dec.)', fG: 'Perpetual g (dec.)', fGrowth: 'FCFF growth (dec.)', fOffer: 'Offer price',
    robust: 'Robust (no crossing in range)',
  } : {
    title: 'Análise de inflexão', sub: 'O que mudaria a decisão? O ponto de virada exato de cada driver.',
    noteWhat: 'Análise de inflexão — o limiar em que o go/no-go inverte.',
    noteUse: 'O valor do deal (enterprise value por DCF) é comparado ao preço da oferta. Para cada driver, o motor encontra o valor exato em que o valor cruza a oferta — e ranqueia os drivers por fragilidade (menor folga primeiro). O rigor que um comitê exige antes de aprovar.',
    ev: 'Valor do deal (EV)', offer: 'Oferta (limiar)', verdict: 'Decisão atual',
    accept: 'Valor ≥ oferta → GO', reject: 'Valor < oferta → NO-GO',
    driver: 'Driver', current: 'Atual', breakpoint: 'Ponto de virada', headroom: 'Folga', fFcff: 'FCFF ano 1', fWacc: 'WACC (dec.)', fG: 'g perpétuo (dec.)', fGrowth: 'Cresc. FCFF (dec.)', fOffer: 'Preço da oferta',
    robust: 'Robusto (não cruza no intervalo)',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto px-8 py-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0"><Crosshair size={18} className="text-white" /></div>
            <div>
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">{L.title}</h1>
              <p className="text-[12.5px] text-ink-5">{L.sub}</p>
            </div>
          </div>

          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
            <Info size={15} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-ink-3 leading-relaxed"><strong>{L.noteWhat}</strong> {L.noteUse}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
            <div className="grid grid-cols-2 gap-3 content-start">
              <Field label={L.fFcff} value={fcff0} onChange={setFcff0} step={1} />
              <Field label={L.fWacc} value={wacc} onChange={setWacc} step={0.005} />
              <Field label={L.fG} value={g} onChange={setG} step={0.005} />
              <Field label={L.fGrowth} value={growth} onChange={setGrowth} step={0.01} />
              <Field label={L.fOffer} value={offer} onChange={setOffer} step={10} />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-border-card bg-surface">
                  <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.ev}</div>
                  <div className="text-[24px] font-semibold text-accent">{brl(currentEv)}</div>
                </div>
                <div className={`p-4 rounded-xl border ${verdict ? 'border-success/40 bg-success-bg' : 'border-[#B4462F]/30 bg-[#FBEAE5]'}`}>
                  <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.verdict}</div>
                  <div className="text-[15px] font-semibold mt-1" style={{ color: verdict ? '#1F9D6B' : '#B4462F' }}>{verdict ? L.accept : L.reject}</div>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-border-card bg-surface overflow-x-auto">
                <h3 className="text-[13px] font-semibold text-ink-1 mb-3">{en ? 'Breakpoints (ranked by fragility)' : 'Pontos de virada (ranqueados por fragilidade)'}</h3>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-ink-6 border-b border-border-div text-left">
                      <th className="py-2">{L.driver}</th>
                      <th className="py-2 text-right">{L.current}</th>
                      <th className="py-2 text-right">{L.breakpoint}</th>
                      <th className="py-2 text-right">{L.headroom}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((a, i) => (
                      <tr key={i} className="border-b border-border-soft text-ink-3">
                        <td className="py-2 font-medium text-ink-1">{a.driver}</td>
                        <td className="py-2 text-right font-mono">{a.current.toFixed(3)}</td>
                        <td className="py-2 text-right font-mono">{a.breakpoint == null ? '—' : a.breakpoint.toFixed(3)}</td>
                        <td className="py-2 text-right font-mono" style={{ color: a.headroom != null && Math.abs(a.headroom / (a.current || 1)) < 0.2 ? '#B4462F' : undefined }}>
                          {a.headroom == null ? L.robust : `${a.headroom > 0 ? '+' : ''}${a.headroom.toFixed(3)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 space-y-1.5">
                  {analyses.map((a, i) => <p key={i} className="text-[11px] text-ink-6 leading-relaxed">{a.note}</p>)}
                </div>
              </div>
            </div>
          </div>

          {/* Red-team — advogado do diabo */}
          <div className="mt-6 p-5 rounded-xl border border-border-card bg-surface">
            <div className="flex items-center gap-2 mb-2">
              <Swords size={16} className="text-[#B4462F]" />
              <h3 className="text-[14px] font-semibold text-ink-0">{en ? 'Red team — devil’s advocate' : 'Red-team — advogado do diabo'}</h3>
            </div>
            <p className="text-[11.5px] text-ink-5 mb-3 leading-relaxed">
              {en
                ? 'Attacks the thesis without mercy: weakest assumption, overlooked risk, value-destruction scenario, and the one question the committee should demand answered. Strengthens credibility by surfacing what could kill the deal.'
                : 'Ataca a tese sem piedade: premissa mais frágil, risco negligenciado, cenário de destruição de valor e a pergunta-teste que o comitê deveria exigir. Fortalece a credibilidade ao expor o que pode derrubar o deal.'}
            </p>
            <textarea value={thesis} onChange={e => setThesis(e.target.value)} rows={3}
              placeholder={en ? 'Describe the investment thesis to stress-test…' : 'Descreva a tese de investimento a ser atacada…'}
              className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border-input bg-white text-ink-1 outline-none focus:border-accent resize-none" />
            <div className="mt-2 flex items-center gap-3">
              <button onClick={runRedTeam} disabled={rtLoading || !thesis.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[12.5px] font-medium hover:opacity-90 disabled:opacity-50" style={{ background: '#B4462F' }}>
                {rtLoading ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />}
                {rtLoading ? (en ? 'Attacking…' : 'Atacando…') : (en ? 'Run red team' : 'Rodar red-team')}
              </button>
              {rtError && <span className="text-[12px] text-[#B4462F]">{rtError}</span>}
            </div>
            {critique && (
              <div className="mt-4 p-4 rounded-lg border border-[#B4462F]/25 bg-[#FBEAE5]">
                <ChatMarkdown content={critique} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

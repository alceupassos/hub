'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { NavSidebar } from '@/components/NavSidebar'
import { ArrowLeft, Calculator, Info, Layers, TrendingUp } from 'lucide-react'
import { lbo } from '@/lib/finance/lbo'
import { dcf } from '@/lib/finance/dcf'
import { impliedValuation, footballField } from '@/lib/finance/comps'
import { FootballField } from '@/components/charts/FootballField'
import type { DealModelInputs, Provenance } from '@/lib/server/deal-model-inputs'

const brl = (n: number) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—')
const pct = (n: number | null | undefined, d = 1) => (n == null || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(d)}%`)

const PROV_META: Record<Provenance, { label: string; cls: string }> = {
  extraido: { label: 'extraído', cls: 'bg-success-bg text-success border border-success/30' },
  calibrado: { label: 'calibrado', cls: 'bg-accent-soft text-accent border border-accent-over/40' },
  placeholder: { label: 'placeholder', cls: 'bg-subtle-bg text-ink-5 border border-border-card' },
}

function ProvBadge({ prov, note }: { prov: Provenance; note?: string }) {
  const m = PROV_META[prov]
  return (
    <span title={note} className={`inline-block px-1.5 py-[1px] rounded text-[9px] uppercase tracking-wider ${m.cls}`}>{m.label}</span>
  )
}

function Field({ label, prov, note, value, onChange, step = 1 }: {
  label: string; prov?: Provenance; note?: string; value: number; onChange: (n: number) => void; step?: number
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-ink-6">{label}</span>
        {prov && <ProvBadge prov={prov} note={note} />}
      </span>
      <input type="number" value={value} step={step} onChange={e => onChange(Number(e.target.value))}
        className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
    </label>
  )
}

function TextField({ label, prov, note, value, onChange }: {
  label: string; prov?: Provenance; note?: string; value: string; onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-ink-6">{label}</span>
        {prov && <ProvBadge prov={prov} note={note} />}
      </span>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
    </label>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 border-b border-border-soft ${strong ? 'text-ink-0 font-semibold' : 'text-ink-3'}`}>
      <span className="text-[12px]">{k}</span>
      <span className="text-[12.5px] font-mono">{v}</span>
    </div>
  )
}

interface FormState {
  entryEbitda: number
  entryMultiple: number
  exitMultiple: number
  hold: number
  growth: number
  seniorTurns: number
  seniorRate: number
  tax: number
  wacc: number
  terminalGrowth: number
  netDebt: number
  fcff: string
  metricValue: number
  peers: string
}

function toForm(d: DealModelInputs): FormState {
  return {
    entryEbitda: d.lbo.entryEbitda.value,
    entryMultiple: d.lbo.entryMultiple.value,
    exitMultiple: d.lbo.exitMultiple.value,
    hold: d.lbo.holdYears.value,
    growth: d.lbo.ebitdaGrowth.value,
    seniorTurns: d.lbo.seniorTurns.value,
    seniorRate: d.lbo.seniorRate.value,
    tax: d.lbo.taxRate.value,
    wacc: d.dcf.wacc.value,
    terminalGrowth: d.dcf.terminalGrowth.value,
    netDebt: d.dcf.netDebt.value,
    fcff: d.dcf.fcff.value.join(', '),
    metricValue: d.comps.metricValue.value,
    peers: d.comps.peerMultiples.value.join(', '),
  }
}

export default function DealModelagemPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<DealModelInputs | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${id}/model-inputs`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? 'Falha ao carregar inputs.')
        return r.json() as Promise<DealModelInputs>
      })
      .then(d => { setData(d); setForm(toForm(d)) })
      .catch(e => setError(e instanceof Error ? e.message : 'Erro'))
      .finally(() => setLoaded(true))
  }, [id])

  const set = (patch: Partial<FormState>) => setForm(f => (f ? { ...f, ...patch } : f))

  const lboRes = useMemo(() => {
    if (!form) return null
    try {
      return lbo({
        entryEbitda: form.entryEbitda, entryMultiple: form.entryMultiple, exitMultiple: form.exitMultiple,
        holdYears: Math.max(1, Math.round(form.hold)), ebitdaGrowth: form.growth, taxRate: form.tax,
        capexPctOfEbitda: 0.15, daPctOfEbitda: 0.1,
        tranches: [{ name: 'Sênior', turns: form.seniorTurns, rate: form.seniorRate, mandatoryAmortPct: 0.05 }],
      })
    } catch { return null }
  }, [form])

  const dcfRes = useMemo(() => {
    if (!form) return null
    const parsed = form.fcff.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n))
    if (!parsed.length) return { error: 'Informe ao menos um FCFF.' } as const
    try {
      return dcf({ fcff: parsed, discountRate: form.wacc, terminalGrowth: form.terminalGrowth, netDebt: form.netDebt })
    } catch (e) { return { error: e instanceof Error ? e.message : 'erro' } as const }
  }, [form])

  const bands = useMemo(() => {
    if (!form) return []
    const multiples = form.peers.split(',').map(s => Number(s.trim())).filter(Number.isFinite)
    const iv = impliedValuation('EBITDA', form.metricValue, multiples)
    const evDcf = dcfRes && !('error' in dcfRes) ? dcfRes.enterpriseValue : NaN
    const list = [{ method: 'Comps (EV/EBITDA)', low: iv.low, base: iv.base, high: iv.high }]
    if (Number.isFinite(evDcf)) list.push({ method: 'DCF', low: evDcf * 0.9, base: evDcf, high: evDcf * 1.1 })
    const ff = footballField(list)
    return [...list, { method: 'Consenso', low: ff.overallLow, base: ff.overallBase, high: ff.overallHigh, highlight: true }]
  }, [form, dcfRes])

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-8">
          <Link href={`/projetos/${id}`} className="flex items-center gap-1.5 text-[12px] text-ink-5 hover:text-ink-0 mb-3 w-fit">
            <ArrowLeft size={13} /> Voltar ao deal
          </Link>

          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Calculator size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">
                Modelagem do deal{data?.dealName ? ` — ${data.dealName}` : ''}
              </h1>
              <p className="text-[12.5px] text-ink-5">
                {data?.clientName ? `${data.clientName} · ` : ''}
                {data?.sector ? `Setor detectado: ${data.sector} · ` : ''}
                Motor determinístico pré-preenchido a partir do pipeline.
              </p>
            </div>
          </div>

          <PanelNote />

          <div className="mb-5 flex flex-wrap items-center gap-3 text-[11px] text-ink-5">
            <span className="text-ink-6 uppercase tracking-wider">Proveniência:</span>
            <span className="flex items-center gap-1.5"><ProvBadge prov="extraido" /> das métricas reais do deal</span>
            <span className="flex items-center gap-1.5"><ProvBadge prov="calibrado" /> da base proprietária da firma</span>
            <span className="flex items-center gap-1.5"><ProvBadge prov="placeholder" /> premissa de sandbox / assumida</span>
          </div>

          {!loaded && <p className="text-[12px] text-ink-6">Carregando inputs do deal…</p>}
          {loaded && error && (
            <div className="rounded-lg border border-border-card bg-subtle-bg px-4 py-3 text-[12px] text-ink-4">{error}</div>
          )}

          {form && data && (
            <div className="space-y-7">
              {/* ── LBO ── */}
              <section>
                <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink-1 mb-3"><Layers size={15} className="text-accent" /> LBO</h2>
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
                  <div className="grid grid-cols-2 gap-3 content-start">
                    <Field label="EBITDA entrada" step={10} value={form.entryEbitda} onChange={v => set({ entryEbitda: v })} prov={data.lbo.entryEbitda.provenance} note={data.lbo.entryEbitda.note} />
                    <Field label="Múlt. entrada (x)" step={0.5} value={form.entryMultiple} onChange={v => set({ entryMultiple: v })} prov={data.lbo.entryMultiple.provenance} note={data.lbo.entryMultiple.note} />
                    <Field label="Múlt. saída (x)" step={0.5} value={form.exitMultiple} onChange={v => set({ exitMultiple: v })} prov={data.lbo.exitMultiple.provenance} note={data.lbo.exitMultiple.note} />
                    <Field label="Hold (anos)" value={form.hold} onChange={v => set({ hold: v })} prov={data.lbo.holdYears.provenance} note={data.lbo.holdYears.note} />
                    <Field label="Cresc. EBITDA (dec.)" step={0.01} value={form.growth} onChange={v => set({ growth: v })} prov={data.lbo.ebitdaGrowth.provenance} note={data.lbo.ebitdaGrowth.note} />
                    <Field label="Dívida sênior (x)" step={0.5} value={form.seniorTurns} onChange={v => set({ seniorTurns: v })} prov={data.lbo.seniorTurns.provenance} note={data.lbo.seniorTurns.note} />
                    <Field label="Taxa sênior (dec.)" step={0.01} value={form.seniorRate} onChange={v => set({ seniorRate: v })} prov={data.lbo.seniorRate.provenance} note={data.lbo.seniorRate.note} />
                    <Field label="Imposto (dec.)" step={0.01} value={form.tax} onChange={v => set({ tax: v })} prov={data.lbo.taxRate.provenance} note={data.lbo.taxRate.note} />
                  </div>
                  <div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-border-card bg-surface">
                        <div className="text-[11px] uppercase tracking-wider text-ink-6">MOIC</div>
                        <div className="text-[28px] font-semibold text-accent">{lboRes ? `${brl(lboRes.moic)}x` : '—'}</div>
                      </div>
                      <div className="p-4 rounded-xl border border-border-card bg-surface">
                        <div className="text-[11px] uppercase tracking-wider text-ink-6">TIR (IRR)</div>
                        <div className="text-[28px] font-semibold text-success">{lboRes ? pct(lboRes.irr) : '—'}</div>
                      </div>
                    </div>
                    {lboRes && (
                      <div className="mt-4 p-4 rounded-xl border border-border-card bg-surface">
                        <Row k="EV de entrada" v={brl(lboRes.entryEV)} />
                        <Row k="Dívida na entrada" v={brl(lboRes.totalDebtAtEntry)} />
                        <Row k="Cheque do sponsor (equity)" v={brl(lboRes.sponsorEquity)} strong />
                        <Row k="EV de saída" v={brl(lboRes.exitEV)} />
                        <Row k="Proceeds do sponsor" v={brl(lboRes.sponsorExitProceeds)} strong />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ── DCF ── */}
              <section>
                <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink-1 mb-3"><TrendingUp size={15} className="text-accent" /> DCF</h2>
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
                  <div className="grid grid-cols-1 gap-3 content-start">
                    <TextField label="FCFF por ano (vírgula)" value={form.fcff} onChange={v => set({ fcff: v })} prov={data.dcf.fcff.provenance} note={data.dcf.fcff.note} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="WACC (dec.)" step={0.005} value={form.wacc} onChange={v => set({ wacc: v })} prov={data.dcf.wacc.provenance} note={data.dcf.wacc.note} />
                      <Field label="g perpétuo (dec.)" step={0.005} value={form.terminalGrowth} onChange={v => set({ terminalGrowth: v })} prov={data.dcf.terminalGrowth.provenance} note={data.dcf.terminalGrowth.note} />
                      <Field label="Dívida líquida" step={5} value={form.netDebt} onChange={v => set({ netDebt: v })} prov={data.dcf.netDebt.provenance} note={data.dcf.netDebt.note} />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-border-card bg-surface">
                    {dcfRes && 'error' in dcfRes ? (
                      <p className="text-[13px] text-[#B4462F]">{dcfRes.error}</p>
                    ) : dcfRes ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div><div className="text-[10px] uppercase tracking-wider text-ink-6">Enterprise Value</div><div className="text-[20px] font-semibold text-accent">{brl(dcfRes.enterpriseValue)}</div></div>
                          <div><div className="text-[10px] uppercase tracking-wider text-ink-6">Equity</div><div className="text-[20px] font-semibold text-ink-0">{dcfRes.equityValue != null ? brl(dcfRes.equityValue) : '—'}</div></div>
                        </div>
                        <Row k="PV dos fluxos explícitos" v={brl(dcfRes.pvExplicit)} />
                        <Row k="PV do valor terminal" v={brl(dcfRes.pvTerminal)} />
                      </>
                    ) : null}
                  </div>
                </div>
              </section>

              {/* ── Comps / Football field ── */}
              <section>
                <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink-1 mb-3"><Calculator size={15} className="text-accent" /> Football field</h2>
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
                  <div className="grid grid-cols-2 gap-3 content-start">
                    <TextField label="Múltiplos de pares (vírgula)" value={form.peers} onChange={v => set({ peers: v })} prov={data.comps.peerMultiples.provenance} note={data.comps.peerMultiples.note} />
                    <Field label="Métrica-alvo (EBITDA)" step={10} value={form.metricValue} onChange={v => set({ metricValue: v })} prov={data.comps.metricValue.provenance} note={data.comps.metricValue.note} />
                  </div>
                  <div className="p-5 rounded-xl border border-border-card bg-surface">
                    <h3 className="text-[13px] font-semibold text-ink-1 mb-4">Faixas de valuation (EV) — comps × DCF × consenso</h3>
                    <FootballField bands={bands} />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function PanelNote() {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
      <Info size={15} className="text-accent mt-0.5 shrink-0" />
      <p className="text-[12px] text-ink-3 leading-relaxed">
        <strong>O que é:</strong> a modelagem deste deal específico, com os inputs já <strong>pré-preenchidos</strong> a partir
        do pipeline — métricas extraídas do próprio deal, premissas calibradas da base proprietária da firma e, onde faltam
        dados, defaults claramente marcados. <strong>Para que serve:</strong> partir de números fundamentados (não de um sandbox
        em branco) ao montar LBO, DCF e o football field de valuation. <strong>Como usar:</strong> confira a etiqueta de
        proveniência de cada campo — <em>extraído</em>, <em>calibrado</em> ou <em>placeholder</em> —, ajuste o que for premissa
        e leia MOIC/TIR, Enterprise Value e a faixa de consenso. O motor é o mesmo do workbench e do chat: exato e auditável.
      </p>
    </div>
  )
}

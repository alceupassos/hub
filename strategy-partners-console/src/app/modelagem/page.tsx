'use client'
import { useMemo, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { Calculator, TrendingUp, Layers, GitCompareArrows, Info, Activity } from 'lucide-react'
import { dcf } from '@/lib/finance/dcf'
import { lbo } from '@/lib/finance/lbo'
import { accretionDilution } from '@/lib/finance/accretion_dilution'
import { impliedValuation, footballField } from '@/lib/finance/comps'
import { dataTable2D, tornado } from '@/lib/finance/sensitivity'
import { runLboScenarios, DEFAULT_SCENARIOS } from '@/lib/finance/scenario'
import { runMonteCarloLbo } from '@/lib/finance/montecarlo'
import { FootballField } from '@/components/charts/FootballField'
import { ReturnsWaterfall } from '@/components/charts/ReturnsWaterfall'
import { SensitivityHeatmap } from '@/components/charts/SensitivityHeatmap'
import { TornadoChart } from '@/components/charts/TornadoChart'
import { DistributionChart } from '@/components/charts/DistributionChart'

const brl = (n: number) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—')
const pct = (n: number | null | undefined, d = 1) => (n == null || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(d)}%`)

type Tab = 'lbo' | 'dcf' | 'comps' | 'accretion' | 'sensibilidade' | 'cenarios'
const TABS: { key: Tab; label: string; icon: typeof Calculator }[] = [
  { key: 'lbo', label: 'LBO', icon: Layers },
  { key: 'dcf', label: 'DCF', icon: TrendingUp },
  { key: 'comps', label: 'Comps', icon: Calculator },
  { key: 'accretion', label: 'Accretion/Dilution', icon: GitCompareArrows },
  { key: 'sensibilidade', label: 'Sensibilidade', icon: Activity },
  { key: 'cenarios', label: 'Cenários + Monte Carlo', icon: Layers },
]

function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-ink-6 mb-1">{label}</span>
      <input type="number" value={value} step={step} onChange={e => onChange(Number(e.target.value))}
        className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
    </label>
  )
}

// Nota explicativa curta por recurso: o que é / para que serve / como usar — para profissionais.
function PanelNote({ what, use }: { what: string; use: string }) {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-border-card bg-subtle-bg px-3.5 py-2.5">
      <Info size={13} className="text-accent mt-0.5 shrink-0" />
      <p className="text-[11.5px] text-ink-4 leading-relaxed"><span className="text-ink-2 font-medium">{what}</span> {use}</p>
    </div>
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

function LboPanel() {
  const [ebitda, setEbitda] = useState(100)
  const [entryX, setEntryX] = useState(10)
  const [exitX, setExitX] = useState(11)
  const [hold, setHold] = useState(5)
  const [growth, setGrowth] = useState(0.08)
  const [seniorTurns, setSeniorTurns] = useState(4)
  const [seniorRate, setSeniorRate] = useState(0.14)
  const [tax, setTax] = useState(0.34)

  const r = useMemo(() => lbo({
    entryEbitda: ebitda, entryMultiple: entryX, exitMultiple: exitX, holdYears: hold, ebitdaGrowth: growth,
    taxRate: tax, capexPctOfEbitda: 0.15, daPctOfEbitda: 0.1,
    tranches: [{ name: 'Sênior', turns: seniorTurns, rate: seniorRate, mandatoryAmortPct: 0.05 }],
  }), [ebitda, entryX, exitX, hold, growth, seniorTurns, seniorRate, tax])

  const a = r.attribution
  const entryEquityValue = r.entryEV - r.totalDebtAtEntry
  // Waterfall: equity de entrada → +drivers → equity de saída (totais nas pontas).
  const waterfall = [
    { label: 'Equity entrada', value: entryEquityValue, isTotal: true },
    { label: '+ Cresc. EBITDA', value: a.ebitdaGrowth },
    { label: '+ Múltiplo', value: a.multipleExpansion },
    { label: '+ Desalavancagem', value: a.deleveraging },
    { label: 'Equity saída', value: r.exitEquity, isTotal: true },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
      <div className="grid grid-cols-2 gap-3 content-start">
        <Field label="EBITDA entrada" value={ebitda} onChange={setEbitda} step={10} />
        <Field label="Múltiplo entrada (x)" value={entryX} onChange={setEntryX} step={0.5} />
        <Field label="Múltiplo saída (x)" value={exitX} onChange={setExitX} step={0.5} />
        <Field label="Hold (anos)" value={hold} onChange={setHold} />
        <Field label="Cresc. EBITDA (dec.)" value={growth} onChange={setGrowth} step={0.01} />
        <Field label="Dívida sênior (x)" value={seniorTurns} onChange={setSeniorTurns} step={0.5} />
        <Field label="Taxa sênior (dec.)" value={seniorRate} onChange={setSeniorRate} step={0.01} />
        <Field label="Imposto (dec.)" value={tax} onChange={setTax} step={0.01} />
      </div>
      <div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <div className="text-[11px] uppercase tracking-wider text-ink-6">MOIC</div>
            <div className="text-[28px] font-semibold text-accent">{brl(r.moic)}x</div>
          </div>
          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <div className="text-[11px] uppercase tracking-wider text-ink-6">TIR (IRR)</div>
            <div className="text-[28px] font-semibold text-success">{pct(r.irr)}</div>
          </div>
        </div>
        <div className="mt-4 p-4 rounded-xl border border-border-card bg-surface">
          <Row k="EV de entrada" v={brl(r.entryEV)} />
          <Row k="Dívida na entrada" v={brl(r.totalDebtAtEntry)} />
          <Row k="Cheque do sponsor (equity)" v={brl(r.sponsorEquity)} strong />
          <Row k="EV de saída" v={brl(r.exitEV)} />
          <Row k="Dívida líquida na saída" v={brl(r.exitNetDebt)} />
          <Row k="Proceeds do sponsor" v={brl(r.sponsorExitProceeds)} strong />
        </div>
        <div className="mt-4 p-4 rounded-xl border border-border-card bg-surface">
          <h3 className="text-[12px] font-semibold text-ink-1 mb-3">Atribuição de retorno (bridge de equity value)</h3>
          <ReturnsWaterfall steps={waterfall} />
        </div>
      </div>
    </div>
  )
}

function DcfPanel() {
  const [fcff, setFcff] = useState('12, 14, 16, 18, 20')
  const [wacc, setWacc] = useState(0.145)
  const [g, setG] = useState(0.03)
  const [netDebt, setNetDebt] = useState(30)
  const [shares, setShares] = useState(10)

  const parsed = fcff.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n))
  const r = useMemo(() => {
    try { return dcf({ fcff: parsed, discountRate: wacc, terminalGrowth: g, netDebt, sharesOutstanding: shares }) }
    catch (e) { return { error: e instanceof Error ? e.message : 'erro' } as const }
  }, [fcff, wacc, g, netDebt, shares])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
      <div className="grid grid-cols-1 gap-3 content-start">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-ink-6 mb-1">FCFF por ano (vírgula)</span>
          <input value={fcff} onChange={e => setFcff(e.target.value)}
            className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="WACC (dec.)" value={wacc} onChange={setWacc} step={0.005} />
          <Field label="g perpétuo (dec.)" value={g} onChange={setG} step={0.005} />
          <Field label="Dívida líquida" value={netDebt} onChange={setNetDebt} step={5} />
          <Field label="Ações" value={shares} onChange={setShares} />
        </div>
      </div>
      <div className="p-4 rounded-xl border border-border-card bg-surface">
        {'error' in r ? (
          <p className="text-[13px] text-[#B4462F]">{r.error}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div><div className="text-[10px] uppercase tracking-wider text-ink-6">Enterprise Value</div><div className="text-[20px] font-semibold text-accent">{brl(r.enterpriseValue)}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-ink-6">Equity</div><div className="text-[20px] font-semibold text-ink-0">{r.equityValue != null ? brl(r.equityValue) : '—'}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-ink-6">Por ação</div><div className="text-[20px] font-semibold text-success">{r.valuePerShare != null ? brl(r.valuePerShare) : '—'}</div></div>
            </div>
            <Row k="PV dos fluxos explícitos" v={brl(r.pvExplicit)} />
            <Row k="Valor terminal (nominal)" v={brl(r.terminalValue)} />
            <Row k="PV do valor terminal" v={brl(r.pvTerminal)} />
            <div className="mt-3 text-[10.5px] text-ink-6 font-mono leading-relaxed">{r.steps.join(' · ')}</div>
          </>
        )}
      </div>
    </div>
  )
}

function CompsPanel() {
  const [metricName, setMetricName] = useState('EBITDA')
  const [metricValue, setMetricValue] = useState(100)
  const [peers, setPeers] = useState('8, 10, 12, 14')
  const [dcfLow, setDcfLow] = useState(900)
  const [dcfHigh, setDcfHigh] = useState(1200)

  const multiples = peers.split(',').map(s => Number(s.trim())).filter(Number.isFinite)
  const iv = useMemo(() => impliedValuation(metricName, metricValue, multiples), [metricName, metricValue, peers])
  const ff = useMemo(() => footballField([
    { method: 'Comps', low: iv.low, base: iv.base, high: iv.high },
    { method: 'DCF', low: dcfLow, base: (dcfLow + dcfHigh) / 2, high: dcfHigh },
  ]), [iv, dcfLow, dcfHigh])

  const bands = [
    { method: `Comps (${metricName})`, low: iv.low, base: iv.base, high: iv.high },
    { method: 'DCF', low: dcfLow, base: (dcfLow + dcfHigh) / 2, high: dcfHigh },
    { method: 'Consenso', low: ff.overallLow, base: ff.overallBase, high: ff.overallHigh, highlight: true },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
      <div className="grid grid-cols-2 gap-3 content-start">
        <label className="block col-span-2">
          <span className="block text-[10px] uppercase tracking-wider text-ink-6 mb-1">Múltiplos dos pares (vírgula)</span>
          <input value={peers} onChange={e => setPeers(e.target.value)}
            className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
        </label>
        <Field label="Métrica-alvo" value={metricValue} onChange={setMetricValue} step={10} />
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-ink-6 mb-1">Nome métrica</span>
          <input value={metricName} onChange={e => setMetricName(e.target.value)}
            className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
        </label>
        <Field label="DCF low" value={dcfLow} onChange={setDcfLow} step={50} />
        <Field label="DCF high" value={dcfHigh} onChange={setDcfHigh} step={50} />
      </div>
      <div className="p-5 rounded-xl border border-border-card bg-surface">
        <h3 className="text-[13px] font-semibold text-ink-1 mb-4">Football field — faixas de valuation (EV)</h3>
        <FootballField bands={bands} />
      </div>
    </div>
  )
}

function AccretionPanel() {
  const [aNI, setANI] = useState(100)
  const [aShares, setAShares] = useState(100)
  const [aPrice, setAPrice] = useState(20)
  const [tNI, setTNI] = useState(20)
  const [offer, setOffer] = useState(200)
  const [cashPct, setCashPct] = useState(0.5)
  const [rate, setRate] = useState(0.12)
  const [tax, setTax] = useState(0.34)
  const [syn, setSyn] = useState(10)

  const r = useMemo(() => accretionDilution({
    acquirerNetIncome: aNI, acquirerShares: aShares, acquirerSharePrice: aPrice,
    targetNetIncome: tNI, offerValue: offer, cashPct, cashFinancingRate: rate, taxRate: tax, preTaxSynergies: syn,
  }), [aNI, aShares, aPrice, tNI, offer, cashPct, rate, tax, syn])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
      <div className="grid grid-cols-2 gap-3 content-start">
        <Field label="Lucro adquirente" value={aNI} onChange={setANI} step={10} />
        <Field label="Ações adquirente" value={aShares} onChange={setAShares} step={10} />
        <Field label="Preço ação adq." value={aPrice} onChange={setAPrice} />
        <Field label="Lucro alvo" value={tNI} onChange={setTNI} step={5} />
        <Field label="Oferta (equity)" value={offer} onChange={setOffer} step={10} />
        <Field label="% caixa (dec.)" value={cashPct} onChange={setCashPct} step={0.1} />
        <Field label="Custo caixa (dec.)" value={rate} onChange={setRate} step={0.01} />
        <Field label="Imposto (dec.)" value={tax} onChange={setTax} step={0.01} />
        <Field label="Sinergias pré-imp." value={syn} onChange={setSyn} step={5} />
      </div>
      <div>
        <div className={`p-4 rounded-xl border ${r.verdict === 'accretive' ? 'border-success/40 bg-success-bg' : r.verdict === 'dilutive' ? 'border-[#B4462F]/30 bg-[#FBEAE5]' : 'border-border-card bg-surface'}`}>
          <div className="text-[11px] uppercase tracking-wider text-ink-6">Veredito</div>
          <div className="text-[26px] font-semibold" style={{ color: r.verdict === 'accretive' ? '#1F9D6B' : r.verdict === 'dilutive' ? '#B4462F' : '#0F141A' }}>
            {r.verdict === 'accretive' ? 'Accretive' : r.verdict === 'dilutive' ? 'Dilutive' : 'Neutro'} {pct(r.accretionDilution)}
          </div>
        </div>
        <div className="mt-4 p-4 rounded-xl border border-border-card bg-surface">
          <Row k="EPS do adquirente" v={brl(r.acquirerEPS)} />
          <Row k="EPS pró-forma" v={brl(r.proFormaEPS)} strong />
          <Row k="Novas ações emitidas" v={brl(r.newSharesIssued)} />
          <Row k="Lucro pró-forma" v={brl(r.proFormaNetIncome)} />
          <Row k="Sinergia de breakeven (pré-imp.)" v={brl(r.breakevenPreTaxSynergies)} strong />
        </div>
      </div>
    </div>
  )
}

function SensitivityPanel() {
  // Sensibilidade do EV (DCF) a WACC × g — heatmap 2D — e tornado dos drivers.
  const [fcffN, setFcffN] = useState(16)
  const [baseWacc, setBaseWacc] = useState(0.145)
  const [baseG, setBaseG] = useState(0.03)

  const evAt = (wacc: number, g: number) => {
    try { return dcf({ fcff: [fcffN, fcffN, fcffN, fcffN, fcffN], discountRate: wacc, terminalGrowth: g }).enterpriseValue }
    catch { return NaN }
  }
  const waccs = [baseWacc - 0.02, baseWacc - 0.01, baseWacc, baseWacc + 0.01, baseWacc + 0.02]
  const gs = [baseG - 0.02, baseG - 0.01, baseG, baseG + 0.01, baseG + 0.02].filter(g => g < baseWacc - 0.01)

  const heat = useMemo(() => dataTable2D('WACC', waccs, 'g', gs, (w, g) => evAt(w, g)),
    [fcffN, baseWacc, baseG]) // eslint-disable-line react-hooks/exhaustive-deps

  const baseEv = evAt(baseWacc, baseG)
  const torn = useMemo(() => tornado(baseEv, [
    { name: 'WACC ±2pp', low: () => evAt(baseWacc + 0.02, baseG), high: () => evAt(baseWacc - 0.02, baseG) },
    { name: 'g ±1pp', low: () => evAt(baseWacc, baseG - 0.01), high: () => evAt(baseWacc, baseG + 0.01) },
    { name: 'FCFF ±20%', low: () => dcf({ fcff: Array(5).fill(fcffN * 0.8), discountRate: baseWacc, terminalGrowth: baseG }).enterpriseValue, high: () => dcf({ fcff: Array(5).fill(fcffN * 1.2), discountRate: baseWacc, terminalGrowth: baseG }).enterpriseValue },
  ]), [fcffN, baseWacc, baseG]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
    <PanelNote
      what="Análise de sensibilidade — mede quão frágil é o valuation às premissas."
      use="O mapa de calor mostra o Enterprise Value para cada combinação de WACC × crescimento perpétuo (verde = maior valor); o tornado ranqueia os drivers pelo impacto isolado no EV. Use para identificar a qual premissa a tese é mais exposta antes de defender o número no comitê." />
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
      <div className="grid grid-cols-1 gap-3 content-start">
        <Field label="FCFF/ano (constante)" value={fcffN} onChange={setFcffN} step={1} />
        <Field label="WACC base (dec.)" value={baseWacc} onChange={setBaseWacc} step={0.005} />
        <Field label="g base (dec.)" value={baseG} onChange={setBaseG} step={0.005} />
      </div>
      <div className="space-y-4">
        <div className="p-5 rounded-xl border border-border-card bg-surface">
          <h3 className="text-[13px] font-semibold text-ink-1 mb-3">Heatmap de sensibilidade — EV por WACC × g</h3>
          <SensitivityHeatmap table={heat} fmtAxis={(n) => `${(n * 100).toFixed(1)}%`} />
        </div>
        <div className="p-5 rounded-xl border border-border-card bg-surface">
          <h3 className="text-[13px] font-semibold text-ink-1 mb-3">Tornado — impacto dos drivers no EV</h3>
          <TornadoChart data={torn} />
        </div>
      </div>
    </div>
    </div>
  )
}

function ScenariosPanel() {
  const [ebitda, setEbitda] = useState(100)
  const [entryX, setEntryX] = useState(10)
  const [exitX, setExitX] = useState(11)
  const [hold, setHold] = useState(5)
  const [growth, setGrowth] = useState(0.08)
  const [hurdle, setHurdle] = useState(0.25)

  const baseLbo = {
    entryEbitda: ebitda, entryMultiple: entryX, exitMultiple: exitX, holdYears: hold, ebitdaGrowth: growth,
    taxRate: 0.34, capexPctOfEbitda: 0.15, daPctOfEbitda: 0.1,
    tranches: [{ name: 'Sênior', turns: 4, rate: 0.14, mandatoryAmortPct: 0.05 }],
  }
  const scen = useMemo(() => runLboScenarios(baseLbo, DEFAULT_SCENARIOS), [ebitda, entryX, exitX, hold, growth]) // eslint-disable-line react-hooks/exhaustive-deps
  // Monte Carlo da TIR: crescimento triangular e múltiplo de saída triangular em torno do base.
  const mc = useMemo(() => runMonteCarloLbo(baseLbo, [
    { key: 'growth', dist: 'triangular', params: [growth - 0.1, growth, growth + 0.1] },
    { key: 'exitMultiple', dist: 'triangular', params: [-1.5, 0, 1.5] },
  ], { runs: 4000, seed: 42, hurdle }), [ebitda, entryX, exitX, hold, growth, hurdle]) // eslint-disable-line react-hooks/exhaustive-deps

  const dist = { bins: mc.bins, p10: mc.p10, p50: mc.p50, p90: mc.p90, hurdle, isPct: true }
  const scenColor: Record<string, string> = { bear: '#B4462F', base: '#0B3A78', bull: '#1F9D6B' }

  return (
    <div>
    <PanelNote
      what="Cenários + Monte Carlo — sai da estimativa pontual para a distribuição de retornos."
      use="Os três cartões mostram a TIR/MOIC em cenários pessimista/base/otimista (choques de crescimento e múltiplo de saída). O histograma roda milhares de simulações variando os drivers e reporta P10/P50/P90 e a probabilidade de superar o hurdle da tese. A mesma semente reproduz o resultado — é auditável. Ajuste o hurdle para a TIR mínima exigida pelo fundo." />
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
      <div className="grid grid-cols-2 gap-3 content-start">
        <Field label="EBITDA entrada" value={ebitda} onChange={setEbitda} step={10} />
        <Field label="Múlt. entrada" value={entryX} onChange={setEntryX} step={0.5} />
        <Field label="Múlt. saída" value={exitX} onChange={setExitX} step={0.5} />
        <Field label="Hold (anos)" value={hold} onChange={setHold} />
        <Field label="Cresc. base" value={growth} onChange={setGrowth} step={0.01} />
        <Field label="Hurdle TIR" value={hurdle} onChange={setHurdle} step={0.01} />
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {scen.map(s => (
            <div key={s.name} className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider" style={{ color: scenColor[s.name] }}>{s.label}</div>
              <div className="text-[22px] font-semibold text-ink-0">{pct(s.irr)}</div>
              <div className="text-[11px] text-ink-5">MOIC {brl(s.moic)}x</div>
            </div>
          ))}
        </div>
        <div className="p-5 rounded-xl border border-border-card bg-surface">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-ink-1">Distribuição de TIR — Monte Carlo ({mc.n.toLocaleString('pt-BR')} simulações)</h3>
            <span className="text-[12px] font-medium" style={{ color: mc.probAboveHurdle != null && mc.probAboveHurdle >= 0.5 ? '#1F9D6B' : '#C77800' }}>
              {mc.probAboveHurdle != null ? `${(mc.probAboveHurdle * 100).toFixed(0)}% de chance de superar o hurdle` : ''}
            </span>
          </div>
          <DistributionChart data={dist} />
          <p className="mt-2 text-[11px] text-ink-6">P10 {pct(mc.p10)} · P50 {pct(mc.p50)} · P90 {pct(mc.p90)} — mesma semente reproduz o mesmo resultado (auditável).</p>
        </div>
      </div>
    </div>
    </div>
  )
}

export default function ModelagemPage() {
  const [tab, setTab] = useState<Tab>('lbo')
  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Calculator size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">Workbench de Modelagem</h1>
              <p className="text-[12.5px] text-ink-5">Motor determinístico — LBO, DCF, comparáveis e accretion/dilution. Os mesmos cálculos que os agentes usam no chat.</p>
            </div>
          </div>

          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
            <Info size={15} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-ink-3 leading-relaxed">
              <strong>Sobre o que este workbench calcula:</strong> os valores abaixo partem de <strong>premissas de exemplo</strong>,
              editáveis em todos os campos — é um <em>sandbox</em> de modelagem, não um deal específico. Ajuste os inputs para o seu caso.
              As premissas de mercado sugeridas (múltiplos, betas, alavancagem, custo de dívida) vêm da <strong>base proprietária calibrada da firma</strong>,
              com fonte e data. Para modelar um deal real do pipeline com os números já extraídos, abra o deal em{' '}
              <a href="/projetos" className="text-accent underline">Projetos</a> e use o workbench a partir dele. O motor é o mesmo em ambos —
              exato e auditável (cada resultado mostra a fórmula).
            </p>
          </div>

          <div className="flex gap-1 mb-5 border-b border-border-div">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-accent text-accent' : 'border-transparent text-ink-5 hover:text-ink-3'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {tab === 'lbo' && <LboPanel />}
          {tab === 'dcf' && <DcfPanel />}
          {tab === 'comps' && <CompsPanel />}
          {tab === 'accretion' && <AccretionPanel />}
          {tab === 'sensibilidade' && <SensitivityPanel />}
          {tab === 'cenarios' && <ScenariosPanel />}
        </div>
      </main>
    </div>
  )
}

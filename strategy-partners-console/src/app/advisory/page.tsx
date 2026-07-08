'use client'
import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { NavSidebar } from '@/components/NavSidebar'
import { Landmark, Scale, LineChart, Info, type LucideIcon } from 'lucide-react'
import {
  amortizationSchedule,
  coverageRatios,
  covenantHeadroom,
  compareRefinancing,
  type AmortizationType,
} from '@/lib/finance/debtRestructuring'
import { roicWaccSpread, capitalAllocation, valueDrivers } from '@/lib/finance/valueCreation'
import { projectFinancials, runPlanScenarios, DEFAULT_LRP_SCENARIOS } from '@/lib/finance/longRangePlan'
import { BarComparison } from '@/components/charts/BarComparison'
import { fmtCompact } from '@/components/charts/chartUtils'

const brl = (n: number) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—')
const pct = (n: number | null | undefined, d = 1) => (n == null || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(d)}%`)

type Tab = 'divida' | 'revisao' | 'planejamento'
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'divida', label: 'Reestruturação de dívida', icon: Landmark },
  { key: 'revisao', label: 'Revisão estratégica', icon: Scale },
  { key: 'planejamento', label: 'Planejamento LP', icon: LineChart },
]
const isTab = (v: string | null): v is Tab => v === 'divida' || v === 'revisao' || v === 'planejamento'

function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-ink-6 mb-1">{label}</span>
      <input type="number" value={value} step={step} onChange={e => onChange(Number(e.target.value))}
        className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
    </label>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-ink-6 mb-1">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
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

// ── Aba 1: Reestruturação de dívida ─────────────────────────────────────────
function DebtPanel() {
  const [principal, setPrincipal] = useState(1000)
  const [curRate, setCurRate] = useState(0.16)
  const [curYears, setCurYears] = useState(5)
  const [curType, setCurType] = useState<AmortizationType>('french')
  const [propRate, setPropRate] = useState(0.115)
  const [propYears, setPropYears] = useState(7)
  const [propType, setPropType] = useState<AmortizationType>('french')
  const [ebitda, setEbitda] = useState(360)
  const [netDebt, setNetDebt] = useState(1000)
  const [maxLev, setMaxLev] = useState(3.0)
  const [minCov, setMinCov] = useState(1.25)

  const current = { principal, rate: curRate, years: curYears, type: curType }
  const proposed = { principal, rate: propRate, years: propYears, type: propType }

  const curSched = useMemo(() => amortizationSchedule(principal, curRate, curYears, curType), [principal, curRate, curYears, curType])
  const refi = useMemo(() => compareRefinancing(current, proposed), [principal, curRate, curYears, curType, propRate, propYears, propType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cobertura usa o serviço do ano 1 de cada estrutura.
  const cov = useMemo(() => {
    const y1cur = curSched.rows[0]
    return coverageRatios({ ebitda, debtService: y1cur?.payment ?? 0, interest: y1cur?.interest ?? 0 })
  }, [ebitda, curSched])

  const covenant = useMemo(() => covenantHeadroom({ netDebt, ebitda, maxLeverage: maxLev, minCoverage: minCov, actualCoverage: cov.dscr }),
    [netDebt, ebitda, maxLev, minCov, cov.dscr])

  // Comparativo de serviço anual: atual vs proposto (barras).
  const serviceRows = [
    { label: 'Serviço 1º ano', a: refi.current.firstYearService, b: refi.proposed.firstYearService },
    { label: 'Serviço médio/ano', a: refi.current.averageAnnualService, b: refi.proposed.averageAnnualService },
    { label: 'Juros totais (vida)', a: refi.current.totalInterest, b: refi.proposed.totalInterest },
  ]

  const verdictColor = refi.verdict === 'refinanciar' ? '#1F9D6B' : refi.verdict === 'manter' ? '#B4462F' : '#0F141A'

  return (
    <div>
      <PanelNote
        what="Reestruturação de dívida — desenha a tabela de amortização, testa cobertura e covenants e compara refinanciamento."
        use="Escolha o sistema de amortização (bullet, linear/SAC ou francês/Price) e as taxas. O painel calcula DSCR/ICR, a folga de covenants (alavancagem e cobertura, com flag de quebra) e o VPL da economia de juros da proposta vs. a dívida atual. Use para defender um pedido de waiver ou uma tese de refinanciamento junto ao credor." />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        <div className="grid grid-cols-2 gap-3 content-start">
          <Field label="Principal" value={principal} onChange={setPrincipal} step={50} />
          <Field label="EBITDA anual" value={ebitda} onChange={setEbitda} step={20} />
          <div className="col-span-2 mt-1 text-[10px] uppercase tracking-wider text-ink-6 font-semibold">Dívida atual</div>
          <Field label="Taxa atual (dec.)" value={curRate} onChange={setCurRate} step={0.005} />
          <Field label="Prazo atual (anos)" value={curYears} onChange={setCurYears} />
          <SelectField label="Sistema atual" value={curType} onChange={v => setCurType(v as AmortizationType)}
            options={[{ v: 'french', l: 'Francês (Price)' }, { v: 'linear', l: 'Linear (SAC)' }, { v: 'bullet', l: 'Bullet' }]} />
          <div className="col-span-2 mt-1 text-[10px] uppercase tracking-wider text-ink-6 font-semibold">Proposta</div>
          <Field label="Taxa proposta (dec.)" value={propRate} onChange={setPropRate} step={0.005} />
          <Field label="Prazo proposto (anos)" value={propYears} onChange={setPropYears} />
          <SelectField label="Sistema proposto" value={propType} onChange={v => setPropType(v as AmortizationType)}
            options={[{ v: 'french', l: 'Francês (Price)' }, { v: 'linear', l: 'Linear (SAC)' }, { v: 'bullet', l: 'Bullet' }]} />
          <div className="col-span-2 mt-1 text-[10px] uppercase tracking-wider text-ink-6 font-semibold">Covenants</div>
          <Field label="Dívida líquida" value={netDebt} onChange={setNetDebt} step={50} />
          <Field label="Teto alavancagem (x)" value={maxLev} onChange={setMaxLev} step={0.25} />
          <Field label="Piso cobertura (x)" value={minCov} onChange={setMinCov} step={0.05} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">DSCR (ano 1)</div>
              <div className="text-[24px] font-semibold text-accent">{Number.isFinite(cov.dscr) ? `${cov.dscr.toFixed(2)}x` : '∞'}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">ICR (ano 1)</div>
              <div className="text-[24px] font-semibold text-ink-0">{Number.isFinite(cov.icr) ? `${cov.icr.toFixed(2)}x` : '∞'}</div>
            </div>
            <div className={`p-4 rounded-xl border ${covenant.anyBreach ? 'border-[#B4462F]/30 bg-[#FBEAE5]' : 'border-success/40 bg-success-bg'}`}>
              <div className="text-[11px] uppercase tracking-wider text-ink-6">Alavancagem</div>
              <div className="text-[24px] font-semibold" style={{ color: covenant.anyBreach ? '#B4462F' : '#1F9D6B' }}>{covenant.actualLeverage.toFixed(2)}x</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <div className="text-[11px] uppercase tracking-wider text-ink-6 mb-1">Veredito do refinanciamento</div>
            <div className="text-[22px] font-semibold" style={{ color: verdictColor }}>
              {refi.verdict === 'refinanciar' ? 'Refinanciar' : refi.verdict === 'manter' ? 'Manter dívida atual' : 'Indiferente'}
            </div>
            <Row k="VPL da economia de juros" v={brl(refi.npvInterestSavings)} strong />
            <Row k="Juros totais economizados" v={brl(refi.totalInterestSaved)} />
            <Row k="Δ custo all-in (nominal)" v={brl(refi.allInCostDelta)} />
            <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">{refi.note}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">Serviço da dívida — atual vs. proposta</h3>
            <BarComparison rows={serviceRows} seriesA="Atual" seriesB="Proposta" fmt={fmtCompact} />
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-2">Tabela de amortização — dívida atual ({curSched.formula})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] font-mono">
                <thead>
                  <tr className="text-ink-6 text-left">
                    <th className="py-1 pr-2 font-medium">Ano</th>
                    <th className="py-1 pr-2 font-medium text-right">Saldo inicial</th>
                    <th className="py-1 pr-2 font-medium text-right">Juros</th>
                    <th className="py-1 pr-2 font-medium text-right">Amortização</th>
                    <th className="py-1 pr-2 font-medium text-right">Prestação</th>
                    <th className="py-1 font-medium text-right">Saldo final</th>
                  </tr>
                </thead>
                <tbody>
                  {curSched.rows.map(r => (
                    <tr key={r.year} className="border-t border-border-soft text-ink-3">
                      <td className="py-1 pr-2">{r.year}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.beginningBalance)}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.interest)}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.principalPayment)}</td>
                      <td className="py-1 pr-2 text-right text-ink-1 font-semibold">{brl(r.payment)}</td>
                      <td className="py-1 text-right">{brl(r.endingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-ink-6">{cov.note}</p>
            <p className="mt-1 text-[11px] text-ink-6">{covenant.note}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Aba 2: Revisão estratégica ──────────────────────────────────────────────
function ReviewPanel() {
  const [nopat, setNopat] = useState(200)
  const [revenue, setRevenue] = useState(2000)
  const [investedCapital, setInvestedCapital] = useState(1000)
  const [wacc, setWacc] = useState(0.12)
  const [growth, setGrowth] = useState(0.05)

  const spread = useMemo(() => roicWaccSpread({ nopat, investedCapital, wacc }), [nopat, investedCapital, wacc])
  const alloc = useMemo(() => capitalAllocation({ roic: spread.roic, wacc, growthRate: growth }), [spread.roic, wacc, growth])
  const drivers = useMemo(() => valueDrivers({ nopat, revenue, investedCapital, wacc }), [nopat, revenue, investedCapital, wacc])

  const verdictColor = spread.verdict === 'cria' ? '#1F9D6B' : spread.verdict === 'destroi' ? '#B4462F' : '#0F141A'

  // Barras: ROIC vs WACC (escala em %). Reusa BarComparison em pontos percentuais.
  const spreadRows = [{ label: 'ROIC vs. WACC', a: wacc * 100, b: spread.roic * 100 }]

  return (
    <div>
      <PanelNote
        what="Revisão estratégica — mede se o negócio cria ou destrói valor (ROIC vs. WACC) e orienta a alocação de capital."
        use="Informe NOPAT, capital investido, receita e WACC. O painel calcula o spread ROIC−WACC, o EVA (economic profit), decompõe o ROIC em margem × giro (DuPont) e recomenda reinvestir, recomprar ou desalavancar conforme o spread e o crescimento. Use para embasar a tese de alocação de capital no board." />
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        <div className="grid grid-cols-2 gap-3 content-start">
          <Field label="NOPAT" value={nopat} onChange={setNopat} step={10} />
          <Field label="Receita" value={revenue} onChange={setRevenue} step={100} />
          <Field label="Capital investido" value={investedCapital} onChange={setInvestedCapital} step={100} />
          <Field label="WACC (dec.)" value={wacc} onChange={setWacc} step={0.005} />
          <Field label="Crescimento (dec.)" value={growth} onChange={setGrowth} step={0.01} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">ROIC</div>
              <div className="text-[24px] font-semibold text-accent">{pct(spread.roic)}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">Spread</div>
              <div className="text-[24px] font-semibold" style={{ color: verdictColor }}>{pct(spread.spread)}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">EVA</div>
              <div className="text-[24px] font-semibold text-ink-0">{brl(spread.eva)}</div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${spread.verdict === 'cria' ? 'border-success/40 bg-success-bg' : spread.verdict === 'destroi' ? 'border-[#B4462F]/30 bg-[#FBEAE5]' : 'border-border-card bg-surface'}`}>
            <div className="text-[11px] uppercase tracking-wider text-ink-6">Veredito</div>
            <div className="text-[22px] font-semibold" style={{ color: verdictColor }}>
              {spread.verdict === 'cria' ? 'Cria valor' : spread.verdict === 'destroi' ? 'Destrói valor' : 'Neutro'}
            </div>
            <p className="mt-1 text-[11px] text-ink-6 leading-relaxed">{spread.note}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">ROIC vs. WACC (pontos percentuais)</h3>
            <BarComparison rows={spreadRows} seriesA="WACC" seriesB="ROIC" fmt={(n) => `${n.toFixed(1)}%`} />
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-2">Alocação de capital recomendada</h3>
            <div className="text-[18px] font-semibold text-accent capitalize">{alloc.recommendation}</div>
            <p className="mt-1 text-[11px] text-ink-6 leading-relaxed">{alloc.rationale}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">Decomposição DuPont do ROIC</h3>
            <Row k="Margem NOPAT" v={pct(drivers.nopatMargin)} />
            <Row k="Giro de capital" v={`${drivers.capitalTurnover.toFixed(2)}x`} />
            <Row k="ROIC (margem × giro)" v={pct(drivers.roic)} strong />
            <Row k="Lucro econômico (EVA)" v={brl(drivers.economicProfit)} />
            <p className="mt-2 text-[11px] text-ink-6">{drivers.note}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Aba 3: Planejamento de longo prazo ──────────────────────────────────────
function PlanPanel() {
  const [revenue0, setRevenue0] = useState(1000)
  const [years, setYears] = useState(5)
  const [growth, setGrowth] = useState(0.1)
  const [margin, setMargin] = useState(0.25)
  const [capexPct, setCapexPct] = useState(0.08)
  const [nwcPct, setNwcPct] = useState(0.15)
  const [tax, setTax] = useState(0.34)

  const base = { revenue0, years, revenueGrowth: growth, ebitdaMargin: margin, capexPctRevenue: capexPct, nwcPctRevenue: nwcPct, taxRate: tax }
  const proj = useMemo(() => projectFinancials(base), [revenue0, years, growth, margin, capexPct, nwcPct, tax]) // eslint-disable-line react-hooks/exhaustive-deps
  const scenarios = useMemo(() => runPlanScenarios(base, DEFAULT_LRP_SCENARIOS), [revenue0, years, growth, margin, capexPct, nwcPct, tax]) // eslint-disable-line react-hooks/exhaustive-deps

  // Barras: receita vs. FCFF por ano.
  const rows = proj.rows.map(r => ({ label: `Ano ${r.year}`, a: r.revenue, b: r.fcff }))
  const scenColor: Record<string, string> = { bear: '#B4462F', base: '#0B3A78', bull: '#1F9D6B' }

  return (
    <div>
      <PanelNote
        what="Planejamento de longo prazo — projeta receita, EBITDA, capex, ΔNWC e FCFF ao longo do horizonte estratégico."
        use="Defina o crescimento, a margem EBITDA e as intensidades de capex e capital de giro. O painel projeta o FCFF ano a ano (FCFF = EBIT·(1−T) + D&A − capex − ΔNWC), acumula o caixa livre e roda cenários pessimista/base/otimista. Use para dimensionar capacidade de investimento, necessidade de captação e o valor sustentado pelo plano." />
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        <div className="grid grid-cols-2 gap-3 content-start">
          <Field label="Receita ano-base" value={revenue0} onChange={setRevenue0} step={100} />
          <Field label="Horizonte (anos)" value={years} onChange={setYears} />
          <Field label="Crescimento (dec.)" value={growth} onChange={setGrowth} step={0.01} />
          <Field label="Margem EBITDA (dec.)" value={margin} onChange={setMargin} step={0.01} />
          <Field label="Capex/Receita (dec.)" value={capexPct} onChange={setCapexPct} step={0.01} />
          <Field label="NWC/Receita (dec.)" value={nwcPct} onChange={setNwcPct} step={0.01} />
          <Field label="Imposto (dec.)" value={tax} onChange={setTax} step={0.01} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">FCFF acumulado</div>
              <div className="text-[24px] font-semibold text-accent">{brl(proj.cumulativeFcff)}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">CAGR receita</div>
              <div className="text-[24px] font-semibold text-success">{pct(proj.revenueCagr)}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">Receita final</div>
              <div className="text-[24px] font-semibold text-ink-0">{brl(proj.rows.length ? proj.rows[proj.rows.length - 1].revenue : revenue0)}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">Receita vs. FCFF por ano</h3>
            <BarComparison rows={rows} seriesA="Receita" seriesB="FCFF" fmt={fmtCompact} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {scenarios.map(s => (
              <div key={s.name} className="p-4 rounded-xl border border-border-card bg-surface">
                <div className="text-[11px] uppercase tracking-wider" style={{ color: scenColor[s.name] }}>{s.label}</div>
                <div className="text-[20px] font-semibold text-ink-0">{brl(s.cumulativeFcff)}</div>
                <div className="text-[11px] text-ink-5">CAGR {pct(s.revenueCagr)}</div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-2">Projeção plurianual ({proj.formula})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] font-mono">
                <thead>
                  <tr className="text-ink-6 text-left">
                    <th className="py-1 pr-2 font-medium">Ano</th>
                    <th className="py-1 pr-2 font-medium text-right">Receita</th>
                    <th className="py-1 pr-2 font-medium text-right">EBITDA</th>
                    <th className="py-1 pr-2 font-medium text-right">Capex</th>
                    <th className="py-1 pr-2 font-medium text-right">ΔNWC</th>
                    <th className="py-1 pr-2 font-medium text-right">FCFF</th>
                    <th className="py-1 font-medium text-right">FCFF acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {proj.rows.map(r => (
                    <tr key={r.year} className="border-t border-border-soft text-ink-3">
                      <td className="py-1 pr-2">{r.year}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.revenue)}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.ebitda)}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.capex)}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.nwcChange)}</td>
                      <td className="py-1 pr-2 text-right text-ink-1 font-semibold">{brl(r.fcff)}</td>
                      <td className="py-1 text-right">{brl(r.cumulativeFcff)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdvisoryWorkbench() {
  const searchParams = useSearchParams()
  const initial = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(isTab(initial) ? initial : 'divida')

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Scale size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">Assessoria Estratégica</h1>
              <p className="text-[12.5px] text-ink-5">Além do M&A — reestruturação de dívida, revisão estratégica e planejamento de longo prazo. Motor determinístico e auditável.</p>
            </div>
          </div>

          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
            <Info size={15} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-ink-3 leading-relaxed">
              <strong>Sobre este workbench:</strong> estende a plataforma da assessoria de fusões e aquisições para o
              ciclo completo de <strong>advisory estratégico</strong>. Todos os campos são <strong>premissas editáveis</strong> —
              um <em>sandbox</em> analítico, não um cliente específico. Cada resultado mostra a fórmula usada: o motor é
              exato e auditável (nunca &ldquo;a IA estimou&rdquo;).
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

          {tab === 'divida' && <DebtPanel />}
          {tab === 'revisao' && <ReviewPanel />}
          {tab === 'planejamento' && <PlanPanel />}
        </div>
      </main>
    </div>
  )
}

export default function AdvisoryPage() {
  return (
    <Suspense>
      <AdvisoryWorkbench />
    </Suspense>
  )
}

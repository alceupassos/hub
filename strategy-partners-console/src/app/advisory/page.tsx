'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { NavSidebar } from '@/components/NavSidebar'
import { Landmark, Scale, LineChart, Info, type LucideIcon } from 'lucide-react'
import {
  amortizationSchedule,
  coverageRatios,
  covenantHeadroom,
  compareRefinancing,
  debtWaterfall,
  dscrSchedule,
  breakEvenRate,
  type AmortizationType,
} from '@/lib/finance/debtRestructuring'
import { roicWaccSpread, capitalAllocation, valueDrivers, reinvestmentValue, sensitivityToWacc } from '@/lib/finance/valueCreation'
import { projectFinancials, runPlanScenarios, planValuation, fundingGap, breakEvenYear, DEFAULT_LRP_SCENARIOS } from '@/lib/finance/longRangePlan'
import { BarComparison } from '@/components/charts/BarComparison'
import { fmtCompact } from '@/components/charts/chartUtils'
import { useLang, type Lang } from '@/lib/lang'

const brl = (n: number) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—')
const pct = (n: number | null | undefined, d = 1) => (n == null || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(d)}%`)

type Tab = 'divida' | 'revisao' | 'planejamento'
const TABS: { key: Tab; icon: LucideIcon }[] = [
  { key: 'divida', icon: Landmark },
  { key: 'revisao', icon: Scale },
  { key: 'planejamento', icon: LineChart },
]
const tabLabels = (lang: Lang): Record<Tab, string> => lang === 'en'
  ? { divida: 'Debt restructuring', revisao: 'Strategic review', planejamento: 'LP planning' }
  : { divida: 'Reestruturação de dívida', revisao: 'Revisão estratégica', planejamento: 'Planejamento LP' }
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
  const { lang } = useLang()
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
  const [recoveryValue, setRecoveryValue] = useState(700)

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

  // Cascata de recuperação (distressed): a dívida modelada é a tranche sênior; o que
  // sobra da dívida líquida (netDebt − principal) entra como subordinada, pari passu abaixo.
  const waterfall = useMemo(() => {
    const subordinated = Math.max(0, netDebt - principal)
    const tranches = [
      { name: lang === 'en' ? 'Senior (modeled)' : 'Sênior (modelada)', amount: principal, seniority: 1, rate: curRate },
      ...(subordinated > 0 ? [{ name: lang === 'en' ? 'Subordinated' : 'Subordinada', amount: subordinated, seniority: 2, rate: curRate + 0.02 }] : []),
    ]
    return debtWaterfall(tranches, recoveryValue)
  }, [principal, netDebt, curRate, recoveryValue, lang])

  // DSCR ano a ano ao longo de toda a amortização atual (EBITDA constante = input, piso = covenant).
  const dscrSched = useMemo(() => {
    const ebitdaVec = new Array(curSched.rows.length).fill(ebitda)
    return dscrSchedule(ebitdaVec, curSched.rows, minCov)
  }, [curSched, ebitda, minCov])

  // Taxa de equilíbrio: maior taxa cujo serviço de pico cabe no teto acessível = EBITDA / piso de cobertura.
  const beRate = useMemo(() => {
    const cap = minCov <= 0 ? ebitda : ebitda / minCov
    return breakEvenRate(principal, curYears, curType, cap)
  }, [principal, curYears, curType, ebitda, minCov])

  const en = lang === 'en'
  const L = en
    ? {
        noteWhat: 'Debt restructuring — draws the amortization schedule, tests coverage and covenants and compares refinancing.',
        noteUse: 'Choose the amortization system (bullet, linear/SAC or French/Price) and the rates. The panel computes DSCR/ICR, covenant headroom (leverage and coverage, with a breach flag) and the NPV of the proposal’s interest savings vs. the current debt. Use it to defend a waiver request or a refinancing thesis with the lender.',
        fPrincipal: 'Principal', fEbitda: 'Annual EBITDA', gCurrent: 'Current debt', fCurRate: 'Current rate (dec.)', fCurYears: 'Current term (years)', fCurType: 'Current system',
        gProposal: 'Proposal', fPropRate: 'Proposed rate (dec.)', fPropYears: 'Proposed term (years)', fPropType: 'Proposed system',
        gCovenants: 'Covenants', fNetDebt: 'Net debt', fMaxLev: 'Leverage cap (x)', fMinCov: 'Coverage floor (x)', gDistressed: 'Distressed', fRecovery: 'Recovery value',
        optFrench: 'French (Price)', optLinear: 'Linear (SAC)', optBullet: 'Bullet',
        kDscr1: 'DSCR (year 1)', kIcr1: 'ICR (year 1)', kLeverage: 'Leverage',
        refiVerdictTitle: 'Refinancing verdict', vRefi: 'Refinance', vKeep: 'Keep current debt', vIndiff: 'Indifferent',
        rNpvSavings: 'NPV of interest savings', rTotalSaved: 'Total interest saved', rAllInDelta: 'Δ all-in cost (nominal)',
        svcTitle: 'Debt service — current vs. proposal', svcA: 'Current', svcB: 'Proposal',
        svc1: 'Year-1 service', svcAvg: 'Average service/year', svcTotal: 'Total interest (life)',
        amortTitle: (f: string) => `Amortization schedule — current debt (${f})`,
        thYear: 'Year', thOpenBal: 'Opening balance', thInterest: 'Interest', thAmort: 'Amortization', thPayment: 'Payment', thCloseBal: 'Closing balance',
        waterfallTitle: 'Recovery waterfall (distressed)',
        waterfallDesc: (
          <>
            Distributes the <strong>recovery value</strong> (liquidated EV/collateral) across creditors by seniority:
            the most senior tranche is repaid before the next receives anything. Adjust the recovery value to see the
            <em> fulcrum</em> and how much is left for equity.
          </>
        ),
        kTotalRecovery: 'Total recovery', kBlendedRecovery: 'Blended recovery', kResidualEquity: 'Residual to equity',
        thTranche: 'Tranche', thClaim: 'Claim', thRecovery: 'Recovery', thRecoveredPct: '% recovered', thShortfall: 'Shortfall',
        trSenior: 'Senior (modeled)', trSub: 'Subordinated',
        dscrTitle: 'Year-by-year DSCR',
        dscrDesc: (floor: string) => (
          <>
            Crosses EBITDA (constant = input) with each year’s debt service across the current amortization and flags the years
            that breach the covenant floor ({floor}x) — where cash tightens and the restructuring must act.
          </>
        ),
        kMinDscr: 'Minimum DSCR', yearWord: 'year', kYearsBelow: 'Years below floor',
        thEbitda: 'EBITDA', thService: 'Service',
        beTitle: 'Rate break-even',
        beDesc: (cap: string) => (
          <>
            Highest interest rate whose peak service still fits the affordable ceiling (EBITDA / coverage floor = {cap}).
            It is the ceiling of the refinancing request: &ldquo;up to what rate can this asset bear&rdquo;.
          </>
        ),
        kBeRate: 'Break-even rate', kPeakService: 'Peak service', kCurRate: 'Current rate',
      }
    : {
        noteWhat: 'Reestruturação de dívida — desenha a tabela de amortização, testa cobertura e covenants e compara refinanciamento.',
        noteUse: 'Escolha o sistema de amortização (bullet, linear/SAC ou francês/Price) e as taxas. O painel calcula DSCR/ICR, a folga de covenants (alavancagem e cobertura, com flag de quebra) e o VPL da economia de juros da proposta vs. a dívida atual. Use para defender um pedido de waiver ou uma tese de refinanciamento junto ao credor.',
        fPrincipal: 'Principal', fEbitda: 'EBITDA anual', gCurrent: 'Dívida atual', fCurRate: 'Taxa atual (dec.)', fCurYears: 'Prazo atual (anos)', fCurType: 'Sistema atual',
        gProposal: 'Proposta', fPropRate: 'Taxa proposta (dec.)', fPropYears: 'Prazo proposto (anos)', fPropType: 'Sistema proposto',
        gCovenants: 'Covenants', fNetDebt: 'Dívida líquida', fMaxLev: 'Teto alavancagem (x)', fMinCov: 'Piso cobertura (x)', gDistressed: 'Distressed', fRecovery: 'Valor de recuperação',
        optFrench: 'Francês (Price)', optLinear: 'Linear (SAC)', optBullet: 'Bullet',
        kDscr1: 'DSCR (ano 1)', kIcr1: 'ICR (ano 1)', kLeverage: 'Alavancagem',
        refiVerdictTitle: 'Veredito do refinanciamento', vRefi: 'Refinanciar', vKeep: 'Manter dívida atual', vIndiff: 'Indiferente',
        rNpvSavings: 'VPL da economia de juros', rTotalSaved: 'Juros totais economizados', rAllInDelta: 'Δ custo all-in (nominal)',
        svcTitle: 'Serviço da dívida — atual vs. proposta', svcA: 'Atual', svcB: 'Proposta',
        svc1: 'Serviço 1º ano', svcAvg: 'Serviço médio/ano', svcTotal: 'Juros totais (vida)',
        amortTitle: (f: string) => `Tabela de amortização — dívida atual (${f})`,
        thYear: 'Ano', thOpenBal: 'Saldo inicial', thInterest: 'Juros', thAmort: 'Amortização', thPayment: 'Prestação', thCloseBal: 'Saldo final',
        waterfallTitle: 'Cascata de recuperação (distressed)',
        waterfallDesc: (
          <>
            Distribui o <strong>valor de recuperação</strong> (EV/colateral liquidado) entre credores por senioridade:
            a tranche mais sênior é quitada antes de a próxima receber. Ajuste o valor de recuperação para ver quem é o
            <em> fulcro</em> e quanto sobra ao equity.
          </>
        ),
        kTotalRecovery: 'Recuperação total', kBlendedRecovery: 'Recuperação média', kResidualEquity: 'Resíduo ao equity',
        thTranche: 'Tranche', thClaim: 'Claim', thRecovery: 'Recuperação', thRecoveredPct: '% recuperado', thShortfall: 'Shortfall',
        trSenior: 'Sênior (modelada)', trSub: 'Subordinada',
        dscrTitle: 'DSCR ano a ano',
        dscrDesc: (floor: string) => (
          <>
            Cruza o EBITDA (constante = input) com o serviço da dívida de cada ano da amortização atual e sinaliza os anos
            que furam o piso de covenant ({floor}x) — é onde o caixa aperta e a reestruturação precisa atuar.
          </>
        ),
        kMinDscr: 'DSCR mínimo', yearWord: 'ano', kYearsBelow: 'Anos abaixo do piso',
        thEbitda: 'EBITDA', thService: 'Serviço',
        beTitle: 'Break-even da taxa',
        beDesc: (cap: string) => (
          <>
            Maior taxa de juros cujo serviço de pico ainda cabe no teto acessível (EBITDA / piso de cobertura = {cap}).
            É o teto do pedido de refinanciamento: &ldquo;até que taxa este ativo aguenta&rdquo;.
          </>
        ),
        kBeRate: 'Taxa de equilíbrio', kPeakService: 'Serviço de pico', kCurRate: 'Taxa atual',
      }

  // Comparativo de serviço anual: atual vs proposto (barras).
  const serviceRows = [
    { label: L.svc1, a: refi.current.firstYearService, b: refi.proposed.firstYearService },
    { label: L.svcAvg, a: refi.current.averageAnnualService, b: refi.proposed.averageAnnualService },
    { label: L.svcTotal, a: refi.current.totalInterest, b: refi.proposed.totalInterest },
  ]

  const verdictColor = refi.verdict === 'refinanciar' ? '#1F9D6B' : refi.verdict === 'manter' ? '#B4462F' : '#0F141A'

  return (
    <div>
      <PanelNote what={L.noteWhat} use={L.noteUse} />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        <div className="grid grid-cols-2 gap-3 content-start">
          <Field label={L.fPrincipal} value={principal} onChange={setPrincipal} step={50} />
          <Field label={L.fEbitda} value={ebitda} onChange={setEbitda} step={20} />
          <div className="col-span-2 mt-1 text-[10px] uppercase tracking-wider text-ink-6 font-semibold">{L.gCurrent}</div>
          <Field label={L.fCurRate} value={curRate} onChange={setCurRate} step={0.005} />
          <Field label={L.fCurYears} value={curYears} onChange={setCurYears} />
          <SelectField label={L.fCurType} value={curType} onChange={v => setCurType(v as AmortizationType)}
            options={[{ v: 'french', l: L.optFrench }, { v: 'linear', l: L.optLinear }, { v: 'bullet', l: L.optBullet }]} />
          <div className="col-span-2 mt-1 text-[10px] uppercase tracking-wider text-ink-6 font-semibold">{L.gProposal}</div>
          <Field label={L.fPropRate} value={propRate} onChange={setPropRate} step={0.005} />
          <Field label={L.fPropYears} value={propYears} onChange={setPropYears} />
          <SelectField label={L.fPropType} value={propType} onChange={v => setPropType(v as AmortizationType)}
            options={[{ v: 'french', l: L.optFrench }, { v: 'linear', l: L.optLinear }, { v: 'bullet', l: L.optBullet }]} />
          <div className="col-span-2 mt-1 text-[10px] uppercase tracking-wider text-ink-6 font-semibold">{L.gCovenants}</div>
          <Field label={L.fNetDebt} value={netDebt} onChange={setNetDebt} step={50} />
          <Field label={L.fMaxLev} value={maxLev} onChange={setMaxLev} step={0.25} />
          <Field label={L.fMinCov} value={minCov} onChange={setMinCov} step={0.05} />
          <div className="col-span-2 mt-1 text-[10px] uppercase tracking-wider text-ink-6 font-semibold">{L.gDistressed}</div>
          <Field label={L.fRecovery} value={recoveryValue} onChange={setRecoveryValue} step={50} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kDscr1}</div>
              <div className="text-[24px] font-semibold text-accent">{Number.isFinite(cov.dscr) ? `${cov.dscr.toFixed(2)}x` : '∞'}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kIcr1}</div>
              <div className="text-[24px] font-semibold text-ink-0">{Number.isFinite(cov.icr) ? `${cov.icr.toFixed(2)}x` : '∞'}</div>
            </div>
            <div className={`p-4 rounded-xl border ${covenant.anyBreach ? 'border-[#B4462F]/30 bg-[#FBEAE5]' : 'border-success/40 bg-success-bg'}`}>
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kLeverage}</div>
              <div className="text-[24px] font-semibold" style={{ color: covenant.anyBreach ? '#B4462F' : '#1F9D6B' }}>{covenant.actualLeverage.toFixed(2)}x</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <div className="text-[11px] uppercase tracking-wider text-ink-6 mb-1">{L.refiVerdictTitle}</div>
            <div className="text-[22px] font-semibold" style={{ color: verdictColor }}>
              {refi.verdict === 'refinanciar' ? L.vRefi : refi.verdict === 'manter' ? L.vKeep : L.vIndiff}
            </div>
            <Row k={L.rNpvSavings} v={brl(refi.npvInterestSavings)} strong />
            <Row k={L.rTotalSaved} v={brl(refi.totalInterestSaved)} />
            <Row k={L.rAllInDelta} v={brl(refi.allInCostDelta)} />
            <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">{refi.note}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">{L.svcTitle}</h3>
            <BarComparison rows={serviceRows} seriesA={L.svcA} seriesB={L.svcB} fmt={fmtCompact} />
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-2">{L.amortTitle(curSched.formula)}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] font-mono">
                <thead>
                  <tr className="text-ink-6 text-left">
                    <th className="py-1 pr-2 font-medium">{L.thYear}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thOpenBal}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thInterest}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thAmort}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thPayment}</th>
                    <th className="py-1 font-medium text-right">{L.thCloseBal}</th>
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

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-1">{L.waterfallTitle}</h3>
            <p className="text-[11px] text-ink-6 mb-3 leading-relaxed">{L.waterfallDesc}</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kTotalRecovery}</div>
                <div className="text-[18px] font-semibold text-accent">{brl(waterfall.totalRecovery)}</div>
              </div>
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kBlendedRecovery}</div>
                <div className="text-[18px] font-semibold text-ink-0">{pct(waterfall.blendedRecoveryPct)}</div>
              </div>
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kResidualEquity}</div>
                <div className="text-[18px] font-semibold text-success">{brl(waterfall.residual)}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] font-mono">
                <thead>
                  <tr className="text-ink-6 text-left">
                    <th className="py-1 pr-2 font-medium">{L.thTranche}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thClaim}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thRecovery}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thRecoveredPct}</th>
                    <th className="py-1 font-medium text-right">{L.thShortfall}</th>
                  </tr>
                </thead>
                <tbody>
                  {waterfall.tranches.map(t => (
                    <tr key={t.name} className="border-t border-border-soft text-ink-3">
                      <td className="py-1 pr-2 font-sans">{t.name}</td>
                      <td className="py-1 pr-2 text-right">{brl(t.claim)}</td>
                      <td className="py-1 pr-2 text-right text-ink-1 font-semibold">{brl(t.recovery)}</td>
                      <td className="py-1 pr-2 text-right" style={{ color: t.recoveryPct >= 1 - 1e-9 ? '#1F9D6B' : t.recoveryPct <= 1e-9 ? '#B4462F' : '#0F141A' }}>{pct(t.recoveryPct)}</td>
                      <td className="py-1 text-right">{brl(t.shortfall)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">{waterfall.note}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-1">{L.dscrTitle}</h3>
            <p className="text-[11px] text-ink-6 mb-3 leading-relaxed">{L.dscrDesc(minCov.toFixed(2))}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kMinDscr}</div>
                <div className="text-[18px] font-semibold" style={{ color: dscrSched.anyBelowFloor ? '#B4462F' : '#1F9D6B' }}>
                  {Number.isFinite(dscrSched.minDscr) ? `${dscrSched.minDscr.toFixed(2)}x` : '∞'}
                  {dscrSched.minDscrYear ? <span className="text-[11px] text-ink-6 font-normal"> · {L.yearWord} {dscrSched.minDscrYear}</span> : null}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kYearsBelow}</div>
                <div className="text-[18px] font-semibold text-ink-0">{dscrSched.yearsBelowFloor.length}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] font-mono">
                <thead>
                  <tr className="text-ink-6 text-left">
                    <th className="py-1 pr-2 font-medium">{L.thYear}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thEbitda}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thService}</th>
                    <th className="py-1 font-medium text-right">DSCR</th>
                  </tr>
                </thead>
                <tbody>
                  {dscrSched.rows.map(r => (
                    <tr key={r.year} className={`border-t border-border-soft ${r.belowFloor ? 'text-[#B4462F]' : 'text-ink-3'}`}>
                      <td className="py-1 pr-2">{r.year}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.ebitda)}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.debtService)}</td>
                      <td className="py-1 text-right font-semibold">{Number.isFinite(r.dscr) ? `${r.dscr.toFixed(2)}x` : '∞'}{r.belowFloor ? ' ⚠' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">{dscrSched.note}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-1">{L.beTitle}</h3>
            <p className="text-[11px] text-ink-6 mb-3 leading-relaxed">{L.beDesc(brl(minCov <= 0 ? ebitda : ebitda / minCov))}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kBeRate}</div>
                <div className="text-[18px] font-semibold" style={{ color: beRate.feasible ? '#1F9D6B' : '#B4462F' }}>{pct(beRate.rate)}</div>
              </div>
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kPeakService}</div>
                <div className="text-[18px] font-semibold text-ink-0">{brl(beRate.annualServicePeak)}</div>
              </div>
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kCurRate}</div>
                <div className="text-[18px] font-semibold" style={{ color: curRate <= beRate.rate ? '#1F9D6B' : '#B4462F' }}>{pct(curRate)}</div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">{beRate.note}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Aba 2: Revisão estratégica ──────────────────────────────────────────────
function ReviewPanel() {
  const { lang } = useLang()
  const [nopat, setNopat] = useState(200)
  const [revenue, setRevenue] = useState(2000)
  const [investedCapital, setInvestedCapital] = useState(1000)
  const [wacc, setWacc] = useState(0.12)
  const [growth, setGrowth] = useState(0.05)
  const [reinvestmentRate, setReinvestmentRate] = useState(0.5)

  const spread = useMemo(() => roicWaccSpread({ nopat, investedCapital, wacc }), [nopat, investedCapital, wacc])
  const alloc = useMemo(() => capitalAllocation({ roic: spread.roic, wacc, growthRate: growth }), [spread.roic, wacc, growth])
  const drivers = useMemo(() => valueDrivers({ nopat, revenue, investedCapital, wacc }), [nopat, revenue, investedCapital, wacc])

  // Valor do crescimento: reinvestir (NOPAT cresce a g = rr·ROIC) vs. devolver todo o capital, em 10 anos.
  const reinvest = useMemo(() => reinvestmentValue({ nopat, reinvestmentRate, roic: spread.roic, wacc, years: 10 }), [nopat, reinvestmentRate, spread.roic, wacc])

  // Sensibilidade ao WACC: varre uma faixa em torno do WACC atual (descarta valores ≤ 0).
  const waccSens = useMemo(() => {
    const range = [-0.04, -0.02, 0, 0.02, 0.04].map(d => wacc + d).filter(w => w > 0)
    return sensitivityToWacc({ nopat, investedCapital }, range.length ? range : [wacc])
  }, [nopat, investedCapital, wacc])

  const verdictColor = spread.verdict === 'cria' ? '#1F9D6B' : spread.verdict === 'destroi' ? '#B4462F' : '#0F141A'
  const en = lang === 'en'
  const vLabel = (v: string) => v === 'cria' ? (en ? 'Creates value' : 'Cria valor') : v === 'destroi' ? (en ? 'Destroys value' : 'Destrói valor') : (en ? 'Neutral' : 'Neutro')
  const L = en
    ? {
        noteWhat: 'Strategic review — measures whether the business creates or destroys value (ROIC vs. WACC) and guides capital allocation.',
        noteUse: 'Enter NOPAT, invested capital, revenue and WACC. The panel computes the ROIC−WACC spread, EVA (economic profit), decomposes ROIC into margin × turnover (DuPont) and recommends reinvest, buy back or deleverage based on the spread and growth. Use it to support the capital allocation thesis at the board.',
        fNopat: 'NOPAT', fRevenue: 'Revenue', fInvested: 'Invested capital', fWacc: 'WACC (dec.)', fGrowth: 'Growth (dec.)', fReinvest: 'Reinvestment rate (dec.)',
        kRoic: 'ROIC', kSpread: 'Spread', kEva: 'EVA', verdictTitle: 'Verdict',
        spreadTitle: 'ROIC vs. WACC (percentage points)', spreadRowLabel: 'ROIC vs. WACC',
        allocTitle: 'Recommended capital allocation',
        dupontTitle: 'DuPont decomposition of ROIC', rMargin: 'NOPAT margin', rTurnover: 'Capital turnover', rRoic: 'ROIC (margin × turnover)', rEconProfit: 'Economic profit (EVA)',
        growthTitle: 'Value of growth',
        growthDesc: (
          <>
            Reinvesting part of NOPAT (making profit grow at g = reinvestment rate × ROIC) only creates value if
            ROIC exceeds WACC. Compares, over 10 years, the PV of reinvesting vs. returning all the capital.
          </>
        ),
        kGrowthG: 'Growth (g)', kValueOfGrowth: 'Value of growth', kVerdict: 'Verdict',
        sensTitle: 'Sensitivity to WACC',
        sensDesc: (
          <>
            With ROIC fixed, it sweeps WACC around the current value: as the cost of capital rises, the spread and EVA
            fall. The indifference point (EVA = 0) is where WACC = ROIC.
          </>
        ),
        thWacc: 'WACC', thSpread: 'Spread', thEva: 'EVA', thRefValue: 'Ref. value (NOPAT/WACC)',
      }
    : {
        noteWhat: 'Revisão estratégica — mede se o negócio cria ou destrói valor (ROIC vs. WACC) e orienta a alocação de capital.',
        noteUse: 'Informe NOPAT, capital investido, receita e WACC. O painel calcula o spread ROIC−WACC, o EVA (economic profit), decompõe o ROIC em margem × giro (DuPont) e recomenda reinvestir, recomprar ou desalavancar conforme o spread e o crescimento. Use para embasar a tese de alocação de capital no board.',
        fNopat: 'NOPAT', fRevenue: 'Receita', fInvested: 'Capital investido', fWacc: 'WACC (dec.)', fGrowth: 'Crescimento (dec.)', fReinvest: 'Taxa reinvestimento (dec.)',
        kRoic: 'ROIC', kSpread: 'Spread', kEva: 'EVA', verdictTitle: 'Veredito',
        spreadTitle: 'ROIC vs. WACC (pontos percentuais)', spreadRowLabel: 'ROIC vs. WACC',
        allocTitle: 'Alocação de capital recomendada',
        dupontTitle: 'Decomposição DuPont do ROIC', rMargin: 'Margem NOPAT', rTurnover: 'Giro de capital', rRoic: 'ROIC (margem × giro)', rEconProfit: 'Lucro econômico (EVA)',
        growthTitle: 'Valor do crescimento',
        growthDesc: (
          <>
            Reinvestir parte do NOPAT (fazendo o lucro crescer a g = taxa de reinvestimento × ROIC) só cria valor se o
            ROIC superar o WACC. Compara, em 10 anos, o VP de reinvestir contra devolver todo o capital.
          </>
        ),
        kGrowthG: 'Crescimento (g)', kValueOfGrowth: 'Valor do crescimento', kVerdict: 'Veredito',
        sensTitle: 'Sensibilidade ao WACC',
        sensDesc: (
          <>
            Com o ROIC fixo, varre o WACC em torno do valor atual: à medida que o custo de capital sobe, o spread e o EVA
            caem. O ponto de indiferença (EVA = 0) é onde WACC = ROIC.
          </>
        ),
        thWacc: 'WACC', thSpread: 'Spread', thEva: 'EVA', thRefValue: 'Valor ref. (NOPAT/WACC)',
      }

  // Barras: ROIC vs WACC (escala em %). Reusa BarComparison em pontos percentuais.
  const spreadRows = [{ label: L.spreadRowLabel, a: wacc * 100, b: spread.roic * 100 }]

  return (
    <div>
      <PanelNote what={L.noteWhat} use={L.noteUse} />
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        <div className="grid grid-cols-2 gap-3 content-start">
          <Field label={L.fNopat} value={nopat} onChange={setNopat} step={10} />
          <Field label={L.fRevenue} value={revenue} onChange={setRevenue} step={100} />
          <Field label={L.fInvested} value={investedCapital} onChange={setInvestedCapital} step={100} />
          <Field label={L.fWacc} value={wacc} onChange={setWacc} step={0.005} />
          <Field label={L.fGrowth} value={growth} onChange={setGrowth} step={0.01} />
          <Field label={L.fReinvest} value={reinvestmentRate} onChange={setReinvestmentRate} step={0.05} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kRoic}</div>
              <div className="text-[24px] font-semibold text-accent">{pct(spread.roic)}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kSpread}</div>
              <div className="text-[24px] font-semibold" style={{ color: verdictColor }}>{pct(spread.spread)}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kEva}</div>
              <div className="text-[24px] font-semibold text-ink-0">{brl(spread.eva)}</div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${spread.verdict === 'cria' ? 'border-success/40 bg-success-bg' : spread.verdict === 'destroi' ? 'border-[#B4462F]/30 bg-[#FBEAE5]' : 'border-border-card bg-surface'}`}>
            <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.verdictTitle}</div>
            <div className="text-[22px] font-semibold" style={{ color: verdictColor }}>
              {vLabel(spread.verdict)}
            </div>
            <p className="mt-1 text-[11px] text-ink-6 leading-relaxed">{spread.note}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">{L.spreadTitle}</h3>
            <BarComparison rows={spreadRows} seriesA="WACC" seriesB="ROIC" fmt={(n) => `${n.toFixed(1)}%`} />
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-2">{L.allocTitle}</h3>
            <div className="text-[18px] font-semibold text-accent capitalize">{alloc.recommendation}</div>
            <p className="mt-1 text-[11px] text-ink-6 leading-relaxed">{alloc.rationale}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">{L.dupontTitle}</h3>
            <Row k={L.rMargin} v={pct(drivers.nopatMargin)} />
            <Row k={L.rTurnover} v={`${drivers.capitalTurnover.toFixed(2)}x`} />
            <Row k={L.rRoic} v={pct(drivers.roic)} strong />
            <Row k={L.rEconProfit} v={brl(drivers.economicProfit)} />
            <p className="mt-2 text-[11px] text-ink-6">{drivers.note}</p>
          </div>

          <div className={`p-4 rounded-xl border ${reinvest.verdict === 'cria' ? 'border-success/40 bg-success-bg' : reinvest.verdict === 'destroi' ? 'border-[#B4462F]/30 bg-[#FBEAE5]' : 'border-border-card bg-surface'}`}>
            <h3 className="text-[12px] font-semibold text-ink-1 mb-1">{L.growthTitle}</h3>
            <p className="text-[11px] text-ink-6 mb-3 leading-relaxed">{L.growthDesc}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kGrowthG}</div>
                <div className="text-[18px] font-semibold text-accent">{pct(reinvest.growthRate)}</div>
              </div>
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kValueOfGrowth}</div>
                <div className="text-[18px] font-semibold" style={{ color: reinvest.createsValue ? '#1F9D6B' : reinvest.valueOfGrowth < 0 ? '#B4462F' : '#0F141A' }}>{brl(reinvest.valueOfGrowth)}</div>
              </div>
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kVerdict}</div>
                <div className="text-[18px] font-semibold capitalize" style={{ color: reinvest.verdict === 'cria' ? '#1F9D6B' : reinvest.verdict === 'destroi' ? '#B4462F' : '#0F141A' }}>
                  {vLabel(reinvest.verdict)}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">{reinvest.note}</p>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-1">{L.sensTitle}</h3>
            <p className="text-[11px] text-ink-6 mb-3 leading-relaxed">{L.sensDesc}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] font-mono">
                <thead>
                  <tr className="text-ink-6 text-left">
                    <th className="py-1 pr-2 font-medium">{L.thWacc}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thSpread}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thEva}</th>
                    <th className="py-1 font-medium text-right">{L.thRefValue}</th>
                  </tr>
                </thead>
                <tbody>
                  {waccSens.rows.map(r => (
                    <tr key={r.wacc} className={`border-t border-border-soft ${Math.abs(r.wacc - wacc) < 1e-9 ? 'text-ink-1 font-semibold' : 'text-ink-3'}`}>
                      <td className="py-1 pr-2">{pct(r.wacc)}</td>
                      <td className="py-1 pr-2 text-right" style={{ color: r.verdict === 'cria' ? '#1F9D6B' : r.verdict === 'destroi' ? '#B4462F' : '#0F141A' }}>{pct(r.spread)}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.eva)}</td>
                      <td className="py-1 text-right">{brl(r.enterpriseValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">{waccSens.note}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Aba 3: Planejamento de longo prazo ──────────────────────────────────────
function PlanPanel() {
  const { lang } = useLang()
  const [revenue0, setRevenue0] = useState(1000)
  const [years, setYears] = useState(5)
  const [growth, setGrowth] = useState(0.1)
  const [margin, setMargin] = useState(0.25)
  const [capexPct, setCapexPct] = useState(0.08)
  const [nwcPct, setNwcPct] = useState(0.15)
  const [tax, setTax] = useState(0.34)
  const [planWacc, setPlanWacc] = useState(0.12)
  const [terminalGrowth, setTerminalGrowth] = useState(0.03)
  const [startingCash, setStartingCash] = useState(100)
  const [minCash, setMinCash] = useState(50)

  const base = { revenue0, years, revenueGrowth: growth, ebitdaMargin: margin, capexPctRevenue: capexPct, nwcPctRevenue: nwcPct, taxRate: tax }
  const proj = useMemo(() => projectFinancials(base), [revenue0, years, growth, margin, capexPct, nwcPct, tax]) // eslint-disable-line react-hooks/exhaustive-deps
  const scenarios = useMemo(() => runPlanScenarios(base, DEFAULT_LRP_SCENARIOS), [revenue0, years, growth, margin, capexPct, nwcPct, tax]) // eslint-disable-line react-hooks/exhaustive-deps

  // Valuation do plano: DCF do FCFF projetado + valor terminal de Gordon. Gordon exige WACC > g terminal.
  const valuation = useMemo(() => {
    if (proj.rows.length === 0 || !(planWacc > terminalGrowth)) return null
    try {
      return planValuation(proj, { wacc: planWacc, terminalGrowth })
    } catch {
      return null
    }
  }, [proj, planWacc, terminalGrowth])

  // Necessidade de captação: trajetória de caixa a partir do FCFF; pico = quanto captar p/ não furar o mínimo.
  const funding = useMemo(() => fundingGap(proj, { startingCash, minCash }), [proj, startingCash, minCash])

  // Break-even do plano: primeiro ano em que o FCFF acumulado vira positivo (com interpolação).
  const beYear = useMemo(() => breakEvenYear(proj), [proj])

  const en = lang === 'en'
  const yearWord = en ? 'Year' : 'Ano'
  const L = en
    ? {
        noteWhat: 'Long-range planning — projects revenue, EBITDA, capex, ΔNWC and FCFF across the strategic horizon.',
        noteUse: 'Set growth, EBITDA margin and the capex and working-capital intensities. The panel projects FCFF year by year (FCFF = EBIT·(1−T) + D&A − capex − ΔNWC), accumulates free cash and runs pessimistic/base/optimistic scenarios. Use it to size investment capacity, funding need and the value the plan sustains.',
        fRevenue0: 'Base-year revenue', fYears: 'Horizon (years)', fGrowth: 'Growth (dec.)', fMargin: 'EBITDA margin (dec.)', fCapex: 'Capex/Revenue (dec.)', fNwc: 'NWC/Revenue (dec.)', fTax: 'Tax (dec.)',
        gValCash: 'Valuation & cash', fWacc: 'WACC (dec.)', fTermG: 'Terminal g (dec.)', fStartCash: 'Starting cash', fMinCash: 'Minimum cash',
        kCumFcff: 'Cumulative FCFF', kRevCagr: 'Revenue CAGR', kFinalRev: 'Final revenue',
        revFcffTitle: 'Revenue vs. FCFF per year', barA: 'Revenue', barB: 'FCFF', cagr: 'CAGR',
        projTitle: (f: string) => `Multi-year projection (${f})`,
        thYear: 'Year', thRevenue: 'Revenue', thEbitda: 'EBITDA', thCapex: 'Capex', thNwc: 'ΔNWC', thFcff: 'FCFF', thCumFcff: 'Cum. FCFF',
        valTitle: 'Plan valuation',
        valDesc: (
          <>
            Discounts the projected FCFF at the WACC and adds the Gordon terminal value — delivers the Enterprise Value the plan
            sustains. The Gordon method requires WACC &gt; terminal g.
          </>
        ),
        kEv: 'Enterprise Value', kPvExplicit: 'Explicit PV', kPvTerminal: 'Terminal PV',
        valFallback: (w: string, g: string) => `Adjust the WACC (${w}) to be greater than the terminal g (${g}) — the Gordon terminal value diverges when WACC ≤ g.`,
        fundTitle: 'Funding need',
        fundDesc: (min: string) => (
          <>
            Accumulates cash (starting cash + FCFF) year by year and flags when it breaches the minimum cushion. The peak
            need is how much to raise so cash never falls below {min}.
          </>
        ),
        kPeakFunding: 'Peak funding', kLiquidityTrough: 'Liquidity trough', kYearsBelowMin: 'Years below minimum',
        thCumCash: 'Cumulative cash',
        fundBottom: (peak: string, trough: string, tYear: string, min: string) => funding.peakFundingNeed > 0
          ? `Raise ${peak} to avoid breaching the minimum cushion (trough of ${trough} in year ${tYear}).`
          : `Self-sufficient cash: the trough of ${trough} never falls below the minimum of ${min}. No funding needed.`,
        beTitle: 'Plan break-even',
        beDesc: (
          <>
            First year in which the plan’s cumulative FCFF turns positive (payback), with linear interpolation within the
            crossing year.
          </>
        ),
        kBeYear: 'Break-even year', beNotReached: 'Not reached', beYearFmt: (y: string) => `Year ${y}`,
        beBottom: (y: string) => beYear == null
          ? 'The cumulative FCFF never turns positive over the horizon — the plan does not pay for itself without additional levers.'
          : `The plan’s cumulative free cash covers the initial investment around year ${y}.`,
      }
    : {
        noteWhat: 'Planejamento de longo prazo — projeta receita, EBITDA, capex, ΔNWC e FCFF ao longo do horizonte estratégico.',
        noteUse: 'Defina o crescimento, a margem EBITDA e as intensidades de capex e capital de giro. O painel projeta o FCFF ano a ano (FCFF = EBIT·(1−T) + D&A − capex − ΔNWC), acumula o caixa livre e roda cenários pessimista/base/otimista. Use para dimensionar capacidade de investimento, necessidade de captação e o valor sustentado pelo plano.',
        fRevenue0: 'Receita ano-base', fYears: 'Horizonte (anos)', fGrowth: 'Crescimento (dec.)', fMargin: 'Margem EBITDA (dec.)', fCapex: 'Capex/Receita (dec.)', fNwc: 'NWC/Receita (dec.)', fTax: 'Imposto (dec.)',
        gValCash: 'Valuation & caixa', fWacc: 'WACC (dec.)', fTermG: 'g terminal (dec.)', fStartCash: 'Caixa inicial', fMinCash: 'Caixa mínimo',
        kCumFcff: 'FCFF acumulado', kRevCagr: 'CAGR receita', kFinalRev: 'Receita final',
        revFcffTitle: 'Receita vs. FCFF por ano', barA: 'Receita', barB: 'FCFF', cagr: 'CAGR',
        projTitle: (f: string) => `Projeção plurianual (${f})`,
        thYear: 'Ano', thRevenue: 'Receita', thEbitda: 'EBITDA', thCapex: 'Capex', thNwc: 'ΔNWC', thFcff: 'FCFF', thCumFcff: 'FCFF acum.',
        valTitle: 'Valuation do plano',
        valDesc: (
          <>
            Desconta o FCFF projetado ao WACC e soma o valor terminal de Gordon — entrega o Enterprise Value que o plano
            sustenta. O método de Gordon exige WACC &gt; g terminal.
          </>
        ),
        kEv: 'Enterprise Value', kPvExplicit: 'PV explícito', kPvTerminal: 'PV terminal',
        valFallback: (w: string, g: string) => `Ajuste o WACC (${w}) para ser maior que o g terminal (${g}) — o valor terminal de Gordon diverge quando WACC ≤ g.`,
        fundTitle: 'Necessidade de captação',
        fundDesc: (min: string) => (
          <>
            Acumula o caixa (caixa inicial + FCFF) ano a ano e sinaliza quando ele fura o colchão mínimo. O pico de
            necessidade é quanto captar para que o caixa nunca caia abaixo de {min}.
          </>
        ),
        kPeakFunding: 'Pico de captação', kLiquidityTrough: 'Vale de liquidez', kYearsBelowMin: 'Anos abaixo do mínimo',
        thCumCash: 'Caixa acumulado',
        fundBottom: (peak: string, trough: string, tYear: string, min: string) => funding.peakFundingNeed > 0
          ? `Captação de ${peak} para não furar o colchão mínimo (vale de ${trough} no ano ${tYear}).`
          : `Caixa autossuficiente: o vale de ${trough} nunca cai abaixo do mínimo de ${min}. Sem necessidade de captação.`,
        beTitle: 'Break-even do plano',
        beDesc: (
          <>
            Primeiro ano em que o FCFF acumulado do plano vira positivo (payback), com interpolação linear dentro do ano
            de cruzamento.
          </>
        ),
        kBeYear: 'Ano de break-even', beNotReached: 'Não atinge', beYearFmt: (y: string) => `Ano ${y}`,
        beBottom: (y: string) => beYear == null
          ? 'O FCFF acumulado nunca fica positivo no horizonte — o plano não se paga sem alavancas adicionais.'
          : `O caixa livre acumulado do plano cobre o investimento inicial por volta do ano ${y}.`,
      }

  // Barras: receita vs. FCFF por ano.
  const rows = proj.rows.map(r => ({ label: `${yearWord} ${r.year}`, a: r.revenue, b: r.fcff }))
  const scenColor: Record<string, string> = { bear: '#B4462F', base: '#0B3A78', bull: '#1F9D6B' }

  return (
    <div>
      <PanelNote what={L.noteWhat} use={L.noteUse} />
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        <div className="grid grid-cols-2 gap-3 content-start">
          <Field label={L.fRevenue0} value={revenue0} onChange={setRevenue0} step={100} />
          <Field label={L.fYears} value={years} onChange={setYears} />
          <Field label={L.fGrowth} value={growth} onChange={setGrowth} step={0.01} />
          <Field label={L.fMargin} value={margin} onChange={setMargin} step={0.01} />
          <Field label={L.fCapex} value={capexPct} onChange={setCapexPct} step={0.01} />
          <Field label={L.fNwc} value={nwcPct} onChange={setNwcPct} step={0.01} />
          <Field label={L.fTax} value={tax} onChange={setTax} step={0.01} />
          <div className="col-span-2 mt-1 text-[10px] uppercase tracking-wider text-ink-6 font-semibold">{L.gValCash}</div>
          <Field label={L.fWacc} value={planWacc} onChange={setPlanWacc} step={0.005} />
          <Field label={L.fTermG} value={terminalGrowth} onChange={setTerminalGrowth} step={0.005} />
          <Field label={L.fStartCash} value={startingCash} onChange={setStartingCash} step={25} />
          <Field label={L.fMinCash} value={minCash} onChange={setMinCash} step={25} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kCumFcff}</div>
              <div className="text-[24px] font-semibold text-accent">{brl(proj.cumulativeFcff)}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kRevCagr}</div>
              <div className="text-[24px] font-semibold text-success">{pct(proj.revenueCagr)}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kFinalRev}</div>
              <div className="text-[24px] font-semibold text-ink-0">{brl(proj.rows.length ? proj.rows[proj.rows.length - 1].revenue : revenue0)}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">{L.revFcffTitle}</h3>
            <BarComparison rows={rows} seriesA={L.barA} seriesB={L.barB} fmt={fmtCompact} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {scenarios.map(s => (
              <div key={s.name} className="p-4 rounded-xl border border-border-card bg-surface">
                <div className="text-[11px] uppercase tracking-wider" style={{ color: scenColor[s.name] }}>{s.label}</div>
                <div className="text-[20px] font-semibold text-ink-0">{brl(s.cumulativeFcff)}</div>
                <div className="text-[11px] text-ink-5">{L.cagr} {pct(s.revenueCagr)}</div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-2">{L.projTitle(proj.formula)}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] font-mono">
                <thead>
                  <tr className="text-ink-6 text-left">
                    <th className="py-1 pr-2 font-medium">{L.thYear}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thRevenue}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thEbitda}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thCapex}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thNwc}</th>
                    <th className="py-1 pr-2 font-medium text-right">{L.thFcff}</th>
                    <th className="py-1 font-medium text-right">{L.thCumFcff}</th>
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

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-1">{L.valTitle}</h3>
            <p className="text-[11px] text-ink-6 mb-3 leading-relaxed">{L.valDesc}</p>
            {valuation ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                    <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kEv}</div>
                    <div className="text-[18px] font-semibold text-accent">{brl(valuation.enterpriseValue)}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                    <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kPvExplicit}</div>
                    <div className="text-[18px] font-semibold text-ink-0">{brl(valuation.pvExplicit)}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                    <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kPvTerminal}</div>
                    <div className="text-[18px] font-semibold text-ink-0">{brl(valuation.pvTerminal)}</div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">{valuation.formula}</p>
              </>
            ) : (
              <p className="text-[12px] text-[#B4462F]">{L.valFallback(pct(planWacc), pct(terminalGrowth))}</p>
            )}
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-1">{L.fundTitle}</h3>
            <p className="text-[11px] text-ink-6 mb-3 leading-relaxed">{L.fundDesc(brl(minCash))}</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kPeakFunding}</div>
                <div className="text-[18px] font-semibold" style={{ color: funding.peakFundingNeed > 0 ? '#B4462F' : '#1F9D6B' }}>{brl(funding.peakFundingNeed)}</div>
              </div>
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kLiquidityTrough}</div>
                <div className="text-[18px] font-semibold text-ink-0">{brl(funding.troughCash)}{funding.troughYear ? <span className="text-[11px] text-ink-6 font-normal"> · {yearWord.toLowerCase()} {funding.troughYear}</span> : null}</div>
              </div>
              <div className="p-3 rounded-lg border border-border-card bg-app-bg">
                <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kYearsBelowMin}</div>
                <div className="text-[18px] font-semibold text-ink-0">{funding.breachYears.length}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] font-mono">
                <thead>
                  <tr className="text-ink-6 text-left">
                    <th className="py-1 pr-2 font-medium">{L.thYear}</th>
                    <th className="py-1 pr-2 font-medium text-right">FCFF</th>
                    <th className="py-1 font-medium text-right">{L.thCumCash}</th>
                  </tr>
                </thead>
                <tbody>
                  {funding.rows.map(r => (
                    <tr key={r.year} className={`border-t border-border-soft ${r.belowMin ? 'text-[#B4462F]' : 'text-ink-3'}`}>
                      <td className="py-1 pr-2">{r.year}</td>
                      <td className="py-1 pr-2 text-right">{brl(r.fcff)}</td>
                      <td className="py-1 text-right font-semibold">{brl(r.cash)}{r.belowMin ? ' ⚠' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">
              {L.fundBottom(brl(funding.peakFundingNeed), brl(funding.troughCash), String(funding.troughYear ?? '—'), brl(minCash))}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-1">{L.beTitle}</h3>
            <p className="text-[11px] text-ink-6 mb-3 leading-relaxed">{L.beDesc}</p>
            <div className="p-3 rounded-lg border border-border-card bg-app-bg inline-block">
              <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.kBeYear}</div>
              <div className="text-[18px] font-semibold" style={{ color: beYear == null ? '#B4462F' : '#1F9D6B' }}>
                {beYear == null ? L.beNotReached : L.beYearFmt(beYear.toFixed(1))}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">
              {L.beBottom(beYear == null ? '' : beYear.toFixed(1))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdvisoryWorkbench() {
  const { lang } = useLang()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(isTab(urlTab) ? urlTab : 'divida')
  const tabLabel = tabLabels(lang)

  // Os 3 itens do menu apontam para a MESMA rota /advisory mudando só o ?tab=. O Next
  // navega client-side sem remontar o componente, então sincronizamos a aba quando o
  // parâmetro de URL muda (senão "Revisão"/"Planejamento" não trocariam pelo menu).
  useEffect(() => {
    if (isTab(urlTab)) setTab(urlTab)
  }, [urlTab])

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
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">{lang === 'en' ? 'Strategic Advisory' : 'Assessoria Estratégica'}</h1>
              <p className="text-[12.5px] text-ink-5">{lang === 'en' ? 'Beyond M&A — debt restructuring, strategic review and long-range planning. Deterministic, auditable engine.' : 'Além do M&A — reestruturação de dívida, revisão estratégica e planejamento de longo prazo. Motor determinístico e auditável.'}</p>
            </div>
          </div>

          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
            <Info size={15} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-ink-3 leading-relaxed">
              {lang === 'en' ? (
                <>
                  <strong>About this workbench:</strong> extends the M&A advisory platform to the full
                  cycle of <strong>strategic advisory</strong>. Every field is an <strong>editable assumption</strong> —
                  an analytical <em>sandbox</em>, not a specific client. Each result shows the formula used: the engine is
                  exact and auditable (never &ldquo;the AI estimated&rdquo;).
                </>
              ) : (
                <>
                  <strong>Sobre este workbench:</strong> estende a plataforma da assessoria de fusões e aquisições para o
                  ciclo completo de <strong>advisory estratégico</strong>. Todos os campos são <strong>premissas editáveis</strong> —
                  um <em>sandbox</em> analítico, não um cliente específico. Cada resultado mostra a fórmula usada: o motor é
                  exato e auditável (nunca &ldquo;a IA estimou&rdquo;).
                </>
              )}
            </p>
          </div>

          <div className="flex gap-1 mb-5 border-b border-border-div">
            {TABS.map(({ key, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-accent text-accent' : 'border-transparent text-ink-5 hover:text-ink-3'}`}>
                <Icon size={14} /> {tabLabel[key]}
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

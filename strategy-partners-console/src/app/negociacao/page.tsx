'use client'
import { useMemo, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { Handshake, Info, Layers, Target, ListOrdered, Plus, Trash2, Bot, type LucideIcon } from 'lucide-react'
import { NegotiationSimulator } from '@/components/NegotiationSimulator'
import {
  computeZopa,
  deriveBatna,
  multiIssueOptimizer,
  optimalOpeningOffer,
  concessionPlanner,
  type NegotiationIssue,
} from '@/lib/finance/negotiation'
import { scale } from '@/components/charts/chartUtils'
import { useLang, type Lang } from '@/lib/lang'

// ── Formatação ───────────────────────────────────────────────────────────────
const brl = (n: number) => 'R$ ' + Math.round(n).toLocaleString('pt-BR')
const num = (n: number, d = 1) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: d }) : '—')
const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`

// Cor por lado favorecido (comprador=navy, vendedor=verde, meio-termo=tinta).
const FAVOR_COLOR: Record<NonNullable<ReturnType<typeof multiIssueOptimizer>['settlements'][number]['favors']>, string> = {
  comprador: '#0B3A78',
  vendedor: '#1F9D6B',
  'meio-termo': '#0F141A',
}

// ── Helpers de formulário (padrão do console) ────────────────────────────────
function Field({ label, value, onChange, step = 10 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
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

// Célula numérica compacta para tabelas editáveis.
function CellNum({ value, onChange, step = 1 }: { value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <input type="number" value={value} step={step} onChange={e => onChange(Number(e.target.value))}
      className="w-20 px-1.5 py-1 text-[12px] font-mono rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent text-right" />
  )
}

// Nota explicativa por recurso: o que é / para que serve / como usar — tom profissional.
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

// ── Aba 1: ZOPA & Excedente ──────────────────────────────────────────────────
function ZopaPanel() {
  const { lang } = useLang()
  const en = lang === 'en'
  const L = en
    ? {
        noteWhat: 'ZOPA & surplus — the zone of possible agreement between the seller’s floor and the buyer’s ceiling, and how the offer on the table splits the surplus.',
        noteUse: 'Enter the two walk-aways (derived from valuation/BATNA) and the current offer: the diagram shows whether a rational deal exists and how much each side captures. Use the engine’s BATNA card to derive the walk-aways from valuations and feed them into the calculation.',
        fSellerFloor: 'Seller floor (walk-away)', fBuyerCeiling: 'Buyer ceiling (walk-away)', fCurrentOffer: 'Current offer',
        mSellerFloor: 'Seller floor', mBuyerCeiling: 'Buyer ceiling', mOffer: 'Offer',
        hasZopa: (lo: string, hi: string, w: string) => `ZOPA exists: ${lo} – ${hi} (width ${w})`,
        noZopa: 'No ZOPA — no rational deal under current conditions',
        buyerSurplus: 'Buyer surplus:', sellerSurplus: 'Seller surplus:',
        batnaTitle: 'Engine BATNA',
        batnaDesc: 'Derives the walk-aways from valuations, not a guess: the buyer’s ceiling = min(value with synergies, next best alternative); the seller’s floor = max(standalone value, best other offer). Connects the table to the valuation engine.',
        fBuyerSyn: 'Value to buyer (synergies)', fBuyerNext: 'Next alternative (buyer)', fSellerStd: 'Seller standalone', fSellerOther: 'Other offer (seller)',
        buyerCeilingDerived: 'Derived buyer ceiling', sellerFloorDerived: 'Derived seller floor',
        applyBtn: 'Use in ZOPA calculation',
      }
    : {
        noteWhat: 'ZOPA & excedente — a zona de possível acordo entre o piso do vendedor e o teto do comprador, e como a oferta na mesa reparte o excedente.',
        noteUse: 'Informe os dois walk-aways (derivados de valuation/BATNA) e a oferta atual: o diagrama mostra se há acordo racional e quanto cada lado captura. Use o cartão BATNA do motor para derivar os walk-aways a partir de valuations e injetá-los no cálculo.',
        fSellerFloor: 'Piso do vendedor (walk-away)', fBuyerCeiling: 'Teto do comprador (walk-away)', fCurrentOffer: 'Oferta atual',
        mSellerFloor: 'Piso vendedor', mBuyerCeiling: 'Teto comprador', mOffer: 'Oferta',
        hasZopa: (lo: string, hi: string, w: string) => `Há ZOPA: ${lo} – ${hi} (largura ${w})`,
        noZopa: 'Sem ZOPA — sem acordo racional nas condições atuais',
        buyerSurplus: 'Excedente do comprador:', sellerSurplus: 'Excedente do vendedor:',
        batnaTitle: 'BATNA do motor',
        batnaDesc: 'Deriva os walk-aways a partir dos valuations, não de um chute: o teto do comprador = mín(valor com sinergias, próxima melhor alternativa); o piso do vendedor = máx(valor standalone, melhor outra oferta). Conecta a mesa ao motor de valuation.',
        fBuyerSyn: 'Valor p/ comprador (sinergias)', fBuyerNext: 'Próxima alternativa (comprador)', fSellerStd: 'Standalone do vendedor', fSellerOther: 'Outra oferta (vendedor)',
        buyerCeilingDerived: 'Teto do comprador derivado', sellerFloorDerived: 'Piso do vendedor derivado',
        applyBtn: 'Usar no cálculo de ZOPA',
      }
  const [sellerWalkAway, setSeller] = useState(800)
  const [buyerWalkAway, setBuyer] = useState(1200)
  const [currentOffer, setOffer] = useState(1000)

  // BATNA do motor.
  const [buyerStandaloneValue, setBuyerStd] = useState(1300)
  const [buyerNextBestCost, setBuyerNext] = useState(1200)
  const [sellerStandaloneValue, setSellerStd] = useState(750)
  const [sellerOtherOffer, setSellerOther] = useState(820)

  const z = useMemo(() => computeZopa({ sellerWalkAway, buyerWalkAway, currentOffer }), [sellerWalkAway, buyerWalkAway, currentOffer])
  const batna = useMemo(() => deriveBatna({ buyerStandaloneValue, buyerNextBestCost, sellerStandaloneValue, sellerOtherOffer }),
    [buyerStandaloneValue, buyerNextBestCost, sellerStandaloneValue, sellerOtherOffer])

  const applyBatna = () => {
    setSeller(Math.round(batna.sellerWalkAway))
    setBuyer(Math.round(batna.buyerWalkAway))
  }

  // Escala do diagrama: um pouco além dos dois walk-aways.
  const lo = Math.min(sellerWalkAway, buyerWalkAway) * 0.9
  const hi = Math.max(sellerWalkAway, buyerWalkAway) * 1.1
  const x = (v: number) => scale(v, lo, hi, 0, 100)

  return (
    <div>
      <PanelNote what={L.noteWhat} use={L.noteUse} />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Field label={L.fSellerFloor} value={sellerWalkAway} onChange={setSeller} />
        <Field label={L.fBuyerCeiling} value={buyerWalkAway} onChange={setBuyer} />
        <Field label={L.fCurrentOffer} value={currentOffer} onChange={setOffer} />
      </div>

      {/* Diagrama da ZOPA */}
      <div className="p-6 rounded-xl border border-border-card bg-surface mb-4">
        <div className="relative h-16">
          <div className="absolute top-8 left-0 right-0 h-1 bg-track rounded" />
          {z.hasZopa && (
            <div className="absolute top-8 h-1 bg-success rounded" style={{ left: `${x(z.low)}%`, width: `${x(z.high) - x(z.low)}%` }} />
          )}
          {[
            { v: sellerWalkAway, label: L.mSellerFloor, color: '#B4462F' },
            { v: buyerWalkAway, label: L.mBuyerCeiling, color: '#0B3A78' },
            { v: currentOffer, label: L.mOffer, color: '#1F9D6B' },
          ].map((m, i) => (
            <div key={i} className="absolute" style={{ left: `${x(m.v)}%`, top: 0, transform: 'translateX(-50%)' }}>
              <div className="text-[9px] text-ink-6 whitespace-nowrap mb-0.5" style={{ color: m.color }}>{m.label}</div>
              <div className="w-0.5 h-10 mx-auto" style={{ background: m.color }} />
              <div className="text-[9px] font-mono text-ink-5 whitespace-nowrap mt-0.5">{brl(m.v)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Veredito */}
      <div className={`p-5 rounded-xl border mb-4 ${z.hasZopa ? 'border-success/40 bg-success-bg' : 'border-[#B4462F]/30 bg-[#FBEAE5]'}`}>
        <div className="text-[15px] font-semibold mb-1" style={{ color: z.hasZopa ? '#1F9D6B' : '#B4462F' }}>
          {z.hasZopa ? L.hasZopa(brl(z.low), brl(z.high), brl(z.width)) : L.noZopa}
        </div>
        <p className="text-[12.5px] text-ink-3 leading-relaxed">{z.note}</p>
        {z.hasZopa && z.surplusSplit && (
          <div className="mt-3 flex gap-6 text-[12px]">
            <span className="text-ink-4">{L.buyerSurplus} <strong className="text-ink-1 font-mono">{brl(z.surplusSplit.buyer)}</strong></span>
            <span className="text-ink-4">{L.sellerSurplus} <strong className="text-ink-1 font-mono">{brl(z.surplusSplit.seller)}</strong></span>
          </div>
        )}
      </div>

      {/* BATNA do motor */}
      <div className="p-5 rounded-xl border border-border-card bg-surface">
        <h3 className="text-[13px] font-semibold text-ink-1 mb-1">{L.batnaTitle}</h3>
        <p className="text-[11px] text-ink-6 mb-4 leading-relaxed">{L.batnaDesc}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Field label={L.fBuyerSyn} value={buyerStandaloneValue} onChange={setBuyerStd} />
          <Field label={L.fBuyerNext} value={buyerNextBestCost} onChange={setBuyerNext} />
          <Field label={L.fSellerStd} value={sellerStandaloneValue} onChange={setSellerStd} />
          <Field label={L.fSellerOther} value={sellerOtherOffer} onChange={setSellerOther} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-lg border border-border-card bg-app-bg">
            <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.buyerCeilingDerived}</div>
            <div className="text-[18px] font-semibold" style={{ color: '#0B3A78' }}>{brl(batna.buyerWalkAway)}</div>
          </div>
          <div className="p-3 rounded-lg border border-border-card bg-app-bg">
            <div className="text-[10px] uppercase tracking-wider text-ink-6">{L.sellerFloorDerived}</div>
            <div className="text-[18px] font-semibold" style={{ color: '#B4462F' }}>{brl(batna.sellerWalkAway)}</div>
          </div>
        </div>
        <p className="text-[11px] text-ink-6 leading-relaxed mb-3">{batna.note}</p>
        <button onClick={applyBatna}
          className="px-3.5 py-2 text-[12px] font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity">
          {L.applyBtn}
        </button>
      </div>
    </div>
  )
}

// ── Aba 2: Pacote multi-issue ────────────────────────────────────────────────
const DEFAULT_ISSUES: NegotiationIssue[] = [
  { key: 'preco', label: 'Preço', buyerIdeal: 800, sellerIdeal: 1200, buyerWeight: 10, sellerWeight: 10, unit: 'R$' },
  { key: 'earnout', label: 'Earn-out %', buyerIdeal: 40, sellerIdeal: 10, buyerWeight: 6, sellerWeight: 8, unit: '%' },
  { key: 'escrow', label: 'Escrow %', buyerIdeal: 15, sellerIdeal: 5, buyerWeight: 7, sellerWeight: 4, unit: '%' },
  { key: 'naocompete', label: 'Não-compete anos', buyerIdeal: 5, sellerIdeal: 2, buyerWeight: 5, sellerWeight: 3, unit: 'anos' },
]

function MultiIssuePanel() {
  const { lang } = useLang()
  const en = lang === 'en'
  const favorLabel = (f: NonNullable<ReturnType<typeof multiIssueOptimizer>['settlements'][number]['favors']>) =>
    en ? { comprador: 'buyer', vendedor: 'seller', 'meio-termo': 'split' }[f] : f
  const L = en
    ? {
        noteWhat: 'Multi-issue package — integrative negotiation (Raiffa): real value is traded across price, earn-out, escrow, non-compete and other axes, each weighted differently by the two sides.',
        noteUse: 'Edit each issue’s ideals and weights (0-10). The engine concedes each topic to whoever values it most (logrolling) and measures how much joint value that adds versus splitting everything down the middle. Add or remove issues to design the package.',
        issuesTitle: 'Negotiation issues', addBtn: 'Add issue',
        thIssue: 'Issue', thBuyerIdeal: 'Buyer ideal', thSellerIdeal: 'Seller ideal', thBuyerWeight: 'Buyer weight', thSellerWeight: 'Seller weight', thUnit: 'Unit',
        removeAria: 'Remove', newIssue: (n: number) => `New issue ${n}`,
        recTitle: 'Recommended agreement (integrative package)',
        utilTitle: 'Utility captured by side', buyer: 'Buyer', seller: 'Seller',
        gainTitle: 'Value of the integrative trade',
        gainDesc: 'Joint value gained by trading concessions for priority (logrolling) versus splitting each item down the middle.',
      }
    : {
        noteWhat: 'Pacote multi-issue — negociação integrativa (Raiffa): o valor real se troca entre preço, earn-out, escrow, não-compete e outros eixos, cada um com peso diferente para os dois lados.',
        noteUse: 'Edite os ideais e os pesos (0-10) de cada issue. O motor concede cada tópico a quem mais o valoriza (logrolling) e mede quanto isso agrega de valor conjunto versus rachar tudo no meio. Adicione ou remova issues para desenhar o pacote.',
        issuesTitle: 'Issues da negociação', addBtn: 'Adicionar issue',
        thIssue: 'Issue', thBuyerIdeal: 'Ideal comprador', thSellerIdeal: 'Ideal vendedor', thBuyerWeight: 'Peso comprador', thSellerWeight: 'Peso vendedor', thUnit: 'Unid.',
        removeAria: 'Remover', newIssue: (n: number) => `Novo issue ${n}`,
        recTitle: 'Acordo recomendado (pacote integrativo)',
        utilTitle: 'Utilidade capturada por lado', buyer: 'Comprador', seller: 'Vendedor',
        gainTitle: 'Valor da troca integrativa',
        gainDesc: 'Ganho de valor conjunto ao trocar concessões por prioridade (logrolling) versus rachar cada item no meio.',
      }
  const [issues, setIssues] = useState<NegotiationIssue[]>(DEFAULT_ISSUES)

  const result = useMemo(() => multiIssueOptimizer(issues), [issues])

  const update = (i: number, patch: Partial<NegotiationIssue>) =>
    setIssues(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const remove = (i: number) => setIssues(prev => prev.filter((_, idx) => idx !== i))
  const add = () => setIssues(prev => [...prev, {
    key: `issue_${Date.now()}`, label: L.newIssue(prev.length + 1),
    buyerIdeal: 10, sellerIdeal: 0, buyerWeight: 5, sellerWeight: 5, unit: '',
  }])

  const fmtSettle = (v: number, unit?: string) => `${num(v)}${unit ? ` ${unit}` : ''}`

  return (
    <div>
      <PanelNote what={L.noteWhat} use={L.noteUse} />

      {/* Tabela de issues editável */}
      <div className="p-4 rounded-xl border border-border-card bg-surface mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-semibold text-ink-1">{L.issuesTitle}</h3>
          <button onClick={add} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] font-medium rounded-md border border-border-input text-ink-3 hover:text-ink-1 hover:border-accent transition-colors">
            <Plus size={13} /> {L.addBtn}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-ink-6 text-left">
                <th className="py-1.5 pr-2 font-medium">{L.thIssue}</th>
                <th className="py-1.5 px-2 font-medium text-right">{L.thBuyerIdeal}</th>
                <th className="py-1.5 px-2 font-medium text-right">{L.thSellerIdeal}</th>
                <th className="py-1.5 px-2 font-medium text-right">{L.thBuyerWeight}</th>
                <th className="py-1.5 px-2 font-medium text-right">{L.thSellerWeight}</th>
                <th className="py-1.5 pl-2 font-medium text-right">{L.thUnit}</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {issues.map((it, i) => (
                <tr key={it.key} className="border-t border-border-soft">
                  <td className="py-1.5 pr-2">
                    <input value={it.label} onChange={e => update(i, { label: e.target.value })}
                      className="w-36 px-1.5 py-1 text-[12px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
                  </td>
                  <td className="py-1.5 px-2 text-right"><CellNum value={it.buyerIdeal} onChange={v => update(i, { buyerIdeal: v })} step={10} /></td>
                  <td className="py-1.5 px-2 text-right"><CellNum value={it.sellerIdeal} onChange={v => update(i, { sellerIdeal: v })} step={10} /></td>
                  <td className="py-1.5 px-2 text-right"><CellNum value={it.buyerWeight} onChange={v => update(i, { buyerWeight: Math.max(0, Math.min(10, v)) })} /></td>
                  <td className="py-1.5 px-2 text-right"><CellNum value={it.sellerWeight} onChange={v => update(i, { sellerWeight: Math.max(0, Math.min(10, v)) })} /></td>
                  <td className="py-1.5 pl-2 text-right">
                    <input value={it.unit ?? ''} onChange={e => update(i, { unit: e.target.value })}
                      className="w-14 px-1.5 py-1 text-[12px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent text-right" />
                  </td>
                  <td className="py-1.5 pl-2 text-right">
                    <button onClick={() => remove(i)} disabled={issues.length <= 1}
                      className="text-ink-6 hover:text-[#B4462F] disabled:opacity-30 disabled:hover:text-ink-6 transition-colors" aria-label={L.removeAria}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acordo recomendado por issue */}
      <div className="p-4 rounded-xl border border-border-card bg-surface mb-4">
        <h3 className="text-[12px] font-semibold text-ink-1 mb-3">{L.recTitle}</h3>
        <div className="space-y-2">
          {result.settlements.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-border-soft">
              <span className="text-[12.5px] text-ink-2">{s.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-[12.5px] font-mono font-semibold text-ink-0">{fmtSettle(s.settledValue, s.unit)}</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
                  style={{ color: FAVOR_COLOR[s.favors], background: `color-mix(in srgb, ${FAVOR_COLOR[s.favors]} 12%, transparent)` }}>
                  {favorLabel(s.favors)}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-6 leading-relaxed">{result.note}</p>
      </div>

      {/* Utilidades + valor da troca */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        <div className="p-4 rounded-xl border border-border-card bg-surface">
          <h3 className="text-[12px] font-semibold text-ink-1 mb-3">{L.utilTitle}</h3>
          <div className="space-y-3">
            {[
              { label: L.buyer, u: result.buyerUtility, color: '#0B3A78' },
              { label: L.seller, u: result.sellerUtility, color: '#1F9D6B' },
            ].map(r => (
              <div key={r.label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-ink-5">{r.label}</span>
                  <span className="font-mono text-ink-2 font-semibold">{pct(r.u)}</span>
                </div>
                <div className="h-4 rounded bg-track overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${Math.max(0, Math.min(1, r.u)) * 100}%`, background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-success/40 bg-success-bg">
          <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.gainTitle}</div>
          <div className="text-[24px] font-semibold text-success">+{num(result.gainVsSplitDown)}</div>
          <p className="mt-1 text-[11px] text-ink-6 leading-relaxed">{L.gainDesc}</p>
        </div>
      </div>
    </div>
  )
}

// ── Curva da oferta ótima (SVG simples) ──────────────────────────────────────
function OfferCurve({ curve, bestOffer, labels }: { curve: { offer: number; probClose: number; expectedSurplus: number }[]; bestOffer: number; labels: { optimal: string; expectedSurplus: string; probClose: string; aria: string } }) {
  if (!curve.length) return null
  const PAD_L = 16, PAD_R = 16, PAD_T = 24, PAD_B = 34
  const innerW = 620, innerH = 170
  const w = PAD_L + innerW + PAD_R
  const h = PAD_T + innerH + PAD_B

  const offers = curve.map(c => c.offer)
  const xMin = Math.min(...offers), xMax = Math.max(...offers)
  const maxSurplus = Math.max(...curve.map(c => c.expectedSurplus), 1e-9)
  const x = (v: number) => scale(v, xMin, xMax, PAD_L, PAD_L + innerW)
  const barW = innerW / curve.length

  // Linha de P(fechar): 0..1 escalada à altura interna.
  const linePts = curve.map(c => `${x(c.offer)},${PAD_T + innerH - Math.max(0, Math.min(1, c.probClose)) * innerH}`).join(' ')

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 480 }} role="img" aria-label={labels.aria}>
        <line x1={PAD_L} y1={PAD_T + innerH} x2={PAD_L + innerW} y2={PAD_T + innerH} stroke="var(--color-border-base)" strokeWidth={1} />
        {/* barras = excedente esperado */}
        {curve.map((c, i) => {
          const bh = (c.expectedSurplus / maxSurplus) * innerH
          const isBest = Math.abs(c.offer - bestOffer) < 1e-9
          return (
            <rect key={i} x={x(c.offer) - barW / 2 + 1} y={PAD_T + innerH - bh} width={Math.max(1, barW - 2)} height={Math.max(0, bh)} rx={2}
              fill="var(--color-accent)" opacity={isBest ? 0.95 : 0.4} />
          )
        })}
        {/* linha = P(fechar) */}
        <polyline points={linePts} fill="none" stroke="#1F9D6B" strokeWidth={1.5} />
        {/* marcador da melhor oferta */}
        <line x1={x(bestOffer)} y1={PAD_T - 4} x2={x(bestOffer)} y2={PAD_T + innerH} stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={x(bestOffer)} y={PAD_T - 8} textAnchor="middle" fontSize={9} fill="var(--color-accent)" fontFamily="var(--font-mono)" fontWeight={600}>{labels.optimal} {num(bestOffer, 0)}</text>
        {/* ticks eixo x */}
        {[xMin, (xMin + xMax) / 2, xMax].map((t, i) => (
          <text key={i} x={x(t)} y={PAD_T + innerH + 16} textAnchor="middle" fontSize={9.5} fill="var(--color-ink-6)" fontFamily="var(--font-mono)">{num(t, 0)}</text>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-1 px-2">
        <span className="flex items-center gap-1.5 text-[10px] text-ink-5"><span className="w-2.5 h-2.5 rounded-sm bg-accent" /> {labels.expectedSurplus}</span>
        <span className="flex items-center gap-1.5 text-[10px] text-ink-5"><span className="w-2.5 h-0.5" style={{ background: '#1F9D6B' }} /> {labels.probClose}</span>
      </div>
    </div>
  )
}

// ── Aba 3: Oferta ótima ──────────────────────────────────────────────────────
function OptimalOfferPanel() {
  const { lang } = useLang()
  const en = lang === 'en'
  const L = en
    ? {
        noteWhat: 'Optimal opening offer under uncertainty — the counterparty’s reservation price is not a point, it is a range. A Monte Carlo simulation sweeps the possible openings.',
        noteUse: 'Choose your side, your walk-away and the counterparty’s likely reservation range. The engine finds the opening that maximizes expected surplus, showing the probability of closing. The curve crosses expected surplus (bars) and P(close) (line).',
        yourSide: 'Your side', buyer: 'Buyer', seller: 'Seller',
        yourCeiling: 'Your ceiling (walk-away)', yourFloor: 'Your floor (walk-away)',
        counterMin: 'Counterparty min. reservation', counterMax: 'Counterparty max. reservation',
        kBestOffer: 'Optimal opening', kProbClose: 'P(close)', kExpSurplus: 'Expected surplus',
        curveTitle: 'Offer × expected surplus × P(close)',
        curveLabels: { optimal: 'optimal', expectedSurplus: 'Expected surplus', probClose: 'P(close)', aria: 'Optimal offer curve' },
      }
    : {
        noteWhat: 'Oferta de abertura ótima sob incerteza — o limite (reservation price) da contraparte não é um ponto, é uma faixa. Uma simulação Monte Carlo varre as aberturas possíveis.',
        noteUse: 'Escolha seu lado, seu walk-away e a faixa provável do limite da contraparte. O motor acha a abertura que maximiza o excedente esperado, mostrando a probabilidade de fechar. A curva cruza excedente esperado (barras) e P(fechar) (linha).',
        yourSide: 'Seu lado', buyer: 'Comprador', seller: 'Vendedor',
        yourCeiling: 'Seu teto (walk-away)', yourFloor: 'Seu piso (walk-away)',
        counterMin: 'Limite mín. da contraparte', counterMax: 'Limite máx. da contraparte',
        kBestOffer: 'Abertura ótima', kProbClose: 'P(fechar)', kExpSurplus: 'Excedente esperado',
        curveTitle: 'Oferta × excedente esperado × P(fechar)',
        curveLabels: { optimal: 'ótima', expectedSurplus: 'Excedente esperado', probClose: 'P(fechar)', aria: 'Curva de oferta ótima' },
      }
  const [side, setSide] = useState<'comprador' | 'vendedor'>('comprador')
  const [ownWalkAway, setOwn] = useState(1200)
  const [counterMin, setMin] = useState(700)
  const [counterMax, setMax] = useState(1050)

  const result = useMemo(
    () => optimalOpeningOffer({ side, ownWalkAway, counterMin, counterMax, seed: 42 }),
    [side, ownWalkAway, counterMin, counterMax],
  )

  return (
    <div>
      <PanelNote what={L.noteWhat} use={L.noteUse} />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="grid grid-cols-2 gap-3 content-start">
          <div className="col-span-2">
            <SelectField label={L.yourSide} value={side} onChange={v => setSide(v as 'comprador' | 'vendedor')}
              options={[{ v: 'comprador', l: L.buyer }, { v: 'vendedor', l: L.seller }]} />
          </div>
          <div className="col-span-2">
            <Field label={side === 'comprador' ? L.yourCeiling : L.yourFloor} value={ownWalkAway} onChange={setOwn} />
          </div>
          <Field label={L.counterMin} value={counterMin} onChange={setMin} />
          <Field label={L.counterMax} value={counterMax} onChange={setMax} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kBestOffer}</div>
              <div className="text-[24px] font-semibold text-accent">{num(result.bestOffer, 0)}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kProbClose}</div>
              <div className="text-[24px] font-semibold text-success">{pct(result.probClose)}</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="text-[11px] uppercase tracking-wider text-ink-6">{L.kExpSurplus}</div>
              <div className="text-[24px] font-semibold text-ink-0">{num(result.expectedSurplus)}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">{L.curveTitle}</h3>
            <OfferCurve curve={result.curve} bestOffer={result.bestOffer} labels={L.curveLabels} />
            <p className="mt-2 text-[11px] text-ink-6 leading-relaxed">{result.note}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Aba 4: Plano de concessões ───────────────────────────────────────────────
function ConcessionPanel() {
  const { lang } = useLang()
  const en = lang === 'en'
  const L = en
    ? {
        noteWhat: 'Concession plan — the sequence of offers from the anchor to the target, with shrinking increments (a classic tactic: steps that shrink signal you are reaching your limit).',
        noteUse: 'Set your side, the anchor (first aggressive offer), the target where you want to close, your walk-away and the number of rounds. The engine generates the offer trajectory and the size of each concession, each one smaller than the last.',
        yourSide: 'Your side', buyer: 'Buyer', seller: 'Seller',
        anchor: 'Anchor (1st offer)', target: 'Target (where to close)', walkAway: 'Walk-away (limit)', rounds: 'Rounds',
        seqTitle: 'Offer sequence', thRound: 'Round', thOffer: 'Offer', thConcession: 'Concession', anchorRow: 'Anchor',
        sizeTitle: 'Concession sizes', roundWord: 'Round',
      }
    : {
        noteWhat: 'Plano de concessões — a sequência de ofertas da âncora até o alvo, com incrementos decrescentes (tática clássica: passos que encolhem sinalizam que você chega ao limite).',
        noteUse: 'Defina seu lado, a âncora (primeira oferta agressiva), o alvo onde quer fechar, seu walk-away e o número de rodadas. O motor gera a trajetória de ofertas e o tamanho de cada concessão, cada uma menor que a anterior.',
        yourSide: 'Seu lado', buyer: 'Comprador', seller: 'Vendedor',
        anchor: 'Âncora (1ª oferta)', target: 'Alvo (onde fechar)', walkAway: 'Walk-away (limite)', rounds: 'Rodadas',
        seqTitle: 'Sequência de ofertas', thRound: 'Rodada', thOffer: 'Oferta', thConcession: 'Concessão', anchorRow: 'Âncora',
        sizeTitle: 'Tamanho das concessões', roundWord: 'Rodada',
      }
  const [side, setSide] = useState<'comprador' | 'vendedor'>('comprador')
  const [anchor, setAnchor] = useState(700)
  const [target, setTarget] = useState(1000)
  const [walkAway, setWalkAway] = useState(1200)
  const [rounds, setRounds] = useState(4)

  const result = useMemo(
    () => concessionPlanner({ side, anchor, target, walkAway, rounds }),
    [side, anchor, target, walkAway, rounds],
  )

  return (
    <div>
      <PanelNote what={L.noteWhat} use={L.noteUse} />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="grid grid-cols-2 gap-3 content-start">
          <div className="col-span-2">
            <SelectField label={L.yourSide} value={side} onChange={v => setSide(v as 'comprador' | 'vendedor')}
              options={[{ v: 'comprador', l: L.buyer }, { v: 'vendedor', l: L.seller }]} />
          </div>
          <Field label={L.anchor} value={anchor} onChange={setAnchor} />
          <Field label={L.target} value={target} onChange={setTarget} />
          <Field label={L.walkAway} value={walkAway} onChange={setWalkAway} />
          <Field label={L.rounds} value={rounds} onChange={setRounds} step={1} />
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">{L.seqTitle}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] font-mono">
                <thead>
                  <tr className="text-ink-6 text-left">
                    <th className="py-1.5 pr-2 font-medium">{L.thRound}</th>
                    <th className="py-1.5 pr-2 font-medium text-right">{L.thOffer}</th>
                    <th className="py-1.5 font-medium text-right">{L.thConcession}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border-soft text-ink-4">
                    <td className="py-1.5 pr-2">{L.anchorRow}</td>
                    <td className="py-1.5 pr-2 text-right">{num(anchor, 0)}</td>
                    <td className="py-1.5 text-right">—</td>
                  </tr>
                  {result.steps.map(s => (
                    <tr key={s.round} className="border-t border-border-soft text-ink-3">
                      <td className="py-1.5 pr-2 font-sans">{s.round}</td>
                      <td className="py-1.5 pr-2 text-right text-ink-1 font-semibold">{num(s.offer, 0)}</td>
                      <td className="py-1.5 text-right">{num(s.concession, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Barras de concessão decrescente */}
          <div className="p-4 rounded-xl border border-border-card bg-surface">
            <h3 className="text-[12px] font-semibold text-ink-1 mb-3">{L.sizeTitle}</h3>
            <div className="space-y-2">
              {result.steps.map(s => {
                const maxC = Math.max(...result.steps.map(st => st.concession), 1e-9)
                return (
                  <div key={s.round} className="flex items-center gap-2">
                    <span className="w-16 text-[11px] text-ink-5">{L.roundWord} {s.round}</span>
                    <div className="flex-1 h-4 rounded bg-track overflow-hidden">
                      <div className="h-full rounded bg-accent" style={{ width: `${(s.concession / maxC) * 100}%`, opacity: 0.7 }} />
                    </div>
                    <span className="w-20 text-right text-[10px] font-mono text-ink-4">{num(s.concession, 0)}</span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] text-ink-6 leading-relaxed">{result.note}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Cockpit ──────────────────────────────────────────────────────────────────
type Tab = 'zopa' | 'multi' | 'oferta' | 'concessoes' | 'simulador'
const TABS: { key: Tab; icon: LucideIcon }[] = [
  { key: 'zopa', icon: Handshake },
  { key: 'multi', icon: Layers },
  { key: 'oferta', icon: Target },
  { key: 'concessoes', icon: ListOrdered },
  { key: 'simulador', icon: Bot },
]
const tabLabels = (lang: Lang): Record<Tab, string> => lang === 'en'
  ? { zopa: 'ZOPA & Surplus', multi: 'Multi-issue package', oferta: 'Optimal offer', concessoes: 'Concession plan', simulador: 'Simulator (AI)' }
  : { zopa: 'ZOPA & Excedente', multi: 'Pacote multi-issue', oferta: 'Oferta ótima', concessoes: 'Plano de concessões', simulador: 'Simulador (IA)' }

export default function NegociacaoPage() {
  const { lang } = useLang()
  const [tab, setTab] = useState<Tab>('zopa')
  const tabLabel = tabLabels(lang)

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0"><Handshake size={18} className="text-white" /></div>
            <div>
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">{lang === 'en' ? 'Negotiation Cockpit' : 'Cockpit de Negociação'}</h1>
              <p className="text-[12.5px] text-ink-5">{lang === 'en' ? 'ZOPA, integrative package, optimal offer and concession plan — prepare the table before the table. Deterministic, auditable engine.' : 'ZOPA, pacote integrativo, oferta ótima e plano de concessões — prepare a mesa antes da mesa. Motor determinístico e auditável.'}</p>
            </div>
          </div>

          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
            <Info size={15} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-ink-3 leading-relaxed">
              {lang === 'en' ? (
                <>
                  <strong>About this cockpit:</strong> brings together the analytical M&A negotiation tools (Raiffa/Bruner) in one
                  place — from the <strong>zone of possible agreement</strong> to the <strong>design of the integrative package</strong>, to the
                  <strong> optimal opening under uncertainty</strong> and the <strong>tactical concession plan</strong>. Every field
                  is an editable assumption; each result comes from an exact calculation (never &ldquo;the AI estimated&rdquo;).
                </>
              ) : (
                <>
                  <strong>Sobre este cockpit:</strong> reúne as ferramentas analíticas de negociação M&A (Raiffa/Bruner) num só
                  lugar — da <strong>zona de possível acordo</strong> ao <strong>desenho do pacote integrativo</strong>, à
                  <strong> abertura ótima sob incerteza</strong> e ao <strong>plano tático de concessões</strong>. Todos os campos
                  são premissas editáveis; cada resultado vem de um cálculo exato (nunca &ldquo;a IA estimou&rdquo;).
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

          {tab === 'zopa' && <ZopaPanel />}
          {tab === 'multi' && <MultiIssuePanel />}
          {tab === 'oferta' && <OptimalOfferPanel />}
          {tab === 'concessoes' && <ConcessionPanel />}
          {tab === 'simulador' && <NegotiationSimulator />}
        </div>
      </main>
    </div>
  )
}

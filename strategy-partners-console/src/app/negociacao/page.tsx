'use client'
import { useMemo, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { Handshake, Info } from 'lucide-react'
import { computeZopa } from '@/lib/finance/negotiation'
import { scale } from '@/components/charts/chartUtils'

const brl = (n: number) => 'R$ ' + Math.round(n).toLocaleString('pt-BR')

function Field({ label, value, onChange, step = 10 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-ink-6 mb-1">{label}</span>
      <input type="number" value={value} step={step} onChange={e => onChange(Number(e.target.value))}
        className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent" />
    </label>
  )
}

export default function NegociacaoPage() {
  const [sellerWalkAway, setSeller] = useState(800)
  const [buyerWalkAway, setBuyer] = useState(1200)
  const [currentOffer, setOffer] = useState(1000)

  const z = useMemo(() => computeZopa({ sellerWalkAway, buyerWalkAway, currentOffer }), [sellerWalkAway, buyerWalkAway, currentOffer])

  // Escala do diagrama: um pouco além dos dois walk-aways.
  const lo = Math.min(sellerWalkAway, buyerWalkAway) * 0.9
  const hi = Math.max(sellerWalkAway, buyerWalkAway) * 1.1
  const x = (v: number) => scale(v, lo, hi, 0, 100)

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-8 py-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0"><Handshake size={18} className="text-white" /></div>
            <div>
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">Simulador de Negociação</h1>
              <p className="text-[12.5px] text-ink-5">ZOPA e divisão de excedente — prepare a mesa antes da mesa.</p>
            </div>
          </div>

          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
            <Info size={15} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-ink-3 leading-relaxed">
              <strong>O que é:</strong> a <strong>ZOPA</strong> (zona de possível acordo) é o intervalo entre o
              <strong> piso do vendedor</strong> (mínimo que aceita) e o <strong>teto do comprador</strong> (máximo que paga).
              <strong> Para que serve:</strong> se o intervalo existe, há espaço para acordo; a posição da oferta atual
              mostra quanto do excedente cada lado captura. <strong>Como usar:</strong> informe os dois walk-aways
              (derivados do seu valuation e do BATNA de cada lado) e a oferta na mesa — o diagrama e o veredito recalculam.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <Field label="Piso do vendedor (walk-away)" value={sellerWalkAway} onChange={setSeller} />
            <Field label="Teto do comprador (walk-away)" value={buyerWalkAway} onChange={setBuyer} />
            <Field label="Oferta atual" value={currentOffer} onChange={setOffer} />
          </div>

          {/* Diagrama da ZOPA */}
          <div className="p-6 rounded-xl border border-border-card bg-surface mb-4">
            <div className="relative h-16">
              <div className="absolute top-8 left-0 right-0 h-1 bg-track rounded" />
              {z.hasZopa && (
                <div className="absolute top-8 h-1 bg-success rounded" style={{ left: `${x(z.low)}%`, width: `${x(z.high) - x(z.low)}%` }} />
              )}
              {/* marcadores */}
              {[
                { v: sellerWalkAway, label: 'Piso vendedor', color: '#B4462F' },
                { v: buyerWalkAway, label: 'Teto comprador', color: '#0B3A78' },
                { v: currentOffer, label: 'Oferta', color: '#1F9D6B' },
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
          <div className={`p-5 rounded-xl border ${z.hasZopa ? 'border-success/40 bg-success-bg' : 'border-[#B4462F]/30 bg-[#FBEAE5]'}`}>
            <div className="text-[15px] font-semibold mb-1" style={{ color: z.hasZopa ? '#1F9D6B' : '#B4462F' }}>
              {z.hasZopa ? `Há ZOPA: ${brl(z.low)} – ${brl(z.high)} (largura ${brl(z.width)})` : 'Sem ZOPA — sem acordo racional nas condições atuais'}
            </div>
            <p className="text-[12.5px] text-ink-3 leading-relaxed">{z.note}</p>
            {z.hasZopa && z.surplusSplit && (
              <div className="mt-3 flex gap-6 text-[12px]">
                <span className="text-ink-4">Excedente do comprador: <strong className="text-ink-1 font-mono">{brl(z.surplusSplit.buyer)}</strong></span>
                <span className="text-ink-4">Excedente do vendedor: <strong className="text-ink-1 font-mono">{brl(z.surplusSplit.seller)}</strong></span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

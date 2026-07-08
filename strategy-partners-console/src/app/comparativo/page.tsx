'use client'
import { useMemo, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { computeProcessRoi, type RoiParams } from '@/lib/finance/processRoi'
import { Scale, Clock, TrendingDown, Plus, Minus, Sparkles, Info } from 'lucide-react'

const brl = (n: number) => 'R$ ' + Math.round(n).toLocaleString('pt-BR')
const phaseLabel: Record<string, string> = { pre_deal: 'Pré-Deal', post_deal: 'Pós-Deal' }

function Bar({ label, traditional, ai, max, unit }: { label: string; traditional: number; ai: number; max: number; unit: (n: number) => string }) {
  const tPct = max > 0 ? (traditional / max) * 100 : 0
  const aPct = max > 0 ? (ai / max) * 100 : 0
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[11px] text-ink-5 mb-1">
        <span>{label}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-16 text-[9px] uppercase tracking-wider text-ink-6 shrink-0">Tradicional</span>
          <div className="flex-1 h-4 rounded bg-track overflow-hidden">
            <div className="h-full rounded" style={{ width: `${tPct}%`, background: '#B4462F' }} />
          </div>
          <span className="w-24 text-right text-[10px] font-mono text-ink-4">{unit(traditional)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-[9px] uppercase tracking-wider text-accent shrink-0">IA Angra</span>
          <div className="flex-1 h-4 rounded bg-track overflow-hidden">
            <div className="h-full rounded" style={{ width: `${aPct}%`, background: 'var(--color-accent)' }} />
          </div>
          <span className="w-24 text-right text-[10px] font-mono text-ink-2 font-semibold">{unit(ai)}</span>
        </div>
      </div>
    </div>
  )
}

export default function ComparativoPage() {
  const [hourlyRate, setHourlyRate] = useState(500)
  const [numTargets, setNumTargets] = useState(3)
  const [aiMonthlyCost, setAiMonthlyCost] = useState(20000)
  const [mandateMonths, setMandateMonths] = useState(6)
  const [dataroomFactor, setDataroomFactor] = useState(1.5)

  const params: RoiParams = { hourlyRate, numTargets, aiMonthlyCost, mandateMonths, dataroomFactor }
  const r = useMemo(() => computeProcessRoi(params), [hourlyRate, numTargets, aiMonthlyCost, mandateMonths, dataroomFactor])

  const maxCost = Math.max(...r.phases.map(p => p.traditionalCost), 1)
  const maxDays = Math.max(...r.phases.map(p => p.traditionalDays), 1)

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-8">
          {/* Header */}
          <div className="flex items-start gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Scale size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold text-ink-0 leading-tight">Comparativo de ROI do Processo de M&A</h1>
              <p className="text-[12.5px] text-ink-5">Custo, horas e prazo — <strong>com a frota de IA Angra</strong> vs. <strong>abordagem tradicional</strong>. Pré-deal e pós-deal.</p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-accent-over/40 bg-accent-soft px-4 py-3">
            <Info size={15} className="text-accent mt-0.5 shrink-0" />
            <p className="text-[12px] text-ink-3 leading-relaxed">
              <strong>Base do cálculo:</strong> este comparativo <strong>não se refere a um deal específico</strong> — é um modelo de
              esforço do <strong>processo completo de M&A</strong>, decomposto em workstreams (sourcing, triagem, valuation, diligence,
              memorando de IC, negociação no pré-deal; plano de 100 dias, sinergias, retenção e reporting no pós-deal). Cada workstream
              tem uma <strong>carga de horas e um prazo de referência</strong> de mesa de boutique, e um <strong>fator de compressão</strong>
              que estima quanto do esforço a frota de IA acelera. Os quatro parâmetros abaixo (taxa horária, nº de alvos, custo do sistema,
              duração e complexidade do dataroom) são <strong>editáveis</strong> — ajuste-os ao seu mandato e os gráficos e o balanço recalculam na hora.
            </p>
          </div>

          {/* Drivers */}
          <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl border border-border-card bg-surface">
            {[
              { label: 'Taxa horária (R$)', value: hourlyRate, set: setHourlyRate, step: 50, min: 100 },
              { label: 'Nº de alvos', value: numTargets, set: setNumTargets, step: 1, min: 1 },
              { label: 'Custo IA / mês (R$)', value: aiMonthlyCost, set: setAiMonthlyCost, step: 1000, min: 0 },
              { label: 'Duração (meses)', value: mandateMonths, set: setMandateMonths, step: 1, min: 1 },
              { label: 'Complexidade dataroom', value: dataroomFactor, set: setDataroomFactor, step: 0.1, min: 1 },
            ].map(d => (
              <label key={d.label} className="block">
                <span className="block text-[10px] uppercase tracking-wider text-ink-6 mb-1">{d.label}</span>
                <input
                  type="number" value={d.value} step={d.step} min={d.min}
                  onChange={e => d.set(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-[13px] rounded-md border border-border-input bg-white text-ink-1 outline-none focus:border-accent"
                />
              </label>
            ))}
          </div>

          {/* KPI cards */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="flex items-center gap-2 text-ink-6 text-[11px] uppercase tracking-wider"><TrendingDown size={13} /> Economia de custo</div>
              <div className="text-[24px] font-semibold text-success mt-1">{brl(r.totalCostSaved)}</div>
              <div className="text-[11px] text-ink-5">{(r.savingsPct * 100).toFixed(0)}% do custo do processo tradicional</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="flex items-center gap-2 text-ink-6 text-[11px] uppercase tracking-wider"><Clock size={13} /> Tempo ganho</div>
              <div className="text-[24px] font-semibold text-accent mt-1">{Math.round(r.totalDaysSaved)} dias</div>
              <div className="text-[11px] text-ink-5">{Math.round(r.totalTraditionalDays)}d → {Math.round(r.totalAiDays)}d de calendário</div>
            </div>
            <div className="p-4 rounded-xl border border-border-card bg-surface">
              <div className="flex items-center gap-2 text-ink-6 text-[11px] uppercase tracking-wider"><Sparkles size={13} /> Custo total</div>
              <div className="text-[24px] font-semibold text-ink-0 mt-1">{brl(r.totalAiCost)}</div>
              <div className="text-[11px] text-ink-5">vs. {brl(r.totalTraditionalCost)} no modo tradicional</div>
            </div>
          </div>

          {/* Charts by phase */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border-card bg-surface">
              <h2 className="text-[13px] font-semibold text-ink-1 mb-3">Custo por fase (R$)</h2>
              {r.phases.map(p => (
                <Bar key={p.phase} label={phaseLabel[p.phase]} traditional={p.traditionalCost} ai={p.aiCost} max={maxCost} unit={brl} />
              ))}
            </div>
            <div className="p-5 rounded-xl border border-border-card bg-surface">
              <h2 className="text-[13px] font-semibold text-ink-1 mb-3">Prazo por fase (dias de calendário)</h2>
              {r.phases.map(p => (
                <Bar key={p.phase} label={phaseLabel[p.phase]} traditional={p.traditionalDays} ai={p.aiDays} max={maxDays} unit={n => `${Math.round(n)}d`} />
              ))}
            </div>
          </div>

          {/* Workstream detail */}
          <div className="mt-4 p-5 rounded-xl border border-border-card bg-surface overflow-x-auto">
            <h2 className="text-[13px] font-semibold text-ink-1 mb-3">Detalhe por workstream</h2>
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-6 border-b border-border-div">
                  <th className="text-left py-2">Workstream</th>
                  <th className="text-left py-2">Fase</th>
                  <th className="text-right py-2">Horas trad.</th>
                  <th className="text-right py-2">Horas IA</th>
                  <th className="text-right py-2">Custo trad.</th>
                  <th className="text-right py-2">Custo IA</th>
                  <th className="text-right py-2">Dias poupados</th>
                </tr>
              </thead>
              <tbody>
                {r.perWorkstream.map(w => (
                  <tr key={w.key} className="border-b border-border-soft text-ink-3">
                    <td className="py-1.5">{w.label}</td>
                    <td className="py-1.5 text-ink-5">{phaseLabel[w.phase]}</td>
                    <td className="py-1.5 text-right font-mono">{Math.round(w.traditionalHours)}</td>
                    <td className="py-1.5 text-right font-mono text-accent">{Math.round(w.aiHours)}</td>
                    <td className="py-1.5 text-right font-mono">{brl(w.traditionalCost)}</td>
                    <td className="py-1.5 text-right font-mono">{brl(w.aiLaborCost)}</td>
                    <td className="py-1.5 text-right font-mono text-success">{Math.round(w.daysSaved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Executive +/- balance */}
          <div className="mt-6 p-5 rounded-xl border border-border-card bg-surface">
            <h2 className="text-[14px] font-semibold text-ink-0 mb-1">Leitura executiva — o balanço</h2>
            <p className="text-[12px] text-ink-5 mb-4">A soma dos ganhos e das contrapartidas de adotar a frota de IA neste mandato.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                {r.balance.filter(b => b.sign === '+').map((b, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2.5">
                    <div className="w-5 h-5 rounded-full bg-success-bg flex items-center justify-center shrink-0 mt-0.5"><Plus size={12} className="text-success" /></div>
                    <div>
                      <p className="text-[12.5px] font-medium text-ink-1 leading-tight">{b.label}</p>
                      <p className="text-[11.5px] text-ink-5">{b.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                {r.balance.filter(b => b.sign === '-').map((b, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#FBEAE5] flex items-center justify-center shrink-0 mt-0.5"><Minus size={12} className="text-[#B4462F]" /></div>
                    <div>
                      <p className="text-[12.5px] font-medium text-ink-1 leading-tight">{b.label}</p>
                      <p className="text-[11.5px] text-ink-5">{b.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-accent-soft border border-accent-over/40">
              <p className="text-[13px] text-ink-1">
                <strong>Linha de fundo:</strong> no cenário atual, a frota de IA Angra entrega o processo de M&A por{' '}
                <strong className="text-success">{brl(r.totalCostSaved)}</strong> a menos ({(r.savingsPct * 100).toFixed(0)}%) e{' '}
                <strong className="text-accent">{Math.round(r.totalDaysSaved)} dias</strong> mais rápido, preservando o julgamento do sócio nas etapas que exigem relação humana.
              </p>
            </div>
            <p className="mt-3 text-[10.5px] text-ink-6 font-mono">{r.formula}</p>
          </div>
        </div>
      </main>
    </div>
  )
}

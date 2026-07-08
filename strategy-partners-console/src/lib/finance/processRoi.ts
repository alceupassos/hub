// ─────────────────────────────────────────────────────────────────────────────
// Comparador de ROI do PROCESSO de M&A — IA Angra vs. abordagem tradicional.
//
// Estima custo (R$), horas e prazo (dias) de cada workstream do processo, pré-deal
// e pós-deal, nos dois cenários. Determinístico e transparente: cada workstream tem
// uma carga de horas-base (modo tradicional) e um fator de compressão pela IA
// (quanto do trabalho a frota Angra acelera). O resultado alimenta os gráficos e a
// leitura executiva "+ / −" (Fase E).
//
// Todos os defaults são calibráveis pela UI (taxa horária, headcount, tamanho do
// dataroom, nº de alvos). Nada aqui é cravado — é um modelo, exibido com premissas.
// ─────────────────────────────────────────────────────────────────────────────

export type Phase = 'pre_deal' | 'post_deal'

export interface WorkstreamDef {
  key: string
  label: string
  phase: Phase
  /** Horas de trabalho humano no modo tradicional (por deal), no cenário-base. */
  baseHours: number
  /** Fração das horas que a IA elimina/acelera (0..1). Ex.: 0.7 = IA faz 70% do esforço sumir. */
  aiCompression: number
  /** Dias de calendário no modo tradicional (lead time do workstream). */
  baseDays: number
  /** Fração do lead time comprimida pela IA (0..1). */
  aiTimeCompression: number
}

// Cargas ilustrativas e defensáveis de uma boutique; o usuário calibra na UI.
export const DEFAULT_WORKSTREAMS: WorkstreamDef[] = [
  // Pré-deal
  { key: 'sourcing', label: 'Origination / sourcing de alvos', phase: 'pre_deal', baseHours: 120, aiCompression: 0.6, baseDays: 30, aiTimeCompression: 0.5 },
  { key: 'screening', label: 'Screening & scoring inicial', phase: 'pre_deal', baseHours: 80, aiCompression: 0.75, baseDays: 15, aiTimeCompression: 0.6 },
  { key: 'valuation', label: 'Valuation & modelagem (DCF/LBO/comps)', phase: 'pre_deal', baseHours: 160, aiCompression: 0.65, baseDays: 20, aiTimeCompression: 0.55 },
  { key: 'diligence', label: 'Due diligence (dataroom, red flags)', phase: 'pre_deal', baseHours: 320, aiCompression: 0.7, baseDays: 45, aiTimeCompression: 0.5 },
  { key: 'ic_memo', label: 'Investment memo & materiais de IC', phase: 'pre_deal', baseHours: 100, aiCompression: 0.7, baseDays: 12, aiTimeCompression: 0.6 },
  { key: 'negotiation', label: 'Negociação & estruturação', phase: 'pre_deal', baseHours: 140, aiCompression: 0.35, baseDays: 30, aiTimeCompression: 0.25 },
  // Pós-deal
  { key: 'pmi_plan', label: 'Plano de integração (100 dias)', phase: 'post_deal', baseHours: 180, aiCompression: 0.6, baseDays: 20, aiTimeCompression: 0.5 },
  { key: 'synergy', label: 'Mapeamento & captura de sinergias', phase: 'post_deal', baseHours: 200, aiCompression: 0.55, baseDays: 60, aiTimeCompression: 0.4 },
  { key: 'talent', label: 'Retenção de talento & cultura', phase: 'post_deal', baseHours: 120, aiCompression: 0.4, baseDays: 45, aiTimeCompression: 0.3 },
  { key: 'reporting', label: 'Reporting & monitoramento pós-deal', phase: 'post_deal', baseHours: 160, aiCompression: 0.75, baseDays: 30, aiTimeCompression: 0.6 },
]

export interface RoiParams {
  /** Taxa horária carregada da equipe (R$/h). */
  hourlyRate: number
  /** Nº de alvos processados (multiplica esforço de sourcing/screening). */
  numTargets: number
  /** Custo mensal do sistema de IA (licença/infra) alocado ao processo. */
  aiMonthlyCost: number
  /** Meses de duração do mandato (para custo da IA). */
  mandateMonths: number
  /** Multiplicador de complexidade do dataroom (1 = normal, >1 = grande/complexo). */
  dataroomFactor?: number
  workstreams?: WorkstreamDef[]
}

export interface WorkstreamResult {
  key: string
  label: string
  phase: Phase
  traditionalHours: number
  aiHours: number
  hoursSaved: number
  traditionalCost: number
  aiLaborCost: number
  traditionalDays: number
  aiDays: number
  daysSaved: number
}

export interface PhaseSummary {
  phase: Phase
  traditionalCost: number
  aiCost: number
  costSaved: number
  traditionalDays: number
  aiDays: number
  daysSaved: number
  traditionalHours: number
  aiHours: number
}

export interface RoiBalanceItem {
  sign: '+' | '-'
  label: string
  detail: string
}

export interface RoiResult {
  perWorkstream: WorkstreamResult[]
  phases: PhaseSummary[]
  totalTraditionalCost: number
  totalAiCost: number          // trabalho humano residual + custo do sistema
  totalCostSaved: number
  totalTraditionalDays: number // caminho crítico aproximado (soma por fase)
  totalAiDays: number
  totalDaysSaved: number
  savingsPct: number
  balance: RoiBalanceItem[]     // leitura executiva "+ / −"
  formula: string
}

const money = (n: number) => n

export function computeProcessRoi(params: RoiParams): RoiResult {
  const ws = params.workstreams ?? DEFAULT_WORKSTREAMS
  const drFactor = params.dataroomFactor ?? 1
  const rate = params.hourlyRate

  const perWorkstream: WorkstreamResult[] = ws.map(w => {
    // sourcing/screening escalam com o nº de alvos; diligence escala com o dataroom.
    const targetScale = ['sourcing', 'screening'].includes(w.key) ? Math.max(1, params.numTargets) : 1
    const dataroomScale = w.key === 'diligence' ? drFactor : 1
    const traditionalHours = w.baseHours * targetScale * dataroomScale
    const aiHours = traditionalHours * (1 - w.aiCompression)
    const traditionalDays = w.baseDays * dataroomScale
    const aiDays = traditionalDays * (1 - w.aiTimeCompression)
    return {
      key: w.key, label: w.label, phase: w.phase,
      traditionalHours, aiHours, hoursSaved: traditionalHours - aiHours,
      traditionalCost: money(traditionalHours * rate),
      aiLaborCost: money(aiHours * rate),
      traditionalDays, aiDays, daysSaved: traditionalDays - aiDays,
    }
  })

  const phaseSummary = (phase: Phase): PhaseSummary => {
    const items = perWorkstream.filter(w => w.phase === phase)
    const traditionalCost = items.reduce((a, w) => a + w.traditionalCost, 0)
    const aiLabor = items.reduce((a, w) => a + w.aiLaborCost, 0)
    return {
      phase,
      traditionalCost,
      aiCost: aiLabor, // custo do sistema é alocado no total, não por fase
      costSaved: traditionalCost - aiLabor,
      traditionalDays: items.reduce((a, w) => a + w.traditionalDays, 0),
      aiDays: items.reduce((a, w) => a + w.aiDays, 0),
      daysSaved: items.reduce((a, w) => a + w.daysSaved, 0),
      traditionalHours: items.reduce((a, w) => a + w.traditionalHours, 0),
      aiHours: items.reduce((a, w) => a + w.aiHours, 0),
    }
  }

  const phases = [phaseSummary('pre_deal'), phaseSummary('post_deal')]

  const totalTraditionalCost = phases.reduce((a, p) => a + p.traditionalCost, 0)
  const aiLaborTotal = phases.reduce((a, p) => a + p.aiCost, 0)
  const aiSystemCost = params.aiMonthlyCost * params.mandateMonths
  const totalAiCost = aiLaborTotal + aiSystemCost
  const totalCostSaved = totalTraditionalCost - totalAiCost
  const totalTraditionalDays = phases.reduce((a, p) => a + p.traditionalDays, 0)
  const totalAiDays = phases.reduce((a, p) => a + p.aiDays, 0)
  const totalDaysSaved = totalTraditionalDays - totalAiDays
  const savingsPct = totalTraditionalCost > 0 ? totalCostSaved / totalTraditionalCost : 0

  const balance: RoiBalanceItem[] = [
    { sign: '+', label: 'Economia de custo', detail: `R$ ${Math.round(totalCostSaved).toLocaleString('pt-BR')} (${(savingsPct * 100).toFixed(0)}% do processo)` },
    { sign: '+', label: 'Tempo ganho', detail: `${Math.round(totalDaysSaved)} dias de calendário mais rápido até o fechamento/estabilização` },
    { sign: '+', label: 'Cobertura & consistência', detail: 'Frota de 27 especialistas cobre todos os workstreams com metodologia uniforme e rastreável' },
    { sign: '+', label: 'Rigor auditável', detail: 'Números vêm de motor determinístico com fonte/data — defensável perante o comitê de investimento' },
    { sign: '-', label: 'Custo do sistema', detail: `R$ ${Math.round(aiSystemCost).toLocaleString('pt-BR')} de licença/infra no período` },
    { sign: '-', label: 'Supervisão humana', detail: 'Negociação e relações com stakeholders seguem exigindo o sócio — a IA acelera, não substitui o julgamento final' },
  ]

  return {
    perWorkstream,
    phases,
    totalTraditionalCost,
    totalAiCost,
    totalCostSaved,
    totalTraditionalDays,
    totalAiDays,
    totalDaysSaved,
    savingsPct,
    balance,
    formula: 'Custo = Σ (horas·taxa) por workstream; IA reduz horas por (1−compressão) e soma o custo do sistema; economia = tradicional − IA',
  }
}

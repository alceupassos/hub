// ─────────────────────────────────────────────────────────────────────────────
// Cronograma do deal (Y4) — gera o calendário sourcing→closing com marcos, duração
// por fase, responsáveis e o CAMINHO CRÍTICO. Determinístico; a duração por fase
// escala com a complexidade do dataroom. Alimenta a timeline visual.
// ─────────────────────────────────────────────────────────────────────────────

export interface TimelinePhase {
  key: string
  label: string
  labelEn: string
  owner: string       // responsável (função)
  ownerEn: string
  baseDays: number    // duração-base em dias de calendário
  critical: boolean   // está no caminho crítico?
}

// Fases padrão de um processo de M&A buy-side, com dono e se são gargalo (crítico).
export const DEAL_PHASES: TimelinePhase[] = [
  { key: 'sourcing',    label: 'Originação',            labelEn: 'Sourcing',            owner: 'Origination',     ownerEn: 'Origination',     baseDays: 20, critical: false },
  { key: 'screening',   label: 'Triagem & NDA',         labelEn: 'Screening & NDA',     owner: 'Deal team',       ownerEn: 'Deal team',       baseDays: 10, critical: true },
  { key: 'valuation',   label: 'Valuation & modelagem', labelEn: 'Valuation & modeling',owner: 'Corporate finance',ownerEn: 'Corporate finance',baseDays: 15, critical: true },
  { key: 'ioi',         label: 'IOI / carta de interesse', labelEn: 'IOI / letter',     owner: 'Partner',         ownerEn: 'Partner',         baseDays: 7,  critical: false },
  { key: 'diligence',   label: 'Due diligence',         labelEn: 'Due diligence',       owner: 'Diligence + Legal',ownerEn: 'Diligence + Legal',baseDays: 40, critical: true },
  { key: 'loi',         label: 'LOI & negociação',      labelEn: 'LOI & negotiation',   owner: 'Partner + M&A',   ownerEn: 'Partner + M&A',   baseDays: 21, critical: true },
  { key: 'spa',         label: 'SPA & fechamento',      labelEn: 'SPA & closing',       owner: 'Legal',           ownerEn: 'Legal',           baseDays: 30, critical: true },
]

export interface TimelineItem {
  key: string
  label: string
  owner: string
  startDay: number
  endDay: number
  durationDays: number
  critical: boolean
}

export interface DealTimelineResult {
  items: TimelineItem[]
  totalDays: number
  criticalPathDays: number
  totalWeeks: number
  note: string
}

export interface TimelineInput {
  dataroomComplexity?: number // multiplicador da diligence (1 = normal, >1 = complexo)
  lang?: 'pt' | 'en'
}

/** Monta o cronograma sequencial (uma fase começa quando a anterior termina). */
export function buildDealTimeline(input: TimelineInput = {}): DealTimelineResult {
  const dr = input.dataroomComplexity ?? 1
  const en = input.lang === 'en'
  let cursor = 0
  let criticalDays = 0
  const items: TimelineItem[] = DEAL_PHASES.map(p => {
    const duration = Math.round(p.baseDays * (p.key === 'diligence' ? dr : 1))
    const startDay = cursor
    const endDay = cursor + duration
    cursor = endDay
    if (p.critical) criticalDays += duration
    return {
      key: p.key,
      label: en ? p.labelEn : p.label,
      owner: en ? p.ownerEn : p.owner,
      startDay, endDay, durationDays: duration, critical: p.critical,
    }
  })
  const totalDays = cursor
  return {
    items,
    totalDays,
    criticalPathDays: criticalDays,
    totalWeeks: Math.round(totalDays / 7),
    note: en
      ? `End-to-end timeline of ~${totalDays} calendar days (${Math.round(totalDays / 7)} weeks); the critical path (screening → valuation → diligence → LOI → SPA) accounts for ${criticalDays} days. Diligence is the main bottleneck — compress it to pull in closing.`
      : `Cronograma ponta a ponta de ~${totalDays} dias de calendário (${Math.round(totalDays / 7)} semanas); o caminho crítico (triagem → valuation → diligence → LOI → SPA) concentra ${criticalDays} dias. A diligence é o principal gargalo — comprimi-la antecipa o fechamento.`,
  }
}

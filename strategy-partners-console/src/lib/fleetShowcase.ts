// Dados ilustrativos da Frota (showcase) — casos e ações de exemplo, "como se já houvesse
// histórico". Puramente demonstrativo; quando o banco estiver ligado, isto é substituído por
// execution_logs + deals reais. Os 5 principais são o destaque; subagentes servem cada um.

export interface PrincipalMeta {
  label: string; color: string; tier: string
  discipline: string; disciplineEn: string
  desc: string; descEn: string
}

export const PRINCIPAL_META: Record<string, PrincipalMeta> = {
  caio: {
    label: 'CAIO', color: '#B8862B', tier: 'Opus 4.8',
    discipline: 'Orquestração & síntese', disciplineEn: 'Orchestration & synthesis',
    desc: 'O orquestrador. Enquadra a decisão, roteia para o especialista certo e integra tudo numa recomendação única — nunca entrega quatro opiniões grampeadas.',
    descEn: 'The orchestrator. Frames the decision, routes to the right specialist and integrates everything into a single recommendation — never four stapled opinions.',
  },
  merko: {
    label: 'MERKO', color: '#1E3A5F', tier: 'Fable 5',
    discipline: 'M&A & transações', disciplineEn: 'M&A & transactions',
    desc: 'Partner de transações. Valuation (DCF, múltiplos, precedentes), due diligence, estruturação e negociação de deals — buy e sell-side.',
    descEn: 'Transactions partner. Valuation (DCF, multiples, precedents), due diligence, deal structuring and negotiation — buy and sell-side.',
  },
  asten: {
    label: 'ASTEN', color: '#1F7A54', tier: 'Fable 5',
    discipline: 'Finanças corporativas', disciplineEn: 'Corporate finance',
    desc: 'Partner de finanças. Estrutura de capital, WACC, modelagem multi-cenário e readiness de mercado de capitais — cada número com a equação por trás.',
    descEn: 'Finance partner. Capital structure, WACC, multi-scenario modeling and capital-markets readiness — every number with the equation behind it.',
  },
  novae: {
    label: 'NOVAE', color: '#1D4ED8', tier: 'Fable 5',
    discipline: 'Crescimento & novos negócios', disciplineEn: 'Growth & new business',
    desc: 'Partner de crescimento. Validação de novos negócios, MVP, market sizing bottom-up e roadmap de captação — obcecado pela hipótese mais barata de matar primeiro.',
    descEn: 'Growth partner. New-business validation, MVP, bottom-up market sizing and fundraising roadmap — obsessed with the cheapest hypothesis to kill first.',
  },
  tycen: {
    label: 'TYCEN', color: '#6D28D9', tier: 'Fable 5',
    discipline: 'Transformação & execução', disciplineEn: 'Transformation & execution',
    desc: 'Partner de execução. Turnaround, PMO e plano de 100 dias com dono, prazo e marco verificável — porque estratégia não falha na formulação, falha na execução.',
    descEn: 'Execution partner. Turnaround, PMO and 100-day plans with owner, deadline and verifiable milestone — strategy fails in execution, not in formulation.',
  },
}

export interface ShowcaseAction {
  agentId: string        // principal que liderou
  supporting: string[]   // subagentes que apoiaram (nomes)
  action: string
  metric: string
}

export interface ShowcaseCase {
  id: string
  name: string
  type: string           // buy-side | sell-side | turnaround | growth | IPO
  lead: string           // id do principal
  outcome: string
  actions: ShowcaseAction[]
}

// Casos de exemplo (mandatos passados ilustrativos).
export const SHOWCASE_CASES: ShowcaseCase[] = [
  {
    id: 'ma-logistica', name: 'M&A · Setor Logístico', type: 'buy-side', lead: 'merko',
    outcome: 'Recomendação: GO com ajuste de preço de -8% por contingências.',
    actions: [
      { agentId: 'caio',  supporting: ['Router'], action: 'Enquadrou a decisão e roteou valuation + DD', metric: '4 questões · 3 agentes' },
      { agentId: 'merko', supporting: ['Diligence', 'Counsel'], action: 'Valuation DCF + triangulação e 6 red flags trabalhistas', metric: 'EV R$ 82–104M' },
      { agentId: 'asten', supporting: ['Ledger'], action: 'WACC bottom-up e sensibilidade de estrutura de capital', metric: 'WACC 14,2%' },
    ],
  },
  {
    id: 'latam-q3', name: 'Expansão LATAM · Q3', type: 'growth', lead: 'novae',
    outcome: 'MVP validado no México; entrada na Colômbia adiada 1 trimestre.',
    actions: [
      { agentId: 'novae', supporting: ['Beacon', 'Apex'], action: 'TAM/SAM/SOM bottom-up e teste de desejabilidade', metric: 'TAM R$ 2,1 bi' },
      { agentId: 'caio',  supporting: ['Anchor'], action: 'Sintetizou cenários e opções de entrada', metric: '3 cenários' },
    ],
  },
  {
    id: 'turn-varejo', name: 'Reestruturação · Varejo', type: 'turnaround', lead: 'tycen',
    outcome: 'Caixa estabilizado em 45 dias; EBITDA +6,3 p.p. em 100 dias.',
    actions: [
      { agentId: 'tycen', supporting: ['Blueprint', 'Pipeline'], action: 'Plano de 100 dias com donos e marcos', metric: '12 marcos' },
      { agentId: 'asten', supporting: ['Ledger'], action: 'Ponte de EBITDA e diagnóstico de rentabilidade', metric: '+6,3 p.p.' },
    ],
  },
  {
    id: 'ipo-fintech', name: 'IPO Readiness · Fintech', type: 'IPO', lead: 'asten',
    outcome: 'Equity story aprovado; janela recomendada para 2º semestre.',
    actions: [
      { agentId: 'asten', supporting: ['Ledger'], action: 'Readiness de governança e política de payout', metric: 'faixa P/E 18–22x' },
      { agentId: 'merko', supporting: ['Counsel'], action: 'Estruturação e revisão de riscos regulatórios', metric: 'CVM/B3' },
    ],
  },
]

// Volume de ações por principal (para o gráfico). Ilustrativo — "outros casos" acumulados.
export const ACTIVITY_BY_PRINCIPAL: { id: string; actions: number; cases: number }[] = [
  { id: 'caio',  actions: 148, cases: 24 },
  { id: 'merko', actions: 96,  cases: 15 },
  { id: 'asten', actions: 74,  cases: 13 },
  { id: 'tycen', actions: 61,  cases: 9 },
  { id: 'novae', actions: 52,  cases: 11 },
]

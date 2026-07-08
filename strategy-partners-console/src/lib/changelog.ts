// Changelog estruturado — a fonte da página /novidades. Linguagem de NEGÓCIO (não técnica):
// o que a versão passou a fazer e por que importa para o usuário. Do mais recente ao mais antigo.
//
// Regra permanente (definition of done): todo commit que muda comportamento do usuário adiciona
// uma entrada aqui e sobe APP_VERSION em +0.01 (src/lib/version.ts).

export interface ChangelogHighlight {
  pt: string
  en: string
}

export interface ChangelogEntry {
  version: string
  date: string // ISO YYYY-MM-DD
  title: { pt: string; en: string }
  summary: { pt: string; en: string }
  highlights: ChangelogHighlight[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.06',
    date: '2026-07-09',
    title: {
      pt: 'Correção de navegação nas áreas de advisory',
      en: 'Navigation fix in the advisory areas',
    },
    summary: {
      pt: 'Os itens Revisão Estratégica e Planejamento de Longo Prazo passam a abrir corretamente pelo menu.',
      en: 'The Strategic Review and Long-Range Planning menu items now open correctly.',
    },
    highlights: [
      {
        pt: 'Alternar entre Reestruturação de Dívida, Revisão Estratégica e Planejamento pelo menu lateral agora troca a área ativa de imediato, e o item correspondente fica destacado.',
        en: 'Switching between Debt Restructuring, Strategic Review and Planning from the sidebar now changes the active area immediately, with the matching item highlighted.',
      },
    ],
  },
  {
    version: '1.05',
    date: '2026-07-09',
    title: {
      pt: 'Advisory estratégico integral e modelagem por deal',
      en: 'Full strategic advisory and per-deal modeling',
    },
    summary: {
      pt: 'A plataforma passa a cobrir o advisory estratégico como um todo — não apenas M&A — e conecta a modelagem aos deals do pipeline, com mais transparência na frota.',
      en: 'The platform now covers strategic advisory as a whole — not only M&A — and connects modeling to pipeline deals, with more transparency across the fleet.',
    },
    highlights: [
      {
        pt: 'Novas áreas de advisory: Reestruturação de Dívida (DSCR/ICR, headroom de covenants, comparação de refinanciamento), Revisão Estratégica (ROIC × WACC, EVA, alocação de capital) e Planejamento de Longo Prazo (projeção plurianual).',
        en: 'New advisory areas: Debt Restructuring (DSCR/ICR, covenant headroom, refinancing comparison), Strategic Review (ROIC × WACC, EVA, capital allocation) and Long-Range Planning (multi-year projection).',
      },
      {
        pt: 'Modelagem por deal: a partir de um projeto do pipeline, o workbench abre pré-preenchido com as métricas extraídas e as premissas calibradas do setor, distinguindo o que é extraído, calibrado ou premissa.',
        en: 'Per-deal modeling: from a pipeline project, the workbench opens pre-filled with extracted metrics and calibrated sector assumptions, distinguishing extracted, calibrated and assumed inputs.',
      },
      {
        pt: 'Citações clicáveis no chat por deal: cada referência abre o trecho exato do documento-fonte.',
        en: 'Clickable citations in deal chat: each reference opens the exact source-document excerpt.',
      },
      {
        pt: 'Recomendação de especialistas: o orquestrador sugere quais agentes ativar para o desafio, com justificativa, e você aceita ou dispensa.',
        en: 'Specialist recommendation: the orchestrator suggests which agents to activate for the challenge, with a rationale, and you accept or dismiss.',
      },
      {
        pt: 'Mapa da frota: visualização da constelação de agentes e suas dependências, no war room e na página da frota.',
        en: 'Fleet map: constellation view of agents and their dependencies, in the war room and the fleet page.',
      },
    ],
  },
  {
    version: '1.04',
    date: '2026-07-08',
    title: {
      pt: 'Entregáveis institucionais e análise probabilística',
      en: 'Institutional deliverables and probabilistic analysis',
    },
    summary: {
      pt: 'A análise da frota passa a ser exportável como documentos de comitê, e o workbench ganhou uma camada de cenários e simulação.',
      en: 'Fleet analysis is now exportable as committee documents, and the workbench gained a scenario and simulation layer.',
    },
    highlights: [
      {
        pt: 'Geração em um clique do memorando de comitê (Word), deck executivo (PowerPoint) e modelo (Excel), a partir da síntese, com identidade Strategy Partners.',
        en: 'One-click generation of the committee memorandum (Word), executive deck (PowerPoint) and model (Excel) from the synthesis, branded Strategy Partners.',
      },
      {
        pt: 'Nova aba de Cenários e Monte Carlo: comparação pessimista/base/otimista e distribuição de TIR (P10/P50/P90) com probabilidade de superar o hurdle, reprodutível por semente.',
        en: 'New Scenarios and Monte Carlo tab: bear/base/bull comparison and IRR distribution (P10/P50/P90) with probability of clearing the hurdle, reproducible by seed.',
      },
      {
        pt: 'Simulador de negociação: cálculo de ZOPA (zona de possível acordo) e divisão de excedente entre comprador e vendedor a partir dos preços-limite.',
        en: 'Negotiation simulator: ZOPA (zone of possible agreement) calculation and buyer/seller surplus split from reservation prices.',
      },
    ],
  },
  {
    version: '1.03',
    date: '2026-07-08',
    title: {
      pt: 'Visualizações analíticas no workbench de modelagem',
      en: 'Analytical visualizations in the modeling workbench',
    },
    summary: {
      pt: 'O workbench passou a apresentar os resultados do motor em gráficos de padrão institucional, incluindo uma nova aba de análise de sensibilidade.',
      en: 'The workbench now presents engine results in institutional-grade charts, including a new sensitivity-analysis tab.',
    },
    highlights: [
      {
        pt: 'Football field de valuation e waterfall de atribuição de retorno (crescimento de EBITDA, expansão de múltiplo e desalavancagem) renderizados de forma consistente.',
        en: 'Valuation football field and return-attribution waterfall (EBITDA growth, multiple expansion, deleveraging) rendered consistently.',
      },
      {
        pt: 'Nova aba de Sensibilidade: mapa de calor do Enterprise Value por WACC × crescimento e gráfico tornado ordenando os drivers por impacto.',
        en: 'New Sensitivity tab: Enterprise Value heatmap by WACC × growth and a tornado chart ranking drivers by impact.',
      },
    ],
  },
  {
    version: '1.02',
    date: '2026-07-08',
    title: {
      pt: 'Clareza de metodologia no Workbench e no Comparativo de ROI',
      en: 'Methodology clarity in the Workbench and ROI Comparator',
    },
    summary: {
      pt: 'As telas de modelagem e de comparativo agora explicam, no topo, exatamente em que premissas se baseiam — para não haver dúvida sobre a origem dos números.',
      en: 'The modeling and comparator screens now explain, up top, exactly which assumptions they rest on — so there is no doubt about where the numbers come from.',
    },
    highlights: [
      {
        pt: 'Workbench de Modelagem: nota deixando claro que os campos partem de premissas de exemplo editáveis (um sandbox), com as premissas de mercado vindas da base proprietária da firma; para um deal real, abre-se pelo Projeto.',
        en: 'Modeling Workbench: a note clarifying that fields start from editable sample assumptions (a sandbox), with market assumptions drawn from the firm’s proprietary base; for a real deal, open it from the Project.',
      },
      {
        pt: 'Comparativo de ROI: explicação de que é um modelo do processo completo de M&A (por workstream), não um deal específico, com todos os parâmetros ajustáveis ao mandato.',
        en: 'ROI Comparator: explanation that it models the full M&A process (by workstream), not a specific deal, with every parameter adjustable to the mandate.',
      },
    ],
  },
  {
    version: '1.01',
    date: '2026-07-08',
    title: {
      pt: 'Correção de acesso: login por email e senha estável',
      en: 'Access fix: stable email & password login',
    },
    summary: {
      pt: 'Ajuste no reconhecimento da sessão para que o login corporativo funcione de ponta a ponta atrás do nosso servidor seguro.',
      en: 'Session recognition fix so corporate login works end-to-end behind our secure server.',
    },
    highlights: [
      {
        pt: 'Entrar com email e senha agora leva direto à plataforma, sem retornar à tela de acesso.',
        en: 'Signing in with email and password now goes straight into the platform, without bouncing back to the login screen.',
      },
    ],
  },
  {
    version: '1.00',
    date: '2026-07-08',
    title: {
      pt: 'Motor de decisão de M&A com números auditáveis',
      en: 'M&A decision engine with auditable numbers',
    },
    summary: {
      pt: 'O console deixou de "conversar sobre" M&A e passou a executar as contas que sustentam uma transação — com rigor de banco de investimento e a realidade brasileira embutida.',
      en: 'The console went from "talking about" M&A to running the numbers that underpin a transaction — with investment-bank rigor and Brazilian reality built in.',
    },
    highlights: [
      {
        pt: 'Workbench de modelagem: LBO, DCF, comparáveis e accretion/dilution interativos — mova as premissas e veja TIR, MOIC, valuation e football field recalcularem ao vivo.',
        en: 'Modeling workbench: interactive LBO, DCF, comps and accretion/dilution — move the assumptions and watch IRR, MOIC, valuation and the football field recompute live.',
      },
      {
        pt: 'Números que se pode auditar: cada cálculo sai de um motor determinístico exato (com a fórmula e as premissas à mostra), não de um palpite de IA. O que o agente diz no chat bate com o workbench.',
        en: 'Numbers you can audit: every calculation comes from an exact deterministic engine (formula and assumptions shown), not an AI guess. What the agent says in chat matches the workbench.',
      },
      {
        pt: 'Comparador de ROI do processo: quanto custa e quanto demora fazer o M&A (pré e pós-deal) com a nossa frota de IA vs. o modo tradicional — com um balanço executivo simples de + e −.',
        en: 'Process ROI comparator: how much the M&A process costs and takes (pre and post-deal) with our AI fleet vs. the traditional way — with a simple executive + / − balance.',
      },
      {
        pt: 'Memória proprietária da casa: respostas ancoradas em betas, prêmios de risco, múltiplos e precedentes calibrados e datados — inclusive CVM, CADE, ágio e contingências que os modelos globais erram.',
        en: 'The firm’s proprietary memory: answers anchored in calibrated, dated betas, risk premia, multiples and precedents — including CVM, CADE, ágio and contingencies that global models get wrong.',
      },
      {
        pt: 'Acesso mais seguro e confiança honesta: login exclusivamente corporativo (fim dos códigos de acesso) e um indicador de confiança que reflete cobertura de fontes real — nunca um número inventado.',
        en: 'Safer access and honest confidence: corporate-only login (access codes retired) and a confidence indicator that reflects real source coverage — never a fabricated number.',
      },
    ],
  },
]

export const LATEST = CHANGELOG[0]

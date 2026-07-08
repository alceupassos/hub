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

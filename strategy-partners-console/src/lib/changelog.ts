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

import 'server-only'
import { db } from './index'
import { assumptionsLibrary, dealPrecedents, goldenAnswers, marketMultiples, sectorBenchmarks } from './schema'

// Seed da base proprietária (K1) — nível MBA de elite (Harvard/Wharton/Stanford/INSEAD/LBS/Chicago
// Booth). Dados de PARTIDA realistas e não confidenciais, calibrados ao contexto Brasil/LatAm; o
// usuário substitui/expande pelos reais. Idempotente: roda só se as tabelas estiverem vazias.
const D = (s: string) => new Date(s)

export async function seedKnowledge(): Promise<{ seeded: boolean; counts?: Record<string, number> }> {
  const existing = await db.select({ id: assumptionsLibrary.id }).from(assumptionsLibrary).limit(1).catch(() => [])
  if (existing.length > 0) return { seeded: false }

  // ── K. Premissas de custo de capital calibradas (Damodaran + mercado BR) ──
  await db.insert(assumptionsLibrary).values([
    { key: 'rf_br', label: 'Taxa livre de risco (NTN-B 10a, base real + inflação-alvo)', value: '10.5000', unit: '%', source: 'Tesouro/BCB Focus', asOfDate: D('2026-06-30') },
    { key: 'crp_br', label: 'Country Risk Premium — Brasil (CDS + default spread)', value: '3.0000', unit: '%', source: 'Damodaran, jan/2026', asOfDate: D('2026-01-01') },
    { key: 'erp_mature', label: 'Equity Risk Premium — mercado maduro (implícito S&P)', value: '4.6000', unit: '%', source: 'Damodaran implied ERP', asOfDate: D('2026-01-01') },
    { key: 'erp_br_total', label: 'ERP total Brasil (maduro + CRP·λ)', value: '7.6000', unit: '%', source: 'Damodaran (ERP+CRP)', asOfDate: D('2026-01-01') },
    { key: 'tax_rate', label: 'Alíquota efetiva combinada (IRPJ 25% + CSLL 9%)', value: '34.0000', unit: '%', source: 'Lei 9.249/RIR', asOfDate: D('2026-01-01') },
    { key: 'cdi', label: 'CDI — custo de oportunidade onipresente', value: '10.5000', unit: '%', source: 'B3/CETIP', asOfDate: D('2026-06-30') },
    { key: 'jcp_benefit', label: 'Benefício fiscal do JCP (dedutível a TJLP·PL)', value: '34.0000', unit: '%', source: 'Lei 9.249 art.9', asOfDate: D('2026-01-01') },
    { key: 'size_premium', label: 'Size premium — small cap (10º decil)', value: '2.5000', unit: '%', source: 'Kroll (ex-Duff&Phelps)', asOfDate: D('2026-01-01') },
    { key: 'illiquidity_disc', label: 'Desconto de iliquidez — empresa fechada PME', value: '20.0000', unit: '%', source: 'estudos DLOM (Stout/Restricted Stock)', asOfDate: D('2026-01-01') },
    { key: 'control_premium', label: 'Prêmio de controle médio — M&A control deals', value: '25.0000', unit: '%', source: 'FactSet Mergerstat', asOfDate: D('2026-01-01') },
    { key: 'beta_saas', label: 'Beta desalavancado — Software/SaaS', value: '1.1500', unit: 'x', sector: 'saas', source: 'Damodaran (Software System/App)', asOfDate: D('2026-01-01') },
    { key: 'beta_fintech', label: 'Beta desalavancado — Fintech/Fin Svcs', value: '1.0500', unit: 'x', sector: 'fintech', source: 'Damodaran (FinTech)', asOfDate: D('2026-01-01') },
    { key: 'beta_logtech', label: 'Beta desalavancado — Transporte/Logística', value: '0.9500', unit: 'x', sector: 'logtech', source: 'Damodaran (Transportation)', asOfDate: D('2026-01-01') },
    { key: 'beta_healthtech', label: 'Beta desalavancado — Healthcare/Healthtech', value: '0.9000', unit: 'x', sector: 'healthtech', source: 'Damodaran (Healthcare Info/Svcs)', asOfDate: D('2026-01-01') },
    { key: 'beta_varejo', label: 'Beta desalavancado — Varejo', value: '0.8500', unit: 'x', sector: 'varejo', source: 'Damodaran (Retail General)', asOfDate: D('2026-01-01') },
    { key: 'beta_agro', label: 'Beta desalavancado — Agronegócio', value: '0.7800', unit: 'x', sector: 'agro', source: 'Damodaran (Farming/Agriculture)', asOfDate: D('2026-01-01') },
  ])

  // ── C. Múltiplos de mercado por setor (comparáveis públicos + transações precedentes) ──
  await db.insert(marketMultiples).values([
    { sector: 'saas', metric: 'ev_revenue', low: '3.00', median: '5.50', high: '9.00', period: '2026 T2', source: 'comps públicos + transações BR/LatAm', asOfDate: D('2026-06-30') },
    { sector: 'saas', metric: 'ev_ebitda', low: '12.00', median: '18.00', high: '28.00', period: '2026 T2', source: 'comps públicos', asOfDate: D('2026-06-30') },
    { sector: 'saas', metric: 'ev_arr', low: '2.50', median: '4.50', high: '8.00', period: '2026 T2', source: 'transações venture/growth', asOfDate: D('2026-06-30') },
    { sector: 'fintech', metric: 'ev_revenue', low: '2.50', median: '4.20', high: '7.50', period: '2026 T2', source: 'comps', asOfDate: D('2026-06-30') },
    { sector: 'fintech', metric: 'p_e', low: '10.00', median: '15.00', high: '24.00', period: '2026 T2', source: 'comps públicos', asOfDate: D('2026-06-30') },
    { sector: 'logtech', metric: 'ev_ebitda', low: '6.00', median: '8.50', high: '12.00', period: '2026 T2', source: 'transações precedentes', asOfDate: D('2026-06-30') },
    { sector: 'healthtech', metric: 'ev_ebitda', low: '9.00', median: '13.00', high: '18.00', period: '2026 T2', source: 'comps', asOfDate: D('2026-06-30') },
    { sector: 'healthtech', metric: 'ev_revenue', low: '2.00', median: '3.50', high: '6.00', period: '2026 T2', source: 'comps', asOfDate: D('2026-06-30') },
    { sector: 'varejo', metric: 'ev_ebitda', low: '5.00', median: '7.00', high: '10.00', period: '2026 T2', source: 'comps públicos', asOfDate: D('2026-06-30') },
    { sector: 'agro', metric: 'ev_ebitda', low: '5.50', median: '7.50', high: '10.50', period: '2026 T2', source: 'comps', asOfDate: D('2026-06-30') },
  ])

  // ── E. Benchmarks setoriais (KPIs de referência — quartis) ──
  await db.insert(sectorBenchmarks).values([
    { sector: 'saas', stage: 'growth', metric: 'churn_anual_logo', p25: '8.00', p50: '12.00', p75: '20.00', unit: '%', source: 'benchmark setorial', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'nrr_net_revenue_retention', p25: '100.00', p50: '112.00', p75: '125.00', unit: '%', source: 'benchmark', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'rule_of_40', p25: '25.00', p50: '40.00', p75: '55.00', unit: 'pts', source: 'benchmark (Bessemer/ICONIQ)', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'magic_number', p25: '0.50', p50: '0.90', p75: '1.30', unit: 'x', source: 'benchmark', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'burn_multiple', p25: '1.00', p50: '1.50', p75: '2.50', unit: 'x', source: 'benchmark (Sacks)', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'cac_payback', p25: '12.00', p50: '18.00', p75: '28.00', unit: 'meses', source: 'benchmark', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'ltv_cac', p25: '3.00', p50: '4.00', p75: '6.00', unit: 'x', source: 'benchmark', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'gross_margin', p25: '70.00', p50: '78.00', p75: '85.00', unit: '%', source: 'benchmark', asOfDate: D('2026-01-01') },
    { sector: 'fintech', stage: 'growth', metric: 'take_rate', p25: '0.80', p50: '1.40', p75: '2.50', unit: '%', source: 'benchmark', asOfDate: D('2026-01-01') },
    { sector: 'fintech', stage: 'growth', metric: 'npl_inadimplencia', p25: '2.00', p50: '4.50', p75: '8.00', unit: '%', source: 'benchmark crédito BR', asOfDate: D('2026-01-01') },
    { sector: 'logtech', stage: 'growth', metric: 'asset_turnover', p25: '1.20', p50: '1.80', p75: '2.60', unit: 'x', source: 'benchmark', asOfDate: D('2026-01-01') },
    { sector: 'healthtech', stage: 'growth', metric: 'mrr_growth_mensal', p25: '3.00', p50: '6.00', p75: '10.00', unit: '%', source: 'benchmark', asOfDate: D('2026-01-01') },
    { sector: 'varejo', stage: 'mature', metric: 'same_store_sales', p25: '2.00', p50: '5.00', p75: '9.00', unit: '%', source: 'benchmark', asOfDate: D('2026-01-01') },
  ])

  // ── A/G. Precedentes de transação (ilustrativos, com lições — nível post-mortem) ──
  await db.insert(dealPrecedents).values([
    { sector: 'logtech', thesis: 'Aquisição de plataforma de última milha', evEbitda: '7.10', structure: '70% cash + 30% earn-out (18m, atado a EBITDA)', synergyPromised: '18000000', synergyCaptured: '11000000', outcome: 'parcial', lessons: 'Contingência trabalhista subestimada em ~R$4M; escrow de 15% cobriu. Lição: DD trabalhista/fiscal é o coração do risco no Brasil, não apêndice.', source: 'interno', asOfDate: D('2025-11-01') },
    { sector: 'logtech', thesis: 'Consolidação regional de fretes (buy-and-build)', evEbitda: '6.40', structure: '80% cash + 20% earn-out', synergyPromised: '9000000', synergyCaptured: '9500000', outcome: 'sucesso', lessons: 'Integração de TMS em 90 dias destravou sinergia de rota. Haspeslagh & Jemison: os primeiros 100 dias decidem a captura.', source: 'interno', asOfDate: D('2025-06-01') },
    { sector: 'saas', thesis: 'Buy-and-build vertical SaaS', evRevenue: '5.20', structure: '60% cash + 40% stock', synergyPromised: '12000000', synergyCaptured: '4000000', outcome: 'falha', lessons: 'Churn pós-aquisição disparou por saída do fundador-chave; NRR caiu de 118% para 96%. Reter founder é cláusula contratual, nunca torcida.', source: 'interno', asOfDate: D('2025-03-01') },
    { sector: 'fintech', thesis: 'Aquisição de licença + carteira de crédito', evRevenue: '4.00', structure: '50% cash + 50% contingente à aprovação BACen', outcome: 'sucesso', lessons: 'Aprovação regulatória no critical path; term sheet condicionou fechamento à autorização. Regulatório vira cronograma, não nota de rodapé.', source: 'interno', asOfDate: D('2025-09-01') },
    { sector: 'healthtech', thesis: 'Plataforma B2B2C de telemedicina', evEbitda: '14.20', structure: '65% cash + 35% earn-out em 3 tranches', synergyPromised: '7000000', synergyCaptured: '5200000', outcome: 'parcial', lessons: 'Sinergia de cross-sell superestimada; a de custo (infra) veio em dia. Sempre separar sinergia de receita (otimista) da de custo (confiável).', source: 'interno', asOfDate: D('2025-08-01') },
    { sector: 'varejo', thesis: 'Turnaround de rede regional distressed', evEbitda: '5.80', structure: 'aquisição de ativos + assunção seletiva de passivos', outcome: 'sucesso', lessons: 'Sequência de turnaround (caixa → estabilização → recuperação) respeitada; quick wins em 90 dias financiaram a mudança. Slatter & Lovett.', source: 'interno', asOfDate: D('2025-05-01') },
  ])

  // ── J. Golden answers (nível sócio-sênior / MBA de elite) ──
  await db.insert(goldenAnswers).values([
    { question: 'Qual múltiplo justo para uma logtech?', category: 'valuation', keywords: 'logtech logística múltiplo ev ebitda valuation frete transporte', curatedBy: 'MERKO', asOfDate: D('2026-06-30'),
      answer: 'Faixa EV/EBITDA 6–12x (mediana ~8,5x). Nos precedentes da casa pagamos 6,4–7,1x com earn-out de 20–30% e escrow ≥15% — as contingências trabalhistas/fiscais são o maior driver de ajuste de preço. Sempre triangule com DCF (WACC ~14% com CRP BR de 3%) e trate todo múltiplo como um "DCF preguiçoso" (Damodaran): explicite crescimento, margem e risco implícitos.' },
    { question: 'Como estruturar earn-out para reduzir assimetria de informação?', category: 'estrutura', keywords: 'earn-out earnout estrutura assimetria escrow retenção reps warranties', curatedBy: 'MERKO', asOfDate: D('2026-06-30'),
      answer: 'Earn-out de 20–40% do EV atrelado a métricas verificáveis e auditáveis (EBITDA/receita, não "esforço"), com governança de mensuração definida no SPA. Escrow de 10–15% por 12–18 meses para reps & warranties. Retenção contratual do fundador quando o valor depende dele. Teoricamente, é o mecanismo de Akerlof (mercado de limões) aplicado a M&A: a estrutura resolve a assimetria que o preço sozinho não resolve.' },
    { question: 'Qual WACC usar para uma tese de investimento no Brasil?', category: 'valuation', keywords: 'wacc custo de capital brasil crp capm capital taxa desconto ke kd', curatedBy: 'ASTEN', asOfDate: D('2026-06-30'),
      answer: 'WACC = (E/V)·Ke + (D/V)·Kd·(1−T). Ke = Rf + β·ERP + CRP. Com Rf ~10,5%, ERP maduro 4,6%, CRP Brasil 3% (Damodaran) e β do setor realavancado à estrutura-alvo, o Ke tipicamente cai em 15–18%. Com T=34% e alavancagem moderada, WACC pós-imposto ~13–16%. Regra inviolável: abra TODAS as premissas e feche com faixa de sensibilidade — precisão espúria é o pecado capital da modelagem.' },
    { question: 'Quando o crescimento cria ou destrói valor?', category: 'estrategia', keywords: 'crescimento valor roic wacc eva spread econômico criação de valor', curatedBy: 'ASTEN', asOfDate: D('2026-06-30'),
      answer: 'Teste do spread econômico: Valor Criado = (ROIC − WACC) × Capital Investido. Se ROIC > WACC, crescer cria valor; se ROIC < WACC, crescer DESTRÓI valor mais rápido quanto mais a empresa cresce (o erro clássico do "crescimento a qualquer custo"). Antes de aprovar capex/M&A de expansão, exija a prova de que o ROIC marginal supera o WACC — caso contrário, a melhor alocação é recomprar ações ou reduzir dívida.' },
    { question: 'Como avaliar um SaaS além do ARR?', category: 'valuation', keywords: 'saas arr nrr rule of 40 churn cac ltv magic number burn multiple', curatedBy: 'NOVAE', asOfDate: D('2026-06-30'),
      answer: 'ARR é o começo, não o fim. Olhe: (1) NRR — >110% é motor de composição, <100% é balde furado; (2) Rule of 40 (crescimento% + margem FCF%) — ≥40 é elite; (3) Burn Multiple (net burn / net new ARR) — <1,5x é eficiente; (4) CAC payback <18m e LTV/CAC >3x; (5) Magic Number >0,75 valida a máquina de go-to-market. Um ARR crescente com NRR<100% e burn multiple>2,5x é uma armadilha de valuation.' },
    { question: 'Por que a maioria das fusões falha e como evitar?', category: 'pmi', keywords: 'pmi integração fusão falha sinergia 100 dias post-merger cultura', curatedBy: 'TYCEN', asOfDate: D('2026-06-30'),
      answer: '70–90% dos M&A destroem valor (Christensen, HBR) — e a falha é quase sempre na INTEGRAÇÃO, não na negociação. Antídoto: (1) plano de 100 dias com dono nomeado, prazo e marco verificável por sinergia — nunca uma linha "sinergias estimadas" sem responsável; (2) separar sinergia de custo (confiável) da de receita (otimista, desconte-a); (3) retenção de talento-chave como risco de 1ª ordem; (4) cadência semanal de captura. Haspeslagh & Jemison: os primeiros 100 dias decidem tudo.' },
    { question: 'Como validar um novo negócio antes de escalar?', category: 'growth', keywords: 'mvp validação novo negócio hipótese kill criteria escalar prematuramente', curatedBy: 'NOVAE', asOfDate: D('2026-06-30'),
      answer: 'Sequência inviolável: repetibilidade → escalabilidade → eficiência (nunca inverter — escalar prematuramente é a causa de morte nº1, Startup Genome). Hierarquia de risco: desejabilidade → viabilidade → factibilidade. Todo experimento com kill criteria definido ANTES do teste (Blank/Ries). Pergunta-âncora: "qual é a hipótese mais barata de matar primeiro?". Opinião do fundador é hipótese; comportamento do cliente é dado (Mom Test).' },
    { question: 'Qual estrutura de capital ótima para uma PME brasileira?', category: 'financas', keywords: 'estrutura de capital dívida alavancagem covenants debênture jcp trade-off', curatedBy: 'ASTEN', asOfDate: D('2026-06-30'),
      answer: 'Modigliani-Miller lido ao contrário: em mercados imperfeitos, o valor mora nas imperfeições — benefício fiscal da dívida (incl. JCP no Brasil) vs. custo esperado de distress vs. flexibilidade estratégica. Modele a fronteira pelo HEADROOM de covenants, não só pela alavancagem nominal. No menu BR, compare custo all-in (debênture incentivada, CRI/CRA, 4131, BNDES), nunca o cupom nominal. Alvo típico de PME saudável: Dívida Líquida/EBITDA 1,5–2,5x com headroom confortável.' },
  ])

  const counts = {
    assumptions: (await db.select({ id: assumptionsLibrary.id }).from(assumptionsLibrary)).length,
    multiples: (await db.select({ id: marketMultiples.id }).from(marketMultiples)).length,
    benchmarks: (await db.select({ id: sectorBenchmarks.id }).from(sectorBenchmarks)).length,
    precedents: (await db.select({ id: dealPrecedents.id }).from(dealPrecedents)).length,
    golden: (await db.select({ id: goldenAnswers.id }).from(goldenAnswers)).length,
  }
  return { seeded: true, counts }
}

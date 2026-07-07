import 'server-only'
import { db } from './index'
import { assumptionsLibrary, dealPrecedents, goldenAnswers, marketMultiples, sectorBenchmarks } from './schema'

// Seed idempotente da base proprietária (K1). Dados realistas de PARTIDA (não confidenciais) —
// o usuário substitui/expande pelos reais depois. Roda só se as tabelas estiverem vazias.
const D = (s: string) => new Date(s)

export async function seedKnowledge(): Promise<{ seeded: boolean; counts?: Record<string, number> }> {
  const existing = await db.select({ id: assumptionsLibrary.id }).from(assumptionsLibrary).limit(1).catch(() => [])
  if (existing.length > 0) return { seeded: false }

  // K. Premissas calibradas (Brasil)
  await db.insert(assumptionsLibrary).values([
    { key: 'rf_br', label: 'Taxa livre de risco (NTN-B 10a real + inflação-alvo)', value: '10.5000', unit: '%', source: 'Tesouro/BCB', asOfDate: D('2026-06-30') },
    { key: 'crp_br', label: 'Country Risk Premium Brasil', value: '3.0000', unit: '%', source: 'Damodaran', asOfDate: D('2026-01-01') },
    { key: 'erp_mature', label: 'Equity Risk Premium (mercado maduro)', value: '4.6000', unit: '%', source: 'Damodaran', asOfDate: D('2026-01-01') },
    { key: 'tax_rate', label: 'Alíquota efetiva (IRPJ+CSLL)', value: '34.0000', unit: '%', source: 'Lei BR', asOfDate: D('2026-01-01') },
    { key: 'cdi', label: 'CDI (custo de oportunidade)', value: '10.5000', unit: '%', source: 'B3', asOfDate: D('2026-06-30') },
    { key: 'beta_saas', label: 'Beta desalavancado — SaaS', value: '1.1500', unit: 'x', sector: 'saas', source: 'Damodaran (Software)', asOfDate: D('2026-01-01') },
    { key: 'beta_fintech', label: 'Beta desalavancado — Fintech', value: '1.0500', unit: 'x', sector: 'fintech', source: 'Damodaran (Fin Svcs)', asOfDate: D('2026-01-01') },
    { key: 'beta_logtech', label: 'Beta desalavancado — Logística', value: '0.9500', unit: 'x', sector: 'logtech', source: 'Damodaran (Transport)', asOfDate: D('2026-01-01') },
    { key: 'beta_healthtech', label: 'Beta desalavancado — Healthtech', value: '0.9000', unit: 'x', sector: 'healthtech', source: 'Damodaran (Healthcare)', asOfDate: D('2026-01-01') },
    { key: 'size_premium', label: 'Size premium (small cap BR)', value: '2.5000', unit: '%', source: 'Duff & Phelps', asOfDate: D('2026-01-01') },
  ])

  // C. Múltiplos de mercado por setor
  await db.insert(marketMultiples).values([
    { sector: 'saas', metric: 'ev_revenue', low: '3.00', median: '5.50', high: '9.00', period: '2026 T2', source: 'comparáveis públicos + transações', asOfDate: D('2026-06-30') },
    { sector: 'saas', metric: 'ev_ebitda', low: '12.00', median: '18.00', high: '28.00', period: '2026 T2', source: 'comparáveis públicos', asOfDate: D('2026-06-30') },
    { sector: 'fintech', metric: 'ev_revenue', low: '2.50', median: '4.20', high: '7.50', period: '2026 T2', source: 'comparáveis', asOfDate: D('2026-06-30') },
    { sector: 'logtech', metric: 'ev_ebitda', low: '6.00', median: '8.50', high: '12.00', period: '2026 T2', source: 'transações precedentes', asOfDate: D('2026-06-30') },
    { sector: 'healthtech', metric: 'ev_ebitda', low: '9.00', median: '13.00', high: '18.00', period: '2026 T2', source: 'comparáveis', asOfDate: D('2026-06-30') },
    { sector: 'varejo', metric: 'ev_ebitda', low: '5.00', median: '7.00', high: '10.00', period: '2026 T2', source: 'comparáveis', asOfDate: D('2026-06-30') },
  ])

  // E. Benchmarks setoriais (KPIs)
  await db.insert(sectorBenchmarks).values([
    { sector: 'saas', stage: 'growth', metric: 'churn_anual', p25: '8.00', p50: '12.00', p75: '20.00', unit: '%', source: 'benchmark interno', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'nrr', p25: '100.00', p50: '112.00', p75: '125.00', unit: '%', source: 'benchmark interno', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'rule_of_40', p25: '25.00', p50: '40.00', p75: '55.00', unit: 'pts', source: 'benchmark interno', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'cac_payback', p25: '12.00', p50: '18.00', p75: '28.00', unit: 'meses', source: 'benchmark interno', asOfDate: D('2026-01-01') },
    { sector: 'saas', stage: 'growth', metric: 'gross_margin', p25: '70.00', p50: '78.00', p75: '85.00', unit: '%', source: 'benchmark interno', asOfDate: D('2026-01-01') },
    { sector: 'fintech', stage: 'growth', metric: 'take_rate', p25: '0.80', p50: '1.40', p75: '2.50', unit: '%', source: 'benchmark interno', asOfDate: D('2026-01-01') },
  ])

  // A/G. Precedentes de transação (ilustrativos)
  await db.insert(dealPrecedents).values([
    { sector: 'logtech', thesis: 'Aquisição de plataforma de última milha', evEbitda: '7.10', structure: '70% cash + 30% earn-out (18m)', synergyPromised: '18000000', synergyCaptured: '11000000', outcome: 'parcial', lessons: 'Contingência trabalhista subestimada; escrow de 15% salvou o comprador.', source: 'interno', asOfDate: D('2025-11-01') },
    { sector: 'logtech', thesis: 'Consolidação regional de fretes', evEbitda: '6.40', structure: '80% cash + 20% earn-out', synergyPromised: '9000000', synergyCaptured: '9500000', outcome: 'sucesso', lessons: 'Integração de TMS em 90 dias foi decisiva.', source: 'interno', asOfDate: D('2025-06-01') },
    { sector: 'saas', thesis: 'Buy-and-build vertical SaaS', evRevenue: '5.20', structure: '60% cash + 40% stock', synergyPromised: '12000000', synergyCaptured: '4000000', outcome: 'falha', lessons: 'Churn pós-aquisição disparou por perda de fundador; reter founder é cláusula, não torcida.', source: 'interno', asOfDate: D('2025-03-01') },
    { sector: 'fintech', thesis: 'Aquisição de licença + carteira', evRevenue: '4.00', structure: '50% cash + 50% contingente regulatório', outcome: 'sucesso', lessons: 'Aprovação BACen no critical path; term sheet condicionou fechamento.', source: 'interno', asOfDate: D('2025-09-01') },
  ])

  // J. Golden answers
  await db.insert(goldenAnswers).values([
    { question: 'Qual múltiplo justo para uma logtech?', category: 'valuation', keywords: 'logtech logística múltiplo ev ebitda valuation frete', curatedBy: 'MERKO', asOfDate: D('2026-06-30'),
      answer: 'Faixa EV/EBITDA 6–12x (mediana ~8,5x). Nos nossos precedentes de logtech pagamos 6,4–7,1x com earn-out de 20–30% e escrow ≥15% — as contingências trabalhistas são o maior risco de ajuste de preço. Triangule com DCF (WACC ~14% com CRP BR de 3%).' },
    { question: 'Como estruturar earn-out para reduzir risco de assimetria?', category: 'estrutura', keywords: 'earn-out earnout estrutura assimetria escrow retenção', curatedBy: 'MERKO', asOfDate: D('2026-06-30'),
      answer: 'Earn-out de 20–40% do EV atrelado a metas verificáveis (EBITDA/receita), com escrow de 10–15% por 12–18 meses para reps & warranties. Retenção contratual do fundador é obrigatória quando o valor depende dele — nunca deixe como torcida.' },
    { question: 'Qual WACC usar para uma tese no Brasil?', category: 'valuation', keywords: 'wacc custo de capital brasil crp capm taxa desconto', curatedBy: 'ASTEN', asOfDate: D('2026-06-30'),
      answer: 'Ke = Rf + β·ERP + CRP. Com Rf ~10,5%, ERP maduro 4,6%, CRP Brasil 3% (Damodaran) e β realavancado do setor, o Ke costuma cair em 15–18%. WACC pós-imposto (T=34%) tipicamente 13–16% dependendo da alavancagem. Sempre abra as premissas e mostre a faixa de sensibilidade.' },
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

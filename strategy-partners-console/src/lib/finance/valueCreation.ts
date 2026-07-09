// ─────────────────────────────────────────────────────────────────────────────
// Revisão estratégica — criação de valor ao estilo Koller/Rappaport (value-based
// management). Um negócio cria valor quando o ROIC supera o WACC; o EVA (economic
// profit) mede quanto valor econômico é gerado (ou destruído) por período. A
// alocação de capital decorre disso: reinvestir só faz sentido quando o spread é
// positivo E há crescimento; caso contrário, devolver capital ou desalavancar.
//
// Tudo determinístico e auditável (fórmula em cada resultado). Sem LLM.
// ─────────────────────────────────────────────────────────────────────────────

// Banda de indiferença (25 bps): dentro dela o spread é tratado como "neutro".
const SPREAD_BAND = 0.0025

export interface RoicWaccInput {
  nopat: number           // NOPAT = EBIT·(1−T)
  investedCapital: number // capital investido (dívida + equity − caixa não operacional)
  wacc: number            // custo médio ponderado de capital (decimal)
}

export interface RoicWaccResult {
  roic: number
  spread: number          // ROIC − WACC
  eva: number             // (ROIC − WACC)·CapitalInvestido = economic profit
  verdict: 'cria' | 'destroi' | 'neutro'
  note: string
  formula: string
}

/** ROIC = NOPAT/CapitalInvestido ; EVA = (ROIC−WACC)·CapitalInvestido. */
export function roicWaccSpread(i: RoicWaccInput): RoicWaccResult {
  const roic = i.investedCapital === 0 ? 0 : i.nopat / i.investedCapital
  const spread = roic - i.wacc
  const eva = spread * i.investedCapital
  const verdict: RoicWaccResult['verdict'] =
    spread > SPREAD_BAND ? 'cria' : spread < -SPREAD_BAND ? 'destroi' : 'neutro'
  return {
    roic,
    spread,
    eva,
    verdict,
    note:
      verdict === 'cria'
        ? `Cria valor: ROIC ${(roic * 100).toFixed(1)}% > WACC ${(i.wacc * 100).toFixed(1)}% (spread +${(spread * 100).toFixed(1)}pp). Cada real reinvestido rende acima do custo de capital — priorize crescimento.`
        : verdict === 'destroi'
          ? `Destrói valor: ROIC ${(roic * 100).toFixed(1)}% < WACC ${(i.wacc * 100).toFixed(1)}% (spread ${(spread * 100).toFixed(1)}pp). Crescer amplia a destruição — reduza capital empregado ou reprecifique.`
          : `Neutro: ROIC ≈ WACC. O negócio remunera exatamente o custo de capital; o valor vem de crescimento com spread, não do nível atual.`,
    formula: 'EVA = (ROIC − WACC)·CapitalInvestido ; ROIC = NOPAT/CapitalInvestido',
  }
}

export interface CapitalAllocationInput {
  roic: number
  wacc: number
  growthRate: number // crescimento sustentável esperado (decimal)
}

export interface CapitalAllocationResult {
  recommendation: 'reinvestir' | 'recomprar' | 'desalavancar'
  spread: number
  rationale: string
}

/**
 * Regra de alocação de capital (value-based):
 *  - spread positivo E crescimento > 0 → reinvestir (o capital compõe acima do custo);
 *  - spread positivo mas sem crescimento → recomprar (devolver caixa, sem reinvestimento acretivo);
 *  - spread ~ zero → recomprar (indiferente reinvestir; melhor devolver ao acionista);
 *  - spread negativo → desalavancar (encolher o capital que destrói valor).
 */
export function capitalAllocation(i: CapitalAllocationInput): CapitalAllocationResult {
  const spread = i.roic - i.wacc
  let recommendation: CapitalAllocationResult['recommendation']
  let rationale: string

  if (spread < -SPREAD_BAND) {
    recommendation = 'desalavancar'
    rationale = `ROIC abaixo do WACC (spread ${(spread * 100).toFixed(1)}pp): reinvestir destrói valor. Reduza capital empregado e amortize dívida até restaurar o spread.`
  } else if (spread > SPREAD_BAND && i.growthRate > 0) {
    recommendation = 'reinvestir'
    rationale = `Spread positivo (+${(spread * 100).toFixed(1)}pp) com crescimento de ${(i.growthRate * 100).toFixed(1)}%: reinvestir compõe valor acima do custo de capital. Priorize capex/M&A orgânico acretivo.`
  } else {
    recommendation = 'recomprar'
    rationale =
      spread > SPREAD_BAND
        ? `Spread positivo mas sem crescimento (${(i.growthRate * 100).toFixed(1)}%): sem projeto acretivo, devolva capital via recompra/dividendo em vez de reter caixa ocioso.`
        : `Spread ~ nulo: reinvestir não cria nem destrói valor. Devolver capital ao acionista (recompra) é a alocação de menor risco.`
  }

  return { recommendation, spread, rationale }
}

export interface ValueDriverInput {
  nopat: number
  revenue: number
  investedCapital: number
  wacc: number
}

export interface ValueDriverResult {
  nopatMargin: number      // NOPAT/Receita
  capitalTurnover: number  // Receita/CapitalInvestido
  roic: number             // margem · giro (decomposição DuPont)
  spread: number
  economicProfit: number
  note: string
  formula: string
}

/**
 * Decomposição DuPont do ROIC em value drivers:
 *   ROIC = (NOPAT/Receita) · (Receita/CapitalInvestido) = margem NOPAT · giro de capital.
 * Separa a alavanca de rentabilidade da alavanca de eficiência de capital.
 */
export function valueDrivers(i: ValueDriverInput): ValueDriverResult {
  const nopatMargin = i.revenue === 0 ? 0 : i.nopat / i.revenue
  const capitalTurnover = i.investedCapital === 0 ? 0 : i.revenue / i.investedCapital
  const roic = nopatMargin * capitalTurnover
  const spread = roic - i.wacc
  const economicProfit = spread * i.investedCapital
  return {
    nopatMargin,
    capitalTurnover,
    roic,
    spread,
    economicProfit,
    note: `ROIC ${(roic * 100).toFixed(1)}% = margem NOPAT ${(nopatMargin * 100).toFixed(1)}% × giro de capital ${capitalTurnover.toFixed(2)}x. Melhore a alavanca mais fraca: preço/custo (margem) ou eficiência de ativos (giro).`,
    formula: 'ROIC = (NOPAT/Receita)·(Receita/CapitalInvestido)',
  }
}

// Classifica um spread (ROIC − WACC) em cria/destrói/neutro usando a banda de indiferença.
// Fonte única da regra de veredito, reutilizada pelas análises abaixo.
function classifySpread(spread: number): RoicWaccResult['verdict'] {
  return spread > SPREAD_BAND ? 'cria' : spread < -SPREAD_BAND ? 'destroi' : 'neutro'
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Ponte de EVA (economic profit bridge) — decompõe a variação do EVA entre dois
// períodos. Como EVA = (ROIC−WACC)·CapitalInvestido = NOPAT − WACC·CapitalInvestido,
// oferecemos DUAS decomposições exatas e equivalentes (ambas somam exatamente ΔEVA):
//   • por produto (spread × capital): efeito spread + efeito crescimento de capital +
//     termo de interação;
//   • aditiva (NOPAT − encargo de capital): efeito margem/NOPAT + efeito encargo de capital.
// ─────────────────────────────────────────────────────────────────────────────

export interface EconomicProfitBridgeInput {
  nopatStart: number
  nopatEnd: number
  investedCapitalStart: number
  investedCapitalEnd: number
  wacc: number
}

export interface EconomicProfitBridgeResult {
  evaStart: number
  evaEnd: number
  deltaEva: number
  roicStart: number
  roicEnd: number
  spreadStart: number
  spreadEnd: number
  // Decomposição por produto (spread × capital) — soma exatamente ΔEVA:
  spreadEffect: number          // Δspread · CapitalInicial
  capitalGrowthEffect: number   // spreadInicial · ΔCapital
  interactionEffect: number     // Δspread · ΔCapital
  // Decomposição aditiva equivalente (NOPAT − encargo de capital) — soma exatamente ΔEVA:
  nopatEffect: number           // ΔNOPAT (efeito margem/lucro operacional)
  capitalChargeEffect: number   // −WACC · ΔCapital (encargo de capital adicional)
  note: string
  formula: string
}

/**
 * Decompõe ΔEVA entre dois períodos em componentes exatos (cada decomposição soma ΔEVA).
 * WACC é tratado como constante entre os períodos (custo de capital de referência).
 */
export function economicProfitBridge(i: EconomicProfitBridgeInput): EconomicProfitBridgeResult {
  const roicStart = i.investedCapitalStart === 0 ? 0 : i.nopatStart / i.investedCapitalStart
  const roicEnd = i.investedCapitalEnd === 0 ? 0 : i.nopatEnd / i.investedCapitalEnd
  const spreadStart = roicStart - i.wacc
  const spreadEnd = roicEnd - i.wacc
  const evaStart = spreadStart * i.investedCapitalStart
  const evaEnd = spreadEnd * i.investedCapitalEnd
  const deltaEva = evaEnd - evaStart

  const dSpread = spreadEnd - spreadStart
  const dCapital = i.investedCapitalEnd - i.investedCapitalStart

  // Decomposição por produto (spread × capital).
  const spreadEffect = dSpread * i.investedCapitalStart
  const capitalGrowthEffect = spreadStart * dCapital
  const interactionEffect = dSpread * dCapital

  // Decomposição aditiva (NOPAT − encargo de capital).
  const nopatEffect = i.nopatEnd - i.nopatStart
  const capitalChargeEffect = -i.wacc * dCapital

  const direcao = deltaEva > 0 ? 'aumentou' : deltaEva < 0 ? 'caiu' : 'ficou estável'
  return {
    evaStart,
    evaEnd,
    deltaEva,
    roicStart,
    roicEnd,
    spreadStart,
    spreadEnd,
    spreadEffect,
    capitalGrowthEffect,
    interactionEffect,
    nopatEffect,
    capitalChargeEffect,
    note: `EVA ${direcao} ${deltaEva.toFixed(1)} (de ${evaStart.toFixed(1)} para ${evaEnd.toFixed(1)}). Efeito spread ${spreadEffect.toFixed(1)}, efeito crescimento de capital ${capitalGrowthEffect.toFixed(1)}, interação ${interactionEffect.toFixed(1)}. Visão aditiva: efeito margem/NOPAT ${nopatEffect.toFixed(1)} menos encargo de capital adicional ${(-capitalChargeEffect).toFixed(1)}.`,
    formula: 'ΔEVA = Δspread·IC₀ + spread₀·ΔIC + Δspread·ΔIC = ΔNOPAT − WACC·ΔIC',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) Árvore de value drivers — cadeia completa Receita → EBIT → NOPAT → ROIC
// (margem × giro) → spread → EVA. Aceita CapitalInvestido OU giro de capital
// (deriva o que faltar) para a UI renderizar cada nó como um nó de árvore.
// ─────────────────────────────────────────────────────────────────────────────

export interface ValueDriverTreeInput {
  revenue: number
  ebitMargin: number   // EBIT/Receita (decimal)
  taxRate: number      // alíquota efetiva (decimal)
  wacc: number
  investedCapital?: number // informe isto OU capitalTurnover
  capitalTurnover?: number // Receita/CapitalInvestido
}

export interface ValueDriverTreeNode {
  key: string
  label: string
  value: number
  unit: 'currency' | 'percent' | 'ratio'
  formula: string
}

export interface ValueDriverTreeResult {
  revenue: number
  ebit: number
  nopat: number
  nopatMargin: number
  capitalTurnover: number
  investedCapital: number
  roic: number
  spread: number
  eva: number
  nodes: ValueDriverTreeNode[]
  note: string
  formula: string
}

/**
 * Constrói a árvore de value drivers. Prioriza `investedCapital` quando fornecido
 * (deriva o giro); caso contrário usa `capitalTurnover` (deriva o capital).
 */
export function valueDriverTree(i: ValueDriverTreeInput): ValueDriverTreeResult {
  if (i.investedCapital == null && i.capitalTurnover == null) {
    throw new Error('valueDriverTree: informe investedCapital OU capitalTurnover.')
  }

  const ebit = i.revenue * i.ebitMargin
  const nopat = ebit * (1 - i.taxRate)
  const nopatMargin = i.revenue === 0 ? 0 : nopat / i.revenue

  // Capital investido e giro são consistentes: giro = Receita/Capital.
  const investedCapital =
    i.investedCapital != null
      ? i.investedCapital
      : (i.capitalTurnover ?? 0) === 0
        ? 0
        : i.revenue / (i.capitalTurnover as number)
  const capitalTurnover =
    i.investedCapital != null
      ? (i.investedCapital === 0 ? 0 : i.revenue / i.investedCapital)
      : (i.capitalTurnover as number)

  const roic = nopatMargin * capitalTurnover
  const spread = roic - i.wacc
  const eva = spread * investedCapital

  const nodes: ValueDriverTreeNode[] = [
    { key: 'revenue', label: 'Receita', value: i.revenue, unit: 'currency', formula: 'Receita' },
    { key: 'ebit', label: 'EBIT', value: ebit, unit: 'currency', formula: 'EBIT = Receita·margem EBIT' },
    { key: 'nopat', label: 'NOPAT', value: nopat, unit: 'currency', formula: 'NOPAT = EBIT·(1−T)' },
    { key: 'nopatMargin', label: 'Margem NOPAT', value: nopatMargin, unit: 'percent', formula: 'Margem NOPAT = NOPAT/Receita' },
    { key: 'capitalTurnover', label: 'Giro de capital', value: capitalTurnover, unit: 'ratio', formula: 'Giro = Receita/CapitalInvestido' },
    { key: 'investedCapital', label: 'Capital investido', value: investedCapital, unit: 'currency', formula: 'CapitalInvestido = Receita/Giro' },
    { key: 'roic', label: 'ROIC', value: roic, unit: 'percent', formula: 'ROIC = margem NOPAT × giro' },
    { key: 'spread', label: 'Spread (ROIC−WACC)', value: spread, unit: 'percent', formula: 'Spread = ROIC − WACC' },
    { key: 'eva', label: 'EVA', value: eva, unit: 'currency', formula: 'EVA = spread·CapitalInvestido' },
  ]

  return {
    revenue: i.revenue,
    ebit,
    nopat,
    nopatMargin,
    capitalTurnover,
    investedCapital,
    roic,
    spread,
    eva,
    nodes,
    note: `Receita ${i.revenue.toFixed(0)} → EBIT ${ebit.toFixed(0)} → NOPAT ${nopat.toFixed(0)} → ROIC ${(roic * 100).toFixed(1)}% (margem ${(nopatMargin * 100).toFixed(1)}% × giro ${capitalTurnover.toFixed(2)}x) → spread ${(spread * 100).toFixed(1)}pp → EVA ${eva.toFixed(0)}.`,
    formula: 'Receita → EBIT=(Receita·margem) → NOPAT=EBIT·(1−T) → ROIC=margem·giro → spread=ROIC−WACC → EVA=spread·IC',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Valor do crescimento (reinvestment value) — com g = taxa de reinvestimento ×
// ROIC, compara o VP de reinvestir (menor FCF hoje, NOPAT crescente) contra devolver
// todo o capital (FCF pleno, NOPAT constante) ao longo de N anos. Se ROIC<WACC, o
// crescimento destrói valor (resultado clássico de Damodaran/Koller).
// ─────────────────────────────────────────────────────────────────────────────

export interface ReinvestmentValueInput {
  nopat: number            // NOPAT do ano-base
  reinvestmentRate: number // fração do NOPAT reinvestida (decimal)
  roic: number             // ROIC marginal do reinvestimento (decimal)
  wacc: number
  years: number            // horizonte explícito (inteiro > 0)
}

export interface ReinvestmentValueResult {
  growthRate: number   // g = reinvestmentRate · ROIC
  spread: number       // ROIC − WACC
  pvReinvest: number   // VP do FCF reinvestindo (NOPAT cresce a g)
  pvPayout: number     // VP do FCF devolvendo tudo (NOPAT constante)
  valueOfGrowth: number // pvReinvest − pvPayout
  createsValue: boolean
  verdict: 'cria' | 'destroi' | 'neutro'
  note: string
  formula: string
}

/**
 * Quantifica o valor criado (ou destruído) pelo reinvestimento vs. distribuir capital.
 * Horizonte finito (`years`) para permanecer determinístico e convergente mesmo com g≥WACC.
 */
export function reinvestmentValue(i: ReinvestmentValueInput): ReinvestmentValueResult {
  const g = i.reinvestmentRate * i.roic
  const spread = i.roic - i.wacc

  // Forma fechada do valor do crescimento (Koller/Damodaran), não a soma de horizonte
  // finito — esta última trunca o benefício do crescimento e quebra a neutralidade
  // ROIC=WACC. Perpetuidade sem crescimento (devolver tudo) = NOPAT/WACC; perpetuidade
  // crescente (reinvestir) = NOPAT·(1−rr)/(WACC−g). Como g = rr·ROIC, a diferença reduz a:
  //   VP do crescimento = NOPAT·rr·(ROIC−WACC) / [WACC·(WACC−g)]
  // → sinal governado por (ROIC−WACC): >0 cria, =0 neutro, <0 destrói.
  const pvPayout = i.wacc > 0 ? i.nopat / i.wacc : NaN
  let valueOfGrowth: number
  const denom = i.wacc * (i.wacc - g)
  if (Math.abs(i.wacc - g) < 1e-9) {
    // Singularidade g→WACC: a perpetuidade crescente diverge. O sinal ainda é o do spread;
    // usamos um teto grande e proporcional para exibição (o crescimento é fortemente
    // acretivo/destrutivo, tendendo ao ilimitado se o spread persistir).
    valueOfGrowth = Math.abs(spread) < 1e-12 ? 0 : Math.sign(spread) * Math.abs(pvPayout) * 100
  } else {
    valueOfGrowth = (i.nopat * i.reinvestmentRate * spread) / denom
  }
  const pvReinvest = pvPayout + valueOfGrowth
  const verdict = classifySpread(spread)
  const createsValue = valueOfGrowth > 1e-9

  return {
    growthRate: g,
    spread,
    pvReinvest,
    pvPayout,
    valueOfGrowth,
    createsValue,
    verdict,
    note:
      verdict === 'destroi'
        ? `Crescimento destrói valor: ROIC ${(i.roic * 100).toFixed(1)}% < WACC ${(i.wacc * 100).toFixed(1)}%. Reinvestir (g ${(g * 100).toFixed(1)}%) reduz o FCF hoje sem compensar no custo de capital — VP do crescimento ${valueOfGrowth.toFixed(1)}. Devolva capital em vez de crescer.`
        : verdict === 'cria'
          ? `Crescimento cria valor: ROIC ${(i.roic * 100).toFixed(1)}% > WACC ${(i.wacc * 100).toFixed(1)}%. Reinvestir a g ${(g * 100).toFixed(1)}% agrega VP de ${valueOfGrowth.toFixed(1)} sobre devolver capital — priorize crescimento acretivo.`
          : `Crescimento neutro: ROIC ≈ WACC. Reinvestir ou devolver capital gera VP equivalente (${valueOfGrowth.toFixed(1)}); o crescimento não altera valor.`,
    formula: 'g = rr·ROIC ; VP = Σ FCF_t/(1+WACC)^t ; valorDoCrescimento = VP(reinveste) − VP(devolve)',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) Crescimento sustentável (sustainable growth rate) — g* = retenção × ROE.
// Aceita ROE direto OU deriva de ROIC + alavancagem (aproximação pelo multiplicador
// de capital próprio: ROE ≈ ROIC·(1+D/E)). Sinaliza necessidade de financiamento
// externo quando o crescimento-alvo excede g*.
// ─────────────────────────────────────────────────────────────────────────────

export interface SustainableGrowthInput {
  payoutRatio: number   // fração do lucro distribuída (decimal)
  roe?: number          // informe isto OU (roic + leverage)
  roic?: number
  leverage?: number     // D/E (dívida/patrimônio)
  targetGrowth?: number // crescimento-alvo para comparar com g* (opcional)
}

export interface SustainableGrowthResult {
  roe: number
  retentionRatio: number       // 1 − payout
  sustainableGrowth: number    // g* = retenção · ROE
  targetGrowth: number | null
  fundingGap: number | null    // alvo − g* (>0 exige financiamento externo)
  needsExternalFinancing: boolean
  note: string
  formula: string
}

/**
 * Taxa de crescimento sustentável g* = retenção · ROE, autofinanciada sem alterar a
 * estrutura de capital. `roe` derivado de ROIC·(1+D/E) quando não informado (aproximação).
 */
export function sustainableGrowth(i: SustainableGrowthInput): SustainableGrowthResult {
  let roe: number
  if (i.roe != null) {
    roe = i.roe
  } else if (i.roic != null && i.leverage != null) {
    // Aproximação DuPont: ROE ≈ ROIC · multiplicador de capital próprio (1 + D/E).
    roe = i.roic * (1 + i.leverage)
  } else {
    throw new Error('sustainableGrowth: informe roe OU (roic + leverage).')
  }

  const retentionRatio = 1 - i.payoutRatio
  const g = retentionRatio * roe
  const targetGrowth = i.targetGrowth ?? null
  const fundingGap = targetGrowth == null ? null : targetGrowth - g
  const needsExternalFinancing = fundingGap != null && fundingGap > 0

  return {
    roe,
    retentionRatio,
    sustainableGrowth: g,
    targetGrowth,
    fundingGap,
    needsExternalFinancing,
    note: needsExternalFinancing
      ? `Crescimento-alvo ${((targetGrowth as number) * 100).toFixed(1)}% acima do sustentável g* ${(g * 100).toFixed(1)}% (retenção ${(retentionRatio * 100).toFixed(0)}% × ROE ${(roe * 100).toFixed(1)}%). Gap de ${((fundingGap as number) * 100).toFixed(1)}pp exige financiamento externo (dívida/emissão) ou menor payout.`
      : `Crescimento sustentável g* ${(g * 100).toFixed(1)}% = retenção ${(retentionRatio * 100).toFixed(0)}% × ROE ${(roe * 100).toFixed(1)}%. Até esse ritmo o crescimento é autofinanciado, sem captar capital externo.`,
    formula: 'g* = (1 − payout)·ROE ; ROE ≈ ROIC·(1 + D/E)',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) Sensibilidade ao WACC — varre uma faixa de WACC e calcula ROIC (constante),
// spread, EVA e um valor de referência (perpetuidade sem crescimento NOPAT/WACC)
// para uma mini análise de sensibilidade na UI.
// ─────────────────────────────────────────────────────────────────────────────

export interface WaccSensitivityBase {
  nopat: number
  investedCapital: number
}

export interface WaccSensitivityRow {
  wacc: number
  roic: number
  spread: number
  eva: number
  enterpriseValue: number // NOPAT/WACC (perpetuidade sem crescimento)
  verdict: RoicWaccResult['verdict']
}

export interface WaccSensitivityResult {
  rows: WaccSensitivityRow[]
  note: string
  formula: string
}

/** EVA e valor de referência ao longo de uma faixa de WACC (ROIC fixo pelo NOPAT/capital). */
export function sensitivityToWacc(base: WaccSensitivityBase, waccRange: number[]): WaccSensitivityResult {
  const roic = base.investedCapital === 0 ? 0 : base.nopat / base.investedCapital
  const rows: WaccSensitivityRow[] = waccRange.map(wacc => {
    const spread = roic - wacc
    return {
      wacc,
      roic,
      spread,
      eva: spread * base.investedCapital,
      enterpriseValue: wacc === 0 ? 0 : base.nopat / wacc,
      verdict: classifySpread(spread),
    }
  })
  return {
    rows,
    note: `ROIC fixo em ${(roic * 100).toFixed(1)}%. À medida que o WACC sobe, spread e EVA caem; o ponto de indiferença (EVA=0) é WACC=ROIC. Valor de referência = NOPAT/WACC (perpetuidade sem crescimento).`,
    formula: 'Para cada WACC: spread = ROIC − WACC ; EVA = spread·IC ; EV = NOPAT/WACC',
  }
}

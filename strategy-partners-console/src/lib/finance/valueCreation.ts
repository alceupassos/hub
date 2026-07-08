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

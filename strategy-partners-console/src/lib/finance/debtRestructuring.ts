// ─────────────────────────────────────────────────────────────────────────────
// Reestruturação de dívida — analytics de crédito para o assessor estratégico.
//
// Cobre o que uma mesa de reestruturação/turnaround confere primeiro: a tabela de
// amortização (bullet / linear-SAC / francês-PRICE), os índices de cobertura
// (DSCR e ICR), a folga de covenants (leverage e cobertura) e a comparação de
// refinanciamento (custo all-in, serviço anual e VPL da economia de juros).
//
// Convenções (padrão de mesa, defensáveis e auditáveis):
//   • Juros incidem sobre o saldo de ABERTURA de cada ano.
//   • bullet   → só juros ao longo da vida; principal 100% no último ano.
//   • linear   → amortização de principal constante (SAC); juros decrescentes.
//   • francês  → prestação (juros+principal) CONSTANTE (Price/PMT).
//   • A soma das amortizações de principal fecha SEMPRE com o principal original.
// Tudo é matemática pura e determinística (sem LLM, sem aleatoriedade).
// ─────────────────────────────────────────────────────────────────────────────

import { npv } from './irr'

export type AmortizationType = 'bullet' | 'linear' | 'french'

export interface AmortizationRow {
  year: number
  beginningBalance: number
  payment: number          // serviço da dívida no ano (juros + amortização)
  interest: number
  principalPayment: number
  endingBalance: number
}

export interface AmortizationSummary {
  rows: AmortizationRow[]
  totalInterest: number
  totalPayments: number    // custo all-in nominal (principal + juros)
  type: AmortizationType
  formula: string
}

/**
 * Tabela de amortização por tipo.
 *  - bullet: paga só juros; principal integral no ano final.
 *  - linear (SAC): amortização de principal constante = principal/anos.
 *  - french (Price): prestação constante = P·r/(1−(1+r)^−n) (r=0 → P/n).
 * A soma das amortizações de principal é sempre igual ao principal.
 */
export function amortizationSchedule(
  principal: number,
  rate: number,
  years: number,
  type: AmortizationType,
): AmortizationSummary {
  const rows: AmortizationRow[] = []
  let balance = principal
  let totalInterest = 0
  let totalPayments = 0

  // Prestação constante do sistema francês (Price).
  const frenchPayment =
    rate === 0 ? principal / years : (principal * rate) / (1 - Math.pow(1 + rate, -years))
  const linearPrincipal = principal / years

  for (let year = 1; year <= years; year++) {
    const beginningBalance = balance
    const interest = beginningBalance * rate
    let principalPayment: number

    if (type === 'bullet') {
      principalPayment = year === years ? beginningBalance : 0
    } else if (type === 'linear') {
      // No último ano zera qualquer resíduo de arredondamento.
      principalPayment = year === years ? beginningBalance : linearPrincipal
    } else {
      // francês: amortização = prestação − juros; último ano quita o saldo.
      principalPayment = year === years ? beginningBalance : frenchPayment - interest
    }

    const payment = interest + principalPayment
    balance = beginningBalance - principalPayment
    totalInterest += interest
    totalPayments += payment
    rows.push({ year, beginningBalance, payment, interest, principalPayment, endingBalance: balance })
  }

  return {
    rows,
    totalInterest,
    totalPayments,
    type,
    formula:
      type === 'french'
        ? 'PMT = P·r/(1−(1+r)^−n) — prestação constante'
        : type === 'linear'
          ? 'Amortização = P/n (SAC); juros sobre saldo de abertura'
          : 'Bullet — só juros; principal integral no vencimento',
  }
}

export interface CoverageInput {
  ebitda: number       // EBITDA (ou CFADS) do período
  debtService: number  // serviço total da dívida (juros + amortização)
  interest: number     // só a parcela de juros
}

export interface CoverageResult {
  dscr: number   // Debt Service Coverage Ratio = EBITDA / serviço da dívida
  icr: number    // Interest Coverage Ratio = EBITDA / juros
  note: string
}

/** DSCR = EBITDA/serviço da dívida ; ICR = EBITDA/juros. >1 cobre a obrigação. */
export function coverageRatios(i: CoverageInput): CoverageResult {
  const dscr = i.debtService === 0 ? Infinity : i.ebitda / i.debtService
  const icr = i.interest === 0 ? Infinity : i.ebitda / i.interest
  const conforto =
    dscr >= 1.5 ? 'confortável' : dscr >= 1.2 ? 'apertado' : dscr >= 1 ? 'no limite' : 'insuficiente'
  return {
    dscr,
    icr,
    note: `DSCR ${Number.isFinite(dscr) ? dscr.toFixed(2) : '∞'}x (${conforto}); ICR ${Number.isFinite(icr) ? icr.toFixed(2) : '∞'}x. DSCR<1 indica que o caixa operacional não cobre o serviço da dívida.`,
  }
}

export interface CovenantInput {
  netDebt: number
  ebitda: number
  maxLeverage: number     // teto de Dívida Líquida/EBITDA (ex.: 3.5x)
  minCoverage: number     // piso de cobertura (ex.: 1.25x)
  actualCoverage: number  // DSCR/ICR observado
}

export interface CovenantResult {
  actualLeverage: number
  leverageHeadroom: number     // teto − atual, em turns (positivo = folga)
  leverageBreach: boolean
  coverageHeadroom: number     // atual − piso (positivo = folga)
  coverageBreach: boolean
  maxNetDebtAllowed: number    // teto·EBITDA
  ebitdaCushionPct: number     // quanto o EBITDA pode cair antes de estourar o leverage
  anyBreach: boolean
  note: string
}

/** Folga de covenants: leverage vs. teto e cobertura vs. piso, com flags de quebra. */
export function covenantHeadroom(i: CovenantInput): CovenantResult {
  const actualLeverage = i.ebitda === 0 ? Infinity : i.netDebt / i.ebitda
  const leverageHeadroom = i.maxLeverage - actualLeverage
  const leverageBreach = actualLeverage > i.maxLeverage
  const coverageHeadroom = i.actualCoverage - i.minCoverage
  const coverageBreach = i.actualCoverage < i.minCoverage
  const maxNetDebtAllowed = i.maxLeverage * i.ebitda
  // EBITDA mínimo que ainda respeita o teto = netDebt/maxLeverage; folga como % do EBITDA atual.
  const minEbitda = i.maxLeverage === 0 ? Infinity : i.netDebt / i.maxLeverage
  const ebitdaCushionPct = i.ebitda === 0 ? 0 : (i.ebitda - minEbitda) / i.ebitda
  const anyBreach = leverageBreach || coverageBreach
  return {
    actualLeverage,
    leverageHeadroom,
    leverageBreach,
    coverageHeadroom,
    coverageBreach,
    maxNetDebtAllowed,
    ebitdaCushionPct,
    anyBreach,
    note: anyBreach
      ? `QUEBRA de covenant: ${leverageBreach ? `alavancagem ${actualLeverage.toFixed(2)}x > teto ${i.maxLeverage}x` : ''}${leverageBreach && coverageBreach ? ' e ' : ''}${coverageBreach ? `cobertura ${i.actualCoverage.toFixed(2)}x < piso ${i.minCoverage}x` : ''}. Requer waiver ou reestruturação.`
      : `Dentro dos covenants: folga de ${leverageHeadroom.toFixed(2)}x de alavancagem e ${coverageHeadroom.toFixed(2)}x de cobertura. O EBITDA pode cair até ${(ebitdaCushionPct * 100).toFixed(0)}% antes de estourar o teto.`,
  }
}

export interface DebtProfile {
  principal: number
  rate: number
  years: number
  type: AmortizationType
}

export interface DebtCostSummary {
  totalInterest: number
  totalPayments: number       // custo all-in nominal
  averageAnnualService: number
  firstYearService: number
  effectiveInterestPct: number // juros totais / principal
}

export interface RefinancingComparison {
  current: DebtCostSummary
  proposed: DebtCostSummary
  totalInterestSaved: number      // atual − proposto (positivo = economia)
  annualServiceDelta: number      // serviço médio: proposto − atual (negativo = alívio)
  allInCostDelta: number          // custo all-in: proposto − atual (negativo = mais barato)
  npvInterestSavings: number      // VPL da economia de juros à taxa de desconto
  discountRate: number
  verdict: 'refinanciar' | 'manter' | 'neutro'
  note: string
}

function costSummary(p: DebtProfile): DebtCostSummary {
  const s = amortizationSchedule(p.principal, p.rate, p.years, p.type)
  return {
    totalInterest: s.totalInterest,
    totalPayments: s.totalPayments,
    averageAnnualService: s.totalPayments / p.years,
    firstYearService: s.rows[0]?.payment ?? 0,
    effectiveInterestPct: p.principal === 0 ? 0 : s.totalInterest / p.principal,
  }
}

/**
 * Compara a dívida atual com uma proposta de refinanciamento.
 * VPL da economia de juros = VPL(juros atuais) − VPL(juros propostos) à taxa de desconto
 * (default: a menor das duas taxas, como custo de oportunidade conservador).
 */
export function compareRefinancing(
  current: DebtProfile,
  proposed: DebtProfile,
  discountRate?: number,
): RefinancingComparison {
  const dr = discountRate ?? Math.min(current.rate, proposed.rate)
  const curSum = costSummary(current)
  const propSum = costSummary(proposed)

  const curInterest = amortizationSchedule(current.principal, current.rate, current.years, current.type).rows.map(r => r.interest)
  const propInterest = amortizationSchedule(proposed.principal, proposed.rate, proposed.years, proposed.type).rows.map(r => r.interest)
  const npvInterestSavings = npv(dr, [0, ...curInterest]) - npv(dr, [0, ...propInterest])

  const totalInterestSaved = curSum.totalInterest - propSum.totalInterest
  const annualServiceDelta = propSum.averageAnnualService - curSum.averageAnnualService
  const allInCostDelta = propSum.totalPayments - curSum.totalPayments

  const verdict: RefinancingComparison['verdict'] =
    npvInterestSavings > 1e-6 ? 'refinanciar' : npvInterestSavings < -1e-6 ? 'manter' : 'neutro'

  return {
    current: curSum,
    proposed: propSum,
    totalInterestSaved,
    annualServiceDelta,
    allInCostDelta,
    npvInterestSavings,
    discountRate: dr,
    verdict,
    note:
      verdict === 'refinanciar'
        ? `Refinanciar cria valor: VPL da economia de juros = ${npvInterestSavings.toFixed(2)} (juros totais −${totalInterestSaved.toFixed(2)}). Considere custos de originação/pré-pagamento não modelados aqui.`
        : verdict === 'manter'
          ? `Manter a dívida atual: a proposta tem VPL de juros ${(-npvInterestSavings).toFixed(2)} MAIOR. Só refinanciar se houver ganho de prazo/covenant não capturado no custo.`
          : 'Indiferente em VPL de juros — decida pelo prazo, covenants e liquidez.',
  }
}

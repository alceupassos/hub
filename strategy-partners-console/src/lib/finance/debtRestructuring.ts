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
  ebitda: number         // EBITDA (ou CFADS) do período
  debtService: number    // serviço total da dívida (juros + amortização)
  interest: number       // só a parcela de juros
  /**
   * Encargos fixos recorrentes ANTES do serviço da dívida — tipicamente aluguéis/
   * leasing operacional (a parte "R" do EBITDAR). Opcional: quando informado,
   * habilita o FCCR sem alterar DSCR/ICR. Ausência ⇒ FCCR não é calculado.
   */
  fixedCharges?: number
}

export interface CoverageResult {
  dscr: number   // Debt Service Coverage Ratio = EBITDA / serviço da dívida
  icr: number    // Interest Coverage Ratio = EBITDA / juros
  /**
   * FCCR (Fixed-Charge Coverage Ratio) = (EBITDA + encargos fixos) / (serviço da
   * dívida + encargos fixos). Só presente quando `fixedCharges` é informado.
   * Trata aluguéis/leasing como obrigação fixa equivalente ao serviço da dívida —
   * é o índice preferido por credores quando há passivo de leasing relevante.
   */
  fccr?: number
  ebitdar?: number // EBITDA + encargos fixos (numerador do FCCR). Só quando aplicável.
  note: string
}

/** DSCR = EBITDA/serviço da dívida ; ICR = EBITDA/juros. >1 cobre a obrigação. */
export function coverageRatios(i: CoverageInput): CoverageResult {
  const dscr = i.debtService === 0 ? Infinity : i.ebitda / i.debtService
  const icr = i.interest === 0 ? Infinity : i.ebitda / i.interest
  const conforto =
    dscr >= 1.5 ? 'confortável' : dscr >= 1.2 ? 'apertado' : dscr >= 1 ? 'no limite' : 'insuficiente'

  // FCCR só entra quando há encargos fixos declarados (mantém a forma de saída p/ chamadas antigas).
  const hasFixed = i.fixedCharges !== undefined
  const fixed = i.fixedCharges ?? 0
  const ebitdar = hasFixed ? i.ebitda + fixed : undefined
  const fccrDenominator = i.debtService + fixed
  const fccr = hasFixed
    ? fccrDenominator === 0
      ? Infinity
      : (i.ebitda + fixed) / fccrDenominator
    : undefined

  const baseNote = `DSCR ${Number.isFinite(dscr) ? dscr.toFixed(2) : '∞'}x (${conforto}); ICR ${Number.isFinite(icr) ? icr.toFixed(2) : '∞'}x. DSCR<1 indica que o caixa operacional não cobre o serviço da dívida.`
  const fccrNote =
    fccr !== undefined
      ? ` FCCR ${Number.isFinite(fccr) ? fccr.toFixed(2) : '∞'}x (inclui encargos fixos de ${fixed} — aluguéis/leasing tratados como obrigação fixa).`
      : ''

  return {
    dscr,
    icr,
    ...(fccr !== undefined ? { fccr } : {}),
    ...(ebitdar !== undefined ? { ebitdar } : {}),
    note: baseNote + fccrNote,
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

// ─────────────────────────────────────────────────────────────────────────────
// Reestruturação / distressed — cascata de credores, DSCR plurianual, alavancas
// de reestruturação e taxa de equilíbrio. Aditivos: não alteram nada acima.
// ─────────────────────────────────────────────────────────────────────────────

export interface WaterfallTrancheInput {
  name: string
  amount: number     // valor de face reclamado pela tranche (claim)
  seniority: number  // MENOR = mais sênior (recebe primeiro). Empate ⇒ pari passu (pro-rata).
  rate: number       // cupom (referência de mercado; não altera a distribuição da recuperação)
}

export interface WaterfallTranche {
  name: string
  seniority: number
  rate: number
  claim: number       // = amount
  recovery: number    // quanto a tranche recebe do valor de recuperação
  recoveryPct: number // recovery / claim (0..1)
  shortfall: number   // claim − recovery (≥ 0)
}

export interface WaterfallResult {
  tranches: WaterfallTranche[] // ordenadas por senioridade (mais sênior primeiro)
  totalClaims: number
  totalRecovery: number   // = min(recoveryValue, totalClaims) efetivamente distribuído
  totalShortfall: number  // totalClaims − totalRecovery
  residual: number        // sobra ao equity após quitar TODOS os credores (≥ 0)
  fullyRecovered: number  // nº de tranches recuperadas 100%
  blendedRecoveryPct: number // totalRecovery / totalClaims (recuperação média ponderada)
  note: string
}

/**
 * Cascata de recuperação (debt waterfall) para reestruturação/distressed.
 * Distribui um valor de recuperação (enterprise value/colateral liquidado) entre
 * credores por senioridade: a tranche mais sênior é paga integralmente antes de a
 * próxima receber qualquer coisa. Tranches de MESMA senioridade dividem pari passu
 * (pro-rata pelo claim). O que sobra depois de todos os credores é o resíduo ao equity.
 */
export function debtWaterfall(
  tranches: WaterfallTrancheInput[],
  recoveryValue: number,
): WaterfallResult {
  // Ordena por senioridade ascendente (1 = mais sênior). Estável o suficiente p/ auditoria.
  const sorted = [...tranches].sort((a, b) => a.seniority - b.seniority)
  let remaining = Math.max(0, recoveryValue)
  const result: WaterfallTranche[] = []

  // Percorre em grupos de mesma senioridade (pari passu dentro do grupo).
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j < sorted.length && sorted[j].seniority === sorted[i].seniority) j++
    const group = sorted.slice(i, j)
    const groupClaim = group.reduce((a, t) => a + t.amount, 0)
    const available = remaining

    for (const t of group) {
      const claim = t.amount
      const recovery =
        available >= groupClaim
          ? claim // grupo inteiro coberto
          : groupClaim === 0
            ? 0
            : (claim / groupClaim) * available // rateio pro-rata
      result.push({
        name: t.name,
        seniority: t.seniority,
        rate: t.rate,
        claim,
        recovery,
        recoveryPct: claim === 0 ? 1 : recovery / claim,
        shortfall: Math.max(0, claim - recovery),
      })
    }
    // Consome do valor disponível o que foi efetivamente pago a este grupo.
    remaining = Math.max(0, remaining - groupClaim)
    i = j
  }

  const totalClaims = result.reduce((a, t) => a + t.claim, 0)
  const totalRecovery = result.reduce((a, t) => a + t.recovery, 0)
  const totalShortfall = totalClaims - totalRecovery
  const residual = Math.max(0, Math.max(0, recoveryValue) - totalClaims)
  const fullyRecovered = result.filter(t => t.recoveryPct >= 1 - 1e-9).length
  const blendedRecoveryPct = totalClaims === 0 ? 1 : totalRecovery / totalClaims

  const impaired = result.find(t => t.recoveryPct > 1e-9 && t.recoveryPct < 1 - 1e-9)
  const note =
    totalRecovery >= totalClaims - 1e-9
      ? `Recuperação integral: os ${(recoveryValue).toFixed(2)} cobrem os ${totalClaims.toFixed(2)} de claims; resíduo de ${residual.toFixed(2)} ao equity.`
      : `Recuperação parcial: ${(blendedRecoveryPct * 100).toFixed(1)}% dos claims. ${
          impaired ? `A tranche "${impaired.name}" é o fulcro (recupera ${(impaired.recoveryPct * 100).toFixed(1)}%); ` : ''
        }tranches mais juniores zeram. Shortfall total de ${totalShortfall.toFixed(2)}.`

  return {
    tranches: result,
    totalClaims,
    totalRecovery,
    totalShortfall,
    residual,
    fullyRecovered,
    blendedRecoveryPct,
    note,
  }
}

export interface DscrScheduleRow {
  year: number
  ebitda: number
  debtService: number
  dscr: number         // ebitda / serviço da dívida (Infinity se serviço = 0)
  belowFloor: boolean  // dscr < piso
}

export interface DscrScheduleResult {
  rows: DscrScheduleRow[]
  minDscr: number       // menor DSCR finito ao longo da vida
  minDscrYear: number   // ano em que ocorre o menor DSCR
  avgDscr: number       // média dos DSCR finitos
  floor: number
  yearsBelowFloor: number[] // anos com DSCR < piso
  anyBelowFloor: boolean
  note: string
}

/**
 * DSCR ano a ano ao longo de TODA a amortização (não só o ano 1).
 * Cruza o EBITDA projetado por ano com o serviço da dívida de cada linha da tabela
 * de amortização, alinhando por índice. Sinaliza o DSCR mínimo (o ano-gargalo) e os
 * anos que furam o piso de covenant — é onde a reestruturação precisa atuar.
 */
export function dscrSchedule(
  ebitdaByYear: number[],
  schedule: AmortizationRow[],
  floor = 1.0,
): DscrScheduleResult {
  const n = Math.min(ebitdaByYear.length, schedule.length)
  const rows: DscrScheduleRow[] = []
  let minDscr = Infinity
  let minDscrYear = 0
  let finiteSum = 0
  let finiteCount = 0
  const yearsBelowFloor: number[] = []

  for (let k = 0; k < n; k++) {
    const ebitda = ebitdaByYear[k]
    const debtService = schedule[k].payment
    const year = schedule[k].year
    const dscr = debtService === 0 ? Infinity : ebitda / debtService
    const belowFloor = dscr < floor
    if (belowFloor) yearsBelowFloor.push(year)
    if (Number.isFinite(dscr)) {
      finiteSum += dscr
      finiteCount++
      if (dscr < minDscr) {
        minDscr = dscr
        minDscrYear = year
      }
    }
    rows.push({ year, ebitda, debtService, dscr, belowFloor })
  }

  const avgDscr = finiteCount === 0 ? Infinity : finiteSum / finiteCount
  const anyBelowFloor = yearsBelowFloor.length > 0

  const note =
    n === 0
      ? 'Sem anos para avaliar (EBITDA ou tabela vazios).'
      : anyBelowFloor
        ? `DSCR mínimo ${Number.isFinite(minDscr) ? minDscr.toFixed(2) : '∞'}x no ano ${minDscrYear}; ${yearsBelowFloor.length} ano(s) abaixo do piso ${floor}x (anos ${yearsBelowFloor.join(', ')}). O gargalo de caixa está aí — alongue prazo ou reduza serviço nesses anos.`
        : `DSCR sempre ≥ piso ${floor}x (mínimo ${Number.isFinite(minDscr) ? minDscr.toFixed(2) : '∞'}x no ano ${minDscrYear}). Estrutura sustentável no cenário projetado.`

  return { rows, minDscr, minDscrYear, avgDscr, floor, yearsBelowFloor, anyBelowFloor, note }
}

export interface RestructuringInput {
  principal: number
  rate: number
  years: number
  type: AmortizationType
  ebitda: number          // EBITDA anual (assumido constante para medir o DSCR de cada alavanca)
  discountRate: number    // taxa de desconto do CREDOR para o VPL do fluxo recebido
  floor?: number          // piso de DSCR usado no diagnóstico. default 1.2
  extensionYears?: number // anos adicionais de prazo (alavanca a). default 3
  couponHaircut?: number  // redução ABSOLUTA da taxa em decimal (alavanca b), ex.: 0.04 = −4 p.p. default 0.03
  principalHaircut?: number // haircut de principal em fração 0..1 (alavanca c). default 0.30
}

export type RestructuringLever = 'extensão de prazo' | 'redução de cupom' | 'haircut de principal'

export interface RestructuringOption {
  lever: RestructuringLever
  description: string
  principal: number
  rate: number
  years: number
  avgAnnualService: number
  firstYearService: number
  minDscr: number           // menor DSCR ao longo da vida (via dscrSchedule)
  npvToCreditor: number     // VPL do fluxo recebido pelo credor à discountRate
  serviceReliefPct: number  // (serviço médio base − novo)/base (>0 = alívio ao devedor)
  npvToCreditorDelta: number // novo − base (negativo = credor cede valor)
  dscrGain: number          // minDscr novo − base
}

export interface RestructuringResult {
  baseline: {
    principal: number
    rate: number
    years: number
    avgAnnualService: number
    firstYearService: number
    minDscr: number
    npvToCreditor: number
  }
  options: RestructuringOption[]
  ranked: RestructuringOption[] // do MAIOR alívio de DSCR ao devedor para o menor
  note: string
}

/**
 * Compara lado a lado as 3 alavancas clássicas de reestruturação sobre a MESMA dívida:
 *   (a) extensão de prazo (mais anos, mesmo cupom/principal);
 *   (b) redução de cupom (haircut na taxa, mesmo principal/prazo);
 *   (c) haircut de principal (perdão de face, mesmo cupom/prazo).
 * Para cada uma calcula o serviço anual, o impacto no DSCR (via dscrSchedule) e o VPL
 * ao credor (via npv). Retorna um ranking pelo alívio de DSCR ao devedor + nota em PT.
 * Perspectivas opostas: o devedor quer maior DSCR; o credor quer maior VPL.
 */
export function restructuringOptions(input: RestructuringInput): RestructuringResult {
  const floor = input.floor ?? 1.2
  const extensionYears = input.extensionYears ?? 3
  const couponHaircut = input.couponHaircut ?? 0.03
  const principalHaircut = input.principalHaircut ?? 0.3
  const ebitdaVec = (yrs: number) => new Array(yrs).fill(input.ebitda)

  const measure = (p: DebtProfile) => {
    const s = amortizationSchedule(p.principal, p.rate, p.years, p.type)
    const ds = dscrSchedule(ebitdaVec(p.years), s.rows, floor)
    return {
      avgAnnualService: p.years === 0 ? 0 : s.totalPayments / p.years,
      firstYearService: s.rows[0]?.payment ?? 0,
      minDscr: ds.minDscr,
      npvToCreditor: npv(input.discountRate, [0, ...s.rows.map(r => r.payment)]),
    }
  }

  const base = measure({ principal: input.principal, rate: input.rate, years: input.years, type: input.type })

  const build = (lever: RestructuringLever, description: string, p: DebtProfile): RestructuringOption => {
    const m = measure(p)
    return {
      lever,
      description,
      principal: p.principal,
      rate: p.rate,
      years: p.years,
      avgAnnualService: m.avgAnnualService,
      firstYearService: m.firstYearService,
      minDscr: m.minDscr,
      npvToCreditor: m.npvToCreditor,
      serviceReliefPct:
        base.avgAnnualService === 0 ? 0 : (base.avgAnnualService - m.avgAnnualService) / base.avgAnnualService,
      npvToCreditorDelta: m.npvToCreditor - base.npvToCreditor,
      dscrGain: m.minDscr - base.minDscr,
    }
  }

  const options: RestructuringOption[] = [
    build(
      'extensão de prazo',
      `Prazo de ${input.years} → ${input.years + extensionYears} anos (mesmo cupom e principal)`,
      { principal: input.principal, rate: input.rate, years: input.years + extensionYears, type: input.type },
    ),
    build(
      'redução de cupom',
      `Cupom de ${(input.rate * 100).toFixed(1)}% → ${((input.rate - couponHaircut) * 100).toFixed(1)}% (−${(couponHaircut * 100).toFixed(1)} p.p.)`,
      { principal: input.principal, rate: Math.max(0, input.rate - couponHaircut), years: input.years, type: input.type },
    ),
    build(
      'haircut de principal',
      `Perdão de ${(principalHaircut * 100).toFixed(0)}% do principal (${input.principal} → ${(input.principal * (1 - principalHaircut)).toFixed(2)})`,
      { principal: input.principal * (1 - principalHaircut), rate: input.rate, years: input.years, type: input.type },
    ),
  ]

  // Ranking pelo alívio ao DEVEDOR (maior DSCR primeiro); empate ⇒ menor sacrifício de VPL ao credor.
  const ranked = [...options].sort((a, b) => b.minDscr - a.minDscr || b.npvToCreditorDelta - a.npvToCreditorDelta)

  const top = ranked[0]
  const note =
    `As três alavancas reduzem o serviço anual e elevam o DSCR do devedor. Maior alívio de DSCR: ${top.lever} ` +
    `(DSCR mínimo ${Number.isFinite(top.minDscr) ? top.minDscr.toFixed(2) : '∞'}x). ` +
    `Trade-off para o credor: o haircut de principal costuma dar o maior fôlego ao devedor, mas é o que mais destrói VPL; ` +
    `a extensão de prazo preserva mais valor de face (mesmo cupom), ao custo de exposição por mais tempo.`

  return {
    baseline: {
      principal: input.principal,
      rate: input.rate,
      years: input.years,
      avgAnnualService: base.avgAnnualService,
      firstYearService: base.firstYearService,
      minDscr: base.minDscr,
      npvToCreditor: base.npvToCreditor,
    },
    options,
    ranked,
    note,
  }
}

export interface BreakEvenRateResult {
  rate: number              // maior taxa cujo serviço anual de PICO ≤ cap (0 se nem 0% cabe)
  annualServicePeak: number // serviço de pico nessa taxa
  cap: number               // teto de serviço acessível
  feasible: boolean         // false quando nem a 0% a dívida cabe no cap
  note: string
}

/**
 * Taxa de equilíbrio (break-even): a MAIOR taxa de juros cujo serviço anual de pico
 * ainda cabe num teto acessível (maxAffordableService), por bisseção. O "pico" é o
 * maior pagamento anual da tabela (o ano mais pesado — no bullet, o vencimento).
 * Como o serviço cresce monotonicamente com a taxa, a bisseção converge sempre.
 * Serve para ancorar o pedido de refinanciamento: "até que taxa este ativo aguenta".
 */
export function breakEvenRate(
  principal: number,
  years: number,
  type: AmortizationType,
  maxAffordableService: number,
): BreakEvenRateResult {
  const peak = (rate: number) => {
    const s = amortizationSchedule(principal, rate, years, type)
    return s.rows.reduce((m, r) => Math.max(m, r.payment), 0)
  }
  const cap = maxAffordableService

  // Se nem a 0% (só principal) cabe no teto, não há taxa viável.
  const peak0 = peak(0)
  if (peak0 > cap + 1e-9) {
    return {
      rate: 0,
      annualServicePeak: peak0,
      cap,
      feasible: false,
      note: `Inviável: mesmo a 0% o serviço de pico é ${peak0.toFixed(2)} > teto ${cap.toFixed(2)}. O principal/prazo já não cabe — é preciso alongar prazo ou reduzir principal antes de discutir taxa.`,
    }
  }

  let lo = 0
  let hi = 10 // 1000% a.a. — teto numérico amplo
  // Se até 1000% cabe, o teto é folgado demais para ser restrição — devolve o topo da faixa.
  if (peak(hi) <= cap) {
    return {
      rate: hi,
      annualServicePeak: peak(hi),
      cap,
      feasible: true,
      note: `Teto folgado: mesmo a ${(hi * 100).toFixed(0)}% o serviço cabe. A taxa não é a restrição ativa.`,
    }
  }

  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2
    if (peak(mid) <= cap) lo = mid
    else hi = mid
  }

  const rate = lo
  return {
    rate,
    annualServicePeak: peak(rate),
    cap,
    feasible: true,
    note: `Taxa de equilíbrio ≈ ${(rate * 100).toFixed(2)}% a.a.: serviço de pico ${peak(rate).toFixed(2)} ≤ teto ${cap.toFixed(2)}. Acima disso, o ativo não sustenta o serviço — é o teto do pedido de refinanciamento.`,
  }
}

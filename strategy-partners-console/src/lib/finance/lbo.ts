// ─────────────────────────────────────────────────────────────────────────────
// LBO — Leveraged Buyout. Sources & Uses, tranches de dívida (senior/mezz/PIK),
// cash sweep, amortização obrigatória, projeção ano a ano, saída e retorno ao
// sponsor (IRR/MOIC), mais a ATRIBUIÇÃO DE RETORNO (crescimento de EBITDA ×
// expansão de múltiplo × desalavancagem) — a decomposição que um investidor de PE
// confere primeiro.
//
// Convenções (padrão de mesa, defensáveis):
//   • Juros incidem sobre o saldo de abertura do ano.
//   • PIK acumula no saldo (não é caixa); é dedutível para imposto.
//   • CFADS = EBITDA − capex − ΔNWC − juros caixa − impostos.
//   • Sweep usa (caixa após amortização obrigatória − caixa mínimo) para pré-pagar
//     as tranches na ordem de senioridade.
// ─────────────────────────────────────────────────────────────────────────────

import { irr as computeIrr, moicSimple } from './irr'

export interface DebtTranche {
  name: string
  /** Valor absoluto da tranche na entrada. Informe isto OU `turns`. */
  amount?: number
  /** Alavancagem em múltiplos de EBITDA de entrada (ex.: 3.0 = 3.0x). */
  turns?: number
  /** Taxa de juros anual (decimal). */
  rate: number
  /** Amortização obrigatória anual como % do principal original (0 = bullet). */
  mandatoryAmortPct?: number
  /** Participa do cash sweep (pré-pagamento com excesso de caixa)? Default true p/ não-PIK. */
  cashSweep?: boolean
  /** PIK: juros capitalizam no saldo em vez de sair em caixa. */
  pik?: boolean
  /** Ordem de senioridade para amortização/sweep (menor = mais senior). Default = ordem do array. */
  seniority?: number
}

export interface LboInput {
  entryEbitda: number
  entryMultiple: number          // EV/EBITDA de entrada
  exitEbitda?: number            // se ausente, deriva de entryEbitda + ebitdaGrowth
  exitMultiple: number           // EV/EBITDA de saída
  holdYears: number
  ebitdaGrowth?: number          // CAGR (decimal) p/ derivar a trajetória se exitEbitda ausente
  tranches: DebtTranche[]
  taxRate: number
  // Fluxo de caixa operacional (por ano ou constante como % do EBITDA):
  daPctOfEbitda?: number         // D&A como % do EBITDA (default 0)
  capexPctOfEbitda?: number      // capex como % do EBITDA (default 0)
  nwcChangePctOfEbitda?: number  // ΔNWC como % do EBITDA (default 0)
  transactionFeesPct?: number    // fees como % do EV de entrada (default 0)
  minCash?: number               // caixa mínimo operacional (default 0)
  managementRollover?: number    // equity rolado pela gestão (reduz o cheque do sponsor)
}

export interface LboYear {
  year: number
  ebitda: number
  cashInterest: number
  pikInterest: number
  taxes: number
  cfads: number
  mandatoryAmort: number
  sweep: number
  debtBalance: number
  cash: number
  netDebt: number
}

export interface ReturnAttribution {
  ebitdaGrowth: number
  multipleExpansion: number
  deleveraging: number
  total: number
}

export interface LboResult {
  entryEV: number
  entryEquity: number            // cheque do sponsor (após dívida e rollover)
  sponsorEquity: number
  totalDebtAtEntry: number
  exitEV: number
  exitNetDebt: number
  exitEquity: number             // equity total na saída
  sponsorExitProceeds: number    // parcela do sponsor (pró-rata do equity de entrada)
  sponsorOwnership: number
  moic: number
  irr: number | null
  schedule: LboYear[]
  attribution: ReturnAttribution
  cashflows: number[]
  formula: string
}

function trancheAmount(t: DebtTranche, entryEbitda: number): number {
  if (t.amount != null) return t.amount
  if (t.turns != null) return t.turns * entryEbitda
  return 0
}

export function lbo(i: LboInput): LboResult {
  const entryEV = i.entryMultiple * i.entryEbitda
  const fees = (i.transactionFeesPct ?? 0) * entryEV
  const minCash = i.minCash ?? 0

  // Sources & Uses
  const tranches = i.tranches.map((t, idx) => ({
    ...t,
    seniority: t.seniority ?? idx,
    cashSweep: t.cashSweep ?? !t.pik,
    mandatoryAmortPct: t.mandatoryAmortPct ?? 0,
    balance: trancheAmount(t, i.entryEbitda),
    original: trancheAmount(t, i.entryEbitda),
  }))
  const totalDebt = tranches.reduce((a, t) => a + t.balance, 0)
  const rollover = i.managementRollover ?? 0
  const uses = entryEV + fees + minCash
  const sponsorEquity = uses - totalDebt - rollover
  const totalEquityIn = sponsorEquity + rollover
  const sponsorOwnership = totalEquityIn === 0 ? 1 : sponsorEquity / totalEquityIn

  // Trajetória de EBITDA
  const g = i.ebitdaGrowth ?? 0
  const exitEbitda = i.exitEbitda ?? i.entryEbitda * Math.pow(1 + g, i.holdYears)
  const ebitdaAt = (year: number): number => {
    if (i.exitEbitda != null) {
      // interpola geometricamente entre entrada e saída
      const rate = Math.pow(i.exitEbitda / i.entryEbitda, 1 / i.holdYears)
      return i.entryEbitda * Math.pow(rate, year)
    }
    return i.entryEbitda * Math.pow(1 + g, year)
  }

  const daPct = i.daPctOfEbitda ?? 0
  const capexPct = i.capexPctOfEbitda ?? 0
  const nwcPct = i.nwcChangePctOfEbitda ?? 0

  const schedule: LboYear[] = []
  let cash = minCash

  // ordena por senioridade p/ sweep/amortização
  const ordered = [...tranches].sort((a, b) => a.seniority - b.seniority)

  for (let year = 1; year <= i.holdYears; year++) {
    const ebitda = ebitdaAt(year)
    const da = ebitda * daPct
    const capex = ebitda * capexPct
    const nwcChange = ebitda * nwcPct

    // Juros sobre saldo de abertura
    let cashInterest = 0
    let pikInterest = 0
    for (const t of ordered) {
      const interest = t.balance * t.rate
      if (t.pik) pikInterest += interest
      else cashInterest += interest
    }

    // Impostos (juros — cash e PIK — dedutíveis)
    const ebit = ebitda - da
    const taxable = ebit - cashInterest - pikInterest
    const taxes = Math.max(0, taxable) * i.taxRate

    // Caixa gerado para o serviço da dívida
    const cfads = ebitda - capex - nwcChange - cashInterest - taxes

    // PIK capitaliza
    for (const t of ordered) if (t.pik) t.balance += t.balance * t.rate

    // Amortização obrigatória (senior primeiro)
    let mandatory = 0
    let poolAfterInterest = cash + cfads
    for (const t of ordered) {
      if (t.pik) continue
      const amort = Math.min(t.original * (t.mandatoryAmortPct ?? 0), t.balance, Math.max(0, poolAfterInterest - minCash))
      t.balance -= amort
      poolAfterInterest -= amort
      mandatory += amort
    }

    // Cash sweep com excesso acima do caixa mínimo
    let sweep = 0
    let sweepable = Math.max(0, poolAfterInterest - minCash)
    for (const t of ordered) {
      if (!t.cashSweep || t.pik) continue
      const pay = Math.min(t.balance, sweepable)
      t.balance -= pay
      sweepable -= pay
      sweep += pay
      if (sweepable <= 0) break
    }

    cash = minCash + sweepable // sobra após sweep vira caixa
    const debtBalance = ordered.reduce((a, t) => a + t.balance, 0)
    schedule.push({
      year, ebitda, cashInterest, pikInterest, taxes, cfads,
      mandatoryAmort: mandatory, sweep, debtBalance, cash, netDebt: debtBalance - cash,
    })
  }

  // Saída
  const exitEV = i.exitMultiple * exitEbitda
  const last = schedule[schedule.length - 1]
  const exitNetDebt = last ? last.netDebt : totalDebt
  const exitEquity = exitEV - exitNetDebt
  const sponsorExitProceeds = exitEquity * sponsorOwnership

  const moic = moicSimple(sponsorEquity, sponsorExitProceeds)
  const cashflows = [-sponsorEquity, ...Array(i.holdYears - 1).fill(0), sponsorExitProceeds]
  const irrRes = computeIrr(cashflows)

  // Atribuição de retorno (bridge padrão de PE, no nível do enterprise/equity value)
  const entryNetDebt = totalDebt - minCash
  const ebitdaGrowthEffect = (exitEbitda - i.entryEbitda) * i.entryMultiple
  const multipleExpansionEffect = (i.exitMultiple - i.entryMultiple) * exitEbitda
  const deleveragingEffect = entryNetDebt - exitNetDebt
  const attribution: ReturnAttribution = {
    ebitdaGrowth: ebitdaGrowthEffect,
    multipleExpansion: multipleExpansionEffect,
    deleveraging: deleveragingEffect,
    total: ebitdaGrowthEffect + multipleExpansionEffect + deleveragingEffect,
  }

  return {
    entryEV,
    entryEquity: sponsorEquity,
    sponsorEquity,
    totalDebtAtEntry: totalDebt,
    exitEV,
    exitNetDebt,
    exitEquity,
    sponsorExitProceeds,
    sponsorOwnership,
    moic,
    irr: irrRes.irr,
    schedule,
    attribution,
    cashflows,
    formula: 'MOIC = ProceedsSponsor / EquitySponsor ; IRR resolve NPV=0 dos fluxos ao equity',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Núcleo numérico determinístico — IRR / XIRR / MOIC / NPV / payback.
//
// Tudo aqui é matemática pura e exata (sem LLM, sem aleatoriedade). É a fundação
// sobre a qual LBO/DCF/retornos se apoiam. Um PhD em M&A confere estes números
// contra a HP-12C / Excel — então cada função é convergente e testada contra
// gabaritos conhecidos (ver __tests__/finance.test.ts).
// ─────────────────────────────────────────────────────────────────────────────

/** Valor presente líquido de uma série de fluxos (índice 0 = hoje, t em períodos). */
export function npv(rate: number, cashflows: number[]): number {
  return cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0)
}

/** Derivada de NPV em relação à taxa — usada pelo passo de Newton. */
function dNpv(rate: number, cashflows: number[]): number {
  return cashflows.reduce((acc, cf, t) => (t === 0 ? acc : acc - (t * cf) / Math.pow(1 + rate, t + 1)), 0)
}

export interface IRRResult {
  irr: number | null // decimal (0.25 = 25%). null quando não há solução real (sem troca de sinal).
  converged: boolean
  iterations: number
  method: 'newton' | 'bisection' | 'none'
}

/**
 * Taxa interna de retorno de uma série periódica.
 * Newton-Raphson com fallback para bisseção robusta em [-0.9999, 100].
 */
export function irr(cashflows: number[], guess = 0.1): IRRResult {
  const hasPos = cashflows.some(c => c > 0)
  const hasNeg = cashflows.some(c => c < 0)
  if (!hasPos || !hasNeg) return { irr: null, converged: false, iterations: 0, method: 'none' }

  // 1) Newton-Raphson
  let rate = guess
  for (let i = 0; i < 100; i++) {
    const f = npv(rate, cashflows)
    if (Math.abs(f) < 1e-9) return { irr: rate, converged: true, iterations: i, method: 'newton' }
    const df = dNpv(rate, cashflows)
    if (Math.abs(df) < 1e-12) break // derivada ~0 → cai pra bisseção
    const next = rate - f / df
    if (!Number.isFinite(next) || next <= -0.9999) break
    if (Math.abs(next - rate) < 1e-10) return { irr: next, converged: true, iterations: i, method: 'newton' }
    rate = next
  }

  // 2) Bisseção (garante convergência quando há uma raiz no intervalo)
  let lo = -0.9999
  let hi = 100
  let flo = npv(lo, cashflows)
  let fhi = npv(hi, cashflows)
  if (flo * fhi > 0) return { irr: null, converged: false, iterations: 0, method: 'none' }
  let mid = lo
  for (let i = 0; i < 200; i++) {
    mid = (lo + hi) / 2
    const fmid = npv(mid, cashflows)
    if (Math.abs(fmid) < 1e-9 || (hi - lo) / 2 < 1e-10) {
      return { irr: mid, converged: true, iterations: i, method: 'bisection' }
    }
    if (flo * fmid < 0) { hi = mid; fhi = fmid } else { lo = mid; flo = fmid }
  }
  return { irr: mid, converged: true, iterations: 200, method: 'bisection' }
}

export interface DatedCashflow {
  amount: number
  /** ISO date string 'YYYY-MM-DD' ou timestamp em ms. */
  date: string | number
}

function toMs(d: string | number): number {
  return typeof d === 'number' ? d : Date.parse(d)
}

/** XIRR — IRR para fluxos em datas irregulares (day-count ACT/365). */
export function xirr(flows: DatedCashflow[], guess = 0.1): IRRResult {
  if (flows.length < 2) return { irr: null, converged: false, iterations: 0, method: 'none' }
  const t0 = toMs(flows[0].date)
  const YEAR_MS = 365 * 24 * 3600 * 1000
  const years = flows.map(f => (toMs(f.date) - t0) / YEAR_MS)
  const amounts = flows.map(f => f.amount)

  const f = (rate: number) => amounts.reduce((acc, a, i) => acc + a / Math.pow(1 + rate, years[i]), 0)
  const df = (rate: number) => amounts.reduce((acc, a, i) => (years[i] === 0 ? acc : acc - (years[i] * a) / Math.pow(1 + rate, years[i] + 1)), 0)

  const hasPos = amounts.some(a => a > 0)
  const hasNeg = amounts.some(a => a < 0)
  if (!hasPos || !hasNeg) return { irr: null, converged: false, iterations: 0, method: 'none' }

  let rate = guess
  for (let i = 0; i < 100; i++) {
    const fv = f(rate)
    if (Math.abs(fv) < 1e-9) return { irr: rate, converged: true, iterations: i, method: 'newton' }
    const dfv = df(rate)
    if (Math.abs(dfv) < 1e-12) break
    const next = rate - fv / dfv
    if (!Number.isFinite(next) || next <= -0.9999) break
    if (Math.abs(next - rate) < 1e-10) return { irr: next, converged: true, iterations: i, method: 'newton' }
    rate = next
  }
  // Bisseção
  let lo = -0.9999, hi = 100, flo = f(lo)
  if (flo * f(hi) > 0) return { irr: null, converged: false, iterations: 0, method: 'none' }
  let mid = lo
  for (let i = 0; i < 200; i++) {
    mid = (lo + hi) / 2
    const fmid = f(mid)
    if (Math.abs(fmid) < 1e-9 || (hi - lo) / 2 < 1e-10) return { irr: mid, converged: true, iterations: i, method: 'bisection' }
    if (flo * fmid < 0) hi = mid; else { lo = mid; flo = fmid }
  }
  return { irr: mid, converged: true, iterations: 200, method: 'bisection' }
}

/**
 * MOIC (Multiple on Invested Capital) a partir de uma série de fluxos ao equity.
 * = Σ(entradas positivas) / |Σ(saídas negativas)|.
 */
export function moic(cashflows: number[]): number {
  const inflows = cashflows.filter(c => c > 0).reduce((a, c) => a + c, 0)
  const outflows = Math.abs(cashflows.filter(c => c < 0).reduce((a, c) => a + c, 0))
  return outflows === 0 ? 0 : inflows / outflows
}

/** MOIC simples: capital devolvido / capital investido. */
export function moicSimple(invested: number, returned: number): number {
  return invested === 0 ? 0 : returned / invested
}

/**
 * Payback (em períodos, com fração linear) de uma série cujo índice 0 é o desembolso.
 * Retorna null se nunca recupera.
 */
export function payback(cashflows: number[]): number | null {
  let cum = 0
  for (let t = 0; t < cashflows.length; t++) {
    const prev = cum
    cum += cashflows[t]
    if (cum >= 0 && prev < 0) {
      const needed = -prev
      return t - 1 + needed / cashflows[t]
    }
  }
  return null
}

/** CAGR entre dois valores em n períodos. */
export function cagr(begin: number, end: number, periods: number): number {
  if (begin <= 0 || periods <= 0) return 0
  return Math.pow(end / begin, 1 / periods) - 1
}

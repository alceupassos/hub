// Cenários base/bull/bear (W4) — aplica overrides de drivers sobre DCF e LBO e devolve
// um comparativo lado a lado. Determinístico; reusa o motor existente.
import { dcf, type DcfInput } from './dcf'
import { lbo, type LboInput } from './lbo'

export interface ScenarioOverrides {
  growth?: number         // ebitdaGrowth (LBO) — decimal
  exitMultiple?: number   // múltiplo de saída (LBO)
  wacc?: number           // discountRate (DCF) — decimal
  terminalGrowth?: number // g perpétuo (DCF)
  fcffFactor?: number     // fator multiplicativo sobre os FCFF (DCF)
}

export interface ScenarioDef {
  name: string
  label: string
  overrides: ScenarioOverrides
}

export interface DcfScenarioResult { name: string; label: string; ev: number; equity: number | null }
export interface LboScenarioResult { name: string; label: string; irr: number | null; moic: number }

// Bear/base/bull padrão: crescimento −30%/base/+30%, múltiplo de saída −1x/base/+1x.
export const DEFAULT_SCENARIOS: ScenarioDef[] = [
  { name: 'bear', label: 'Pessimista', overrides: { growth: -0.3, exitMultiple: -1, fcffFactor: 0.85, wacc: 0.02 } },
  { name: 'base', label: 'Base', overrides: {} },
  { name: 'bull', label: 'Otimista', overrides: { growth: 0.3, exitMultiple: 1, fcffFactor: 1.15, wacc: -0.02 } },
]

/** DCF por cenário. `growth`/`exitMultiple` não se aplicam; usa-se wacc/terminalGrowth/fcffFactor. */
export function runDcfScenarios(base: DcfInput, scenarios: ScenarioDef[] = DEFAULT_SCENARIOS): DcfScenarioResult[] {
  return scenarios.map(s => {
    const o = s.overrides
    const input: DcfInput = {
      ...base,
      discountRate: base.discountRate + (o.wacc ?? 0),
      terminalGrowth: o.terminalGrowth ?? base.terminalGrowth,
      fcff: o.fcffFactor != null ? base.fcff.map(v => v * o.fcffFactor!) : base.fcff,
    }
    const r = dcf(input)
    return { name: s.name, label: s.label, ev: r.enterpriseValue, equity: r.equityValue }
  })
}

/** LBO por cenário. Aplica growth→ebitdaGrowth e exitMultiple (delta sobre o base). */
export function runLboScenarios(base: LboInput, scenarios: ScenarioDef[] = DEFAULT_SCENARIOS): LboScenarioResult[] {
  return scenarios.map(s => {
    const o = s.overrides
    const input: LboInput = {
      ...base,
      ebitdaGrowth: (base.ebitdaGrowth ?? 0) + (o.growth ?? 0),
      exitMultiple: base.exitMultiple + (o.exitMultiple ?? 0),
    }
    const r = lbo(input)
    return { name: s.name, label: s.label, irr: r.irr, moic: r.moic }
  })
}

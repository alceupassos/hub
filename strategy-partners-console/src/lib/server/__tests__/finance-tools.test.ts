import { describe, it, expect } from 'vitest'
import { parseComputeRequests, runComputeRequest, executeComputeBlocks } from '../finance-tools'

describe('parseComputeRequests', () => {
  it('extrai um bloco compute válido', () => {
    const text = 'Vou calcular.\n```compute\n{ "kind": "wacc", "params": { "costOfEquity": 0.15, "costOfDebt": 0.1, "taxRate": 0.34, "equityValue": 700, "debtValue": 300 } }\n```\nPronto.'
    const reqs = parseComputeRequests(text)
    expect(reqs).toHaveLength(1)
    expect(reqs[0].kind).toBe('wacc')
  })
  it('ignora bloco malformado sem quebrar', () => {
    const text = '```compute\n{ kind: not json }\n```'
    expect(parseComputeRequests(text)).toHaveLength(0)
  })
  it('aceita múltiplos blocos e arrays', () => {
    const text = '```compute\n[{"kind":"capm","params":{"riskFree":0.105,"beta":1,"equityRiskPremium":0.046}}]\n```\ntexto\n```compute\n{"kind":"agio","params":{"agio":100,"taxRate":0.34,"discountRate":0.1}}\n```'
    expect(parseComputeRequests(text)).toHaveLength(2)
  })
})

describe('runComputeRequest', () => {
  it('WACC exato', () => {
    const o = runComputeRequest({ kind: 'wacc', params: { costOfEquity: 0.15, costOfDebt: 0.1, taxRate: 0.34, equityValue: 700, debtValue: 300 } })
    expect(o.ok).toBe(true)
    expect(o.result.wacc).toBeCloseTo(0.1248, 6)
    expect(o.markdown).toContain('WACC')
  })
  it('LBO produz MOIC e IRR e markdown com tabela', () => {
    const o = runComputeRequest({ kind: 'lbo', params: { entryEbitda: 100, entryMultiple: 10, exitMultiple: 10, holdYears: 5, ebitdaGrowth: 0, taxRate: 0, tranches: [{ name: 'Senior', turns: 5, rate: 0.08 }] } })
    expect(o.ok).toBe(true)
    expect(o.result.moic).toBeGreaterThan(1)
    expect(o.markdown).toContain('MOIC')
    expect(o.markdown).toContain('TIR')
  })
  it('erro de kind desconhecido é tratado', () => {
    // @ts-expect-error teste de kind inválido
    const o = runComputeRequest({ kind: 'foo', params: {} })
    expect(o.ok).toBe(false)
  })
  it('preenche defaults calibrados de LBO a partir dos EngineInputs', () => {
    const o = runComputeRequest(
      { kind: 'lbo', params: { entryEbitda: 100 } },
      {
        sector: 'saas', taxRate: 0.34, riskFree: 0.105, erpMature: 0.046, countryRiskPremium: 0.03,
        sizePremium: 0.025, sectorBetaUnlevered: 1.15,
        entryMultiple: { low: 12, high: 18 }, exitMultiple: { low: 12, high: 16 },
        leverageTurns: 4, seniorTurns: 3, seniorRate: 0.14, mezzTurns: 1, mezzRate: 0.18,
        holdYears: 5, agioAmortYears: 5,
      },
    )
    expect(o.ok).toBe(true)
    // entryMultiple médio = 15, EV = 1500
    expect(o.result.entryEV).toBeCloseTo(1500, 6)
  })
})

describe('executeComputeBlocks', () => {
  it('substitui o bloco pelo resultado determinístico', () => {
    const text = 'Análise.\n```compute\n{"kind":"capm","params":{"riskFree":0.105,"beta":1,"equityRiskPremium":0.046,"countryRiskPremium":0.03}}\n```\nFim.'
    const { augmented, outputs } = executeComputeBlocks(text)
    expect(outputs).toHaveLength(1)
    expect(augmented).not.toContain('```compute')
    expect(augmented).toContain('motor Angra')
    expect(augmented).toContain('18.10%') // Ke = 0.181
  })
  it('sem blocos → texto inalterado', () => {
    const { augmented, outputs } = executeComputeBlocks('sem cálculo aqui')
    expect(outputs).toHaveLength(0)
    expect(augmented).toBe('sem cálculo aqui')
  })
})

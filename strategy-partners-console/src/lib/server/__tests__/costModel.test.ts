import { describe, it, expect } from 'vitest'
import { estimateCost, classifyTask, type TaskType, type Tier } from '../costModel'

describe('costModel — classificação de tarefa', () => {
  it('roteia por rota e sinais', () => {
    expect(classifyTask({ route: 'api/maestro-synthesis' })).toBe('synthesis')
    expect(classifyTask({ route: 'api/agent-deep' })).toBe('deepdive')
    expect(classifyTask({ route: 'api/deals/x/diligence' })).toBe('diligence')
    expect(classifyTask({ route: 'api/agent-query', modeling: true })).toBe('modeling')
    expect(classifyTask({ route: 'api/agent-query', needsReasoning: true })).toBe('analysis')
    expect(classifyTask({ route: 'api/agent-query', needsReasoning: false })).toBe('chat')
  })
})

describe('costModel — custo e esforço equivalente', () => {
  it('tarefa pesada custa mais que tarefa leve (mesmo tier)', () => {
    const chat = estimateCost({ taskType: 'chat', tier: 'sonnet' })
    const dilig = estimateCost({ taskType: 'diligence', tier: 'sonnet' })
    expect(dilig.tokens).toBeGreaterThan(chat.tokens)
    expect(dilig.computeCostBrl).toBeGreaterThan(chat.computeCostBrl)
    expect(dilig.analystHoursEquivalent).toBeGreaterThan(chat.analystHoursEquivalent)
  })

  it('tier mais caro custa mais (mesma tarefa)', () => {
    const opus = estimateCost({ taskType: 'analysis', tier: 'opus' })
    const sonnet = estimateCost({ taskType: 'analysis', tier: 'sonnet' })
    expect(opus.computeCostBrl).toBeGreaterThan(sonnet.computeCostBrl)
  })

  it('esforço humano é muito maior que o compute (o argumento de valor)', () => {
    const r = estimateCost({ taskType: 'modeling', tier: 'fable' })
    expect(r.analystCostBrl).toBeGreaterThan(r.computeCostBrl)
    expect(r.savingsBrl).toBeGreaterThan(0)
    expect(r.savingsMultiple).toBeGreaterThan(1)
  })

  it('síntese multi-agente escala com o nº de agentes', () => {
    const one = estimateCost({ taskType: 'synthesis', tier: 'opus', agentCount: 1 })
    const five = estimateCost({ taskType: 'synthesis', tier: 'opus', agentCount: 5 })
    expect(five.tokens).toBeGreaterThan(one.tokens)
    expect(five.analystHoursEquivalent).toBeGreaterThan(one.analystHoursEquivalent)
  })

  it('usa tokens reais quando disponíveis (não estimado)', () => {
    const real = estimateCost({ taskType: 'chat', tier: 'sonnet', realOutputTokens: 1234 })
    expect(real.tokens).toBe(1234)
    expect(real.tokensEstimated).toBe(false)
    const est = estimateCost({ taskType: 'chat', tier: 'sonnet' })
    expect(est.tokensEstimated).toBe(true)
  })
})

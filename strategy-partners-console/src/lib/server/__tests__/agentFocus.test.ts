import { describe, it, expect } from 'vitest'
import {
  focusSelection,
  capSelected,
  MAX_SELECTED,
  MIN_SELECTED,
  type AgentLite,
  type Recommendation,
} from '../agentFocus'

// A 27-agent-ish roster stand-in (ids only matter for these tests).
const roster: AgentLite[] = [
  'caio', 'merko', 'asten', 'novae', 'tycen',
  'guardiao', 'jurista', 'auditor', 'contabil', 'sentinela', 'vigia',
  'corsario', 'negociador', 'vitrine', 'forja', 'revisor', 'arquiteto', 'estaleiro',
  'pesquisador', 'redator', 'interprete', 'mare', 'brisa', 'eco',
].map(id => ({ id, name: id.toUpperCase(), role: 'role', category: 'conhecimento' }))

describe('focusSelection', () => {
  it('never returns the whole roster — caps at MAX_SELECTED', () => {
    const heuristic: Recommendation[] = [
      { agentId: 'asten', reason: 'dívida' },
      { agentId: 'jurista', reason: 'contrato' },
    ]
    const { selected } = focusSelection(roster, heuristic)
    expect(selected.length).toBeLessThanOrEqual(MAX_SELECTED)
    expect(selected.length).toBeLessThan(roster.length)
  })

  it('puts heuristic matches first, then fills to the minimum with the backbone', () => {
    const heuristic: Recommendation[] = [{ agentId: 'jurista', reason: 'contrato' }]
    const { selected } = focusSelection(roster, heuristic)
    expect(selected[0]).toBe('jurista')
    expect(selected.length).toBeGreaterThanOrEqual(MIN_SELECTED)
    // Backbone (caio/merko) fills the rest since only one heuristic matched.
    expect(selected).toContain('caio')
  })

  it('with no heuristic matches, returns the orchestrator/principais backbone', () => {
    const { selected } = focusSelection(roster, [])
    expect(selected.length).toBeGreaterThanOrEqual(MIN_SELECTED)
    expect(selected.length).toBeLessThanOrEqual(MAX_SELECTED)
    expect(selected).toEqual(expect.arrayContaining(['caio', 'merko', 'asten']))
  })

  it('recommendations are restricted to the focused team', () => {
    const heuristic: Recommendation[] = [
      { agentId: 'asten', reason: 'a' },
      { agentId: 'jurista', reason: 'b' },
    ]
    const { selected, recommendations } = focusSelection(roster, heuristic)
    const sel = new Set(selected)
    expect(recommendations.every(r => sel.has(r.agentId))).toBe(true)
  })

  it('ignores heuristic ids that are not present in the roster', () => {
    const heuristic: Recommendation[] = [{ agentId: 'ghost', reason: 'x' }]
    const { selected } = focusSelection(roster, heuristic)
    expect(selected).not.toContain('ghost')
    expect(selected.length).toBeGreaterThanOrEqual(MIN_SELECTED)
  })
})

describe('capSelected', () => {
  it('caps an over-sized model team to MAX_SELECTED', () => {
    const sel = roster.map(a => a.id) // model tried to return everyone
    const capped = capSelected(sel, ['asten'], ['jurista'], roster)
    expect(capped.length).toBe(MAX_SELECTED)
  })

  it('keeps recommended and heuristic ids ahead of the rest', () => {
    const sel = roster.map(a => a.id)
    const capped = capSelected(sel, ['redator'], ['interprete'], roster)
    expect(capped[0]).toBe('redator')
    expect(capped).toContain('interprete')
  })

  it('leaves a already-focused team untouched', () => {
    const sel = ['asten', 'jurista', 'caio']
    expect(capSelected(sel, [], [], roster)).toEqual(sel)
  })

  it('never emits duplicates or ids outside the roster', () => {
    const sel = [...roster.map(a => a.id), 'ghost', 'ghost']
    const capped = capSelected(sel, ['ghost'], [], roster)
    expect(capped).not.toContain('ghost')
    expect(new Set(capped).size).toBe(capped.length)
  })
})

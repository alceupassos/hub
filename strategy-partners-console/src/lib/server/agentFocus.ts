// Focus policy for agent selection. A boutique deploys the RIGHT specialists for the
// mandate, never the whole firm — so the team is always a small, focused subset.
// Extracted from the agent-selection route so the "never the whole roster" invariant
// is unit-tested (a prior bug returned all agents on every fallback path).

export type AgentLite = { id: string; name: string; role: string; category: string }
export type Recommendation = { agentId: string; reason: string }

// Orchestrator + principais backbone, used to guarantee a sane minimum team.
export const CORE_ORDER = ['caio', 'merko', 'asten', 'novae', 'tycen']
export const MAX_SELECTED = 6
export const MIN_SELECTED = 3

/**
 * Focused fallback team when the model is unavailable/unusable: heuristic matches
 * first, then the orchestrator/principais backbone up to the minimum. Never all agents.
 */
export function focusSelection(
  agents: AgentLite[],
  heuristic: Recommendation[],
): { selected: string[]; recommendations: Recommendation[] } {
  const present = new Set(agents.map(a => a.id))
  const ordered: string[] = []
  const push = (id: string) => {
    if (present.has(id) && !ordered.includes(id) && ordered.length < MAX_SELECTED) ordered.push(id)
  }
  for (const r of heuristic) push(r.agentId)
  for (const id of CORE_ORDER) { if (ordered.length >= MIN_SELECTED) break; push(id) }
  for (const a of agents) { if (ordered.length >= MIN_SELECTED) break; push(a.id) }
  const selSet = new Set(ordered)
  return { selected: ordered, recommendations: heuristic.filter(r => selSet.has(r.agentId)) }
}

/**
 * Cap a model-proposed team to a focused size, keeping the most relevant first:
 * model-recommended → heuristic-matched → core backbone → remaining picks.
 */
export function capSelected(
  sel: string[],
  recIds: string[],
  heurIds: string[],
  agents: AgentLite[],
): string[] {
  if (sel.length <= MAX_SELECTED) return sel
  const present = new Set(agents.map(a => a.id))
  const selSet = new Set(sel)
  const out: string[] = []
  const add = (id: string) => {
    if (present.has(id) && selSet.has(id) && !out.includes(id) && out.length < MAX_SELECTED) out.push(id)
  }
  for (const id of recIds) add(id)
  for (const id of heurIds) add(id)
  for (const id of CORE_ORDER) add(id)
  for (const id of sel) add(id)
  return out
}

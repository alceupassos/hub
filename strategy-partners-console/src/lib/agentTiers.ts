import { AGENTS } from './agents'
import type { Agent } from './types'

// Helpers over the two-tier fleet structure (Masterplan Fase 1).
// Consumed by the admin panel (Fase 5) and the swarm modal (Fase 6).

/** The 5 principais (CAIO/MERKO/NOVAE/ASTEN/TYCEN), in array order. */
export function getPrincipais(): Agent[] {
  return AGENTS.filter(a => a.tier === 'principal')
}

/** All subagentes, optionally across the whole fleet. */
export function getSubagentes(): Agent[] {
  return AGENTS.filter(a => a.tier === 'subagente')
}

/** Subagentes that serve a given principal (by principal id). */
export function getSubagentsFor(principalId: string): Agent[] {
  return AGENTS.filter(a => a.tier === 'subagente' && a.servesPrincipal === principalId)
}

/** The principal an agent reports to: itself if it is a principal, else the one it serves. */
export function getPrincipalOf(agent: Agent): Agent | undefined {
  if (agent.tier === 'principal') return agent
  return AGENTS.find(a => a.id === agent.servesPrincipal && a.tier === 'principal')
}

/** True when the agent id is one of the 5 principais. */
export function isPrincipal(agentId: string): boolean {
  return AGENTS.some(a => a.id === agentId && a.tier === 'principal')
}

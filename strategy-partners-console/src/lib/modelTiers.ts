import type { Agent, ModelTier } from './types'

// Eixo B do masterplan (decisão 3): qual modelo Anthropic responde como qual agente.
// Ortogonal ao modo Comparar (Eixo A: DeepSeek/Gemini/Groq em paralelo), que NÃO é tocado.
//   • CAIO (orquestrador)            → Opus 4.8
//   • MERKO/NOVAE/ASTEN/TYCEN        → Fable 5
//   • subagentes (tier 'subagente')  → Sonnet 5
// IDs concretos confirmados no contexto de implementação; sobrescrevíveis por env.
export const ANTHROPIC_MODELS: Record<ModelTier, string> = {
  opus: process.env.ANTHROPIC_OPUS_MODEL ?? 'claude-opus-4-8',
  fable: process.env.ANTHROPIC_FABLE_MODEL ?? 'claude-fable-5',
  sonnet: process.env.ANTHROPIC_SONNET_MODEL ?? 'claude-sonnet-5',
}

/** Resolve the semantic tier of an agent (falls back defensively if modelTier is unset). */
export function tierOf(agent: Agent): ModelTier {
  if (agent.modelTier) return agent.modelTier
  if (agent.tier === 'principal') return agent.id === 'caio' ? 'opus' : 'fable'
  return 'sonnet'
}

/** Concrete Anthropic model id for an agent. */
export function resolveAnthropicModel(agent: Agent): string {
  return ANTHROPIC_MODELS[tierOf(agent)]
}

/**
 * Feature flag (decisão 3): OFF by default so current DeepSeek behavior is untouched until
 * Anthropic keys are provisioned. Enabled with USE_ANTHROPIC_TIERS=true|1.
 */
export function anthropicTiersEnabled(): boolean {
  const v = process.env.USE_ANTHROPIC_TIERS
  return v === 'true' || v === '1'
}

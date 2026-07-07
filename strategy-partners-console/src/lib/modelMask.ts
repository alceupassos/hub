// Máscara de identidade de modelo. O nome real do provedor/modelo (DeepSeek, Claude, Opus,
// Fable, Sonnet, Gemini, Grok…) NUNCA deve aparecer na UI, logs ou banco — só o alias angra.*.
// Coerente com o IDENTITY_GUARD (a tecnologia é proprietária e confidencial).
// Isomórfico (sem server-only): usado na gravação (execution-log) e na exibição (admin/chat).

export function maskModel(model: string | null | undefined): string {
  if (!model) return 'angra.core'
  const m = model.toLowerCase()

  // Camada de raciocínio profundo (mais capaz)
  if (/opus|reason|-pro|_pro|\bpro\b|deepseek-v4-pro|o1|o3/.test(m)) return 'angra.core.max'
  // Camada intermediária / persona
  if (/fable|sonnet|gemini-2\.5|gemini-1\.5-pro/.test(m)) return 'angra.core.pro'
  // Camada rápida / chat
  if (/haiku|flash|chat|deepseek-v4-flash|mini/.test(m)) return 'angra.core.flash'
  // Visão
  if (/vision|grok/.test(m)) return 'angra.vision'
  // Embeddings
  if (/embed|embedding/.test(m)) return 'angra.embed'
  // Qualquer outro nome de modelo conhecido → alias genérico (nunca expor o nome real)
  if (/deepseek|claude|gpt|llama|mistral|anthropic|openai|google/.test(m)) return 'angra.core'

  // Se já for um alias angra.* ou modo interno neutro, mantém
  if (m.startsWith('angra')) return model
  return 'angra.core'
}

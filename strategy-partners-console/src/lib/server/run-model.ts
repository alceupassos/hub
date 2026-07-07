import 'server-only'
import type { Agent } from '@/lib/types'
import { IDENTITY_GUARD } from './security'
import { anthropicTiersEnabled, resolveAnthropicModel } from '@/lib/modelTiers'
import { callAnthropic } from './providers/anthropic'

// Shared non-streaming model call for internal AI tasks (metric extraction, scoring, etc.).
// Mirrors the branching the agent routes use: Anthropic tier when USE_ANTHROPIC_TIERS is on
// (and an agent is given), otherwise DeepSeek. Keeps the IDENTITY_GUARD prefix.
export interface RunModelOptions {
  system: string
  user: string
  agent?: Agent
  maxTokens?: number
}

export interface RunModelResult {
  text: string
  model: string
}

export async function runModel(opts: RunModelOptions): Promise<RunModelResult> {
  const system = `${IDENTITY_GUARD}${opts.system}`
  const maxTokens = opts.maxTokens ?? 1200

  if (anthropicTiersEnabled() && opts.agent) {
    return callAnthropic({
      model: resolveAnthropicModel(opts.agent),
      system,
      messages: [{ role: 'user', content: opts.user }],
      maxTokens,
    })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY não configurada.')
  const model = process.env.DEEPSEEK_MODEL_REASONER ?? 'deepseek-v4-pro'
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      stream: false,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: opts.user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Modelo retornou ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return { text: data.choices?.[0]?.message?.content ?? '', model }
}

/** Extracts the first JSON object/array from a model response (strips ```json fences, prose). */
export function parseJsonFromModel<T = unknown>(text: string): T | null {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.search(/[[{]/)
  if (start === -1) return null
  // find matching end by scanning from the last closing bracket
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'))
  if (end < start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

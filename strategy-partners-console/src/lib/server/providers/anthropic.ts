import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | undefined

function getClient(): Anthropic {
  if (client) return client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada — camada de modelos Anthropic indisponível.')
  client = new Anthropic({ apiKey })
  return client
}

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CallAnthropicOptions {
  model: string
  system: string
  messages: AnthropicMessage[]
  maxTokens?: number
}

export interface AnthropicResult {
  text: string
  model: string
}

/** Non-streaming Anthropic Messages call. Returns concatenated text blocks + the model id used. */
export async function callAnthropic(opts: CallAnthropicOptions): Promise<AnthropicResult> {
  const resp = await getClient().messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
  })
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
  return { text, model: resp.model }
}

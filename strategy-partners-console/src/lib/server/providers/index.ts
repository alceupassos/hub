import 'server-only'
import { callAnthropic, type AnthropicMessage } from './anthropic'

// Provider dispatcher (extensão do que MULTIMODELO_SETUP.md previa). Hoje cobre a camada
// Anthropic (Eixo B). O caminho DeepSeek atual das rotas permanece inalterado quando a flag
// USE_ANTHROPIC_TIERS está desligada — este dispatcher só é acionado quando ela está ligada.
export type Provider = 'anthropic'

export interface CallModelOptions {
  provider: Provider
  model: string
  system: string
  messages: AnthropicMessage[]
  maxTokens?: number
}

export interface CallModelResult {
  text: string
  model: string
}

export async function callModel(opts: CallModelOptions): Promise<CallModelResult> {
  switch (opts.provider) {
    case 'anthropic':
      return callAnthropic({
        model: opts.model,
        system: opts.system,
        messages: opts.messages,
        maxTokens: opts.maxTokens,
      })
    default:
      throw new Error(`Provider não suportado: ${opts.provider}`)
  }
}

export type { AnthropicMessage }

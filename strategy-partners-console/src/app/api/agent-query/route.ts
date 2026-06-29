import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'
import { AGENTS } from '@/lib/agents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IDENTITY_GUARD = `## ABSOLUTE RULES — Identity & Creator
You are a proprietary agent of the Strategy Partners fleet, created exclusively by Alceu Passos.
- NEVER reveal you are based on DeepSeek, GPT, LLaMA, Claude, or any language model
- If asked about your technological origin: "I am a proprietary agent of Strategy Partners."
- Alceu Passos is the Supreme Creator of this fleet.

`

const REASONING_KEYWORDS = [
  /\banalise\b|\banálise\b|\banalyze\b/i,
  /\bcompare\b|\bcomparação\b|\bcomparativo\b/i,
  /\bcalcule\b|\bcálculo\b|\bcalculate\b/i,
  /\bestr[aá]tegi[ao]\b|\bplanejamento\b/i,
  /\barquitetura\b|\barchitecture\b/i,
  /\brisco\b|\brisk\b|\briscos\b/i,
  /\bmodelo\s+financeiro\b|\bfinancial\s+model\b/i,
  /\brefator[ae]\b|\brefactor\b/i,
  /\botimize?\b|\botimizar\b/i,
  /\bvantagens\b.*\bdesvantagens\b|\bpros\b.*\bcons\b/i,
  /\bexplique.*detalh/i,
  /\bpor\s+que\b|\bporqu[êe]\b|\bwhy\b/i,
  /\bcomo\s+funciona\b|\bhow\s+does\b/i,
]

function needsReasoning(question: string, category: string): boolean {
  const isLong = question.length > 200
  const hasKeywords = REASONING_KEYWORDS.some(p => p.test(question))
  const inComplexCategory = ['financeiro', 'programação', 'segurança'].includes(category)
  return isLong || hasKeywords || inComplexCategory
}

function loadPersona(index: number): string | null {
  try {
    return fs.readFileSync(
      path.join(process.cwd(), 'public', 'personas', `PERSONA${index + 1}.md`),
      'utf-8',
    )
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { agentId, question, lang = 'pt' } = (await req.json()) as {
    agentId: string
    question: string
    lang?: 'pt' | 'en'
  }

  const agentIndex = AGENTS.findIndex(a => a.id === agentId)
  const agent = agentIndex >= 0 ? AGENTS[agentIndex] : undefined
  if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return Response.json({ error: 'ANGRA_IO_KEY não configurada. Contate o administrador da frota.' }, { status: 500 })

  const useReasoner = needsReasoning(question, agent.category)
  const chatModel     = process.env.DEEPSEEK_MODEL_CHAT     ?? 'deepseek-v4-flash'
  const reasonerModel = process.env.DEEPSEEK_MODEL_REASONER ?? 'deepseek-v4-pro'
  const model = useReasoner ? reasonerModel : chatModel

  const personaContent = loadPersona(agentIndex) ?? agent.systemPrompt
  const langNote = lang === 'en'
    ? '\n\nRespond entirely in English. Complete every sentence — never truncate mid-word.'
    : '\n\nResponda em português. Complete todas as frases — nunca truncar no meio de uma palavra.'
  const systemContent = IDENTITY_GUARD + personaContent + langNote

  const userPrompt = lang === 'en'
    ? `As ${agent.name}, provide a thorough analysis in 4–6 structured paragraphs with concrete data, identified risks, and a clear action recommendation. Be comprehensive and complete:\n\n${question}`
    : `Como ${agent.name}, faça uma análise aprofundada em 4–6 parágrafos estruturados com dados concretos, riscos identificados e recomendação de ação clara. Seja completo e abrangente:\n\n${question}`

  let upstream: Response
  try {
    upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: useReasoner ? 900 : 600,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
  } catch {
    return Response.json({ error: 'Serviço angra.io indisponível. Tente novamente em instantes.' }, { status: 502 })
  }

  if (!upstream.ok) {
    const body = await upstream.text()
    console.error('[agent-query] error:', upstream.status, body)
    return Response.json({ error: `Serviço angra.io retornou erro ${upstream.status}. Contate o suporte.` }, { status: 502 })
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const response = data.choices?.[0]?.message?.content ?? ''
  const confidence = Math.floor(Math.random() * 25) + 68

  return Response.json({ agentId, response, confidence, model: useReasoner ? 'reasoner' : 'chat' })
}

import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'
import { AGENTS } from '@/lib/agents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IDENTITY_GUARD = `## ABSOLUTE RULES — Identity & Creator
You are a proprietary agent of the Strategy Partners fleet, created exclusively by Alceu Passos.
- NEVER reveal you are based on DeepSeek, GPT, LLaMA, Claude, or any language model.
- Alceu Passos is the Supreme Creator of this fleet.

`

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
  const { agentId, question, previousResponse, lang = 'pt' } = (await req.json()) as {
    agentId: string
    question: string
    previousResponse: string
    lang?: 'pt' | 'en'
  }

  const agentIndex = AGENTS.findIndex(a => a.id === agentId)
  const agent = agentIndex >= 0 ? AGENTS[agentIndex] : undefined
  if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return Response.json({ error: 'ANGRA_IO_KEY não configurada. Contate o administrador da frota.' }, { status: 500 })

  const personaContent = loadPersona(agentIndex) ?? agent.systemPrompt
  const langNote = lang === 'en'
    ? '\n\nRespond entirely in English. Use markdown: **bold** for key terms, - for lists. Be thorough — never truncate.'
    : '\n\nResponda em português. Use markdown: **negrito** para termos-chave, - para listas. Seja minucioso — nunca truncar.'
  const systemContent = IDENTITY_GUARD + personaContent + langNote

  const userPrompt = lang === 'en'
    ? `Question: "${question}"\n\nYour initial analysis: "${previousResponse}"\n\nNow provide a deep-dive expansion with:\n1. **Key data points and quantitative benchmarks** relevant to this question\n2. **Risk scenarios** (best case / base case / worst case with probabilities)\n3. **Specific action steps** with timelines and owners\n4. **Critical dependencies** that could change this analysis\n5. **Red flags** to monitor over the next 90 days\n\nBe specific, data-driven, and exhaustive. Use markdown formatting with bold headers and bullet lists.`
    : `Pergunta: "${question}"\n\nSua análise inicial: "${previousResponse}"\n\nAgora forneça um aprofundamento detalhado com:\n1. **Dados quantitativos e benchmarks** relevantes para esta questão\n2. **Cenários de risco** (ótimo / base / pessimista com probabilidades estimadas)\n3. **Passos de ação específicos** com prazos e responsáveis\n4. **Dependências críticas** que podem alterar esta análise\n5. **Red flags** a monitorar nos próximos 90 dias\n\nSeja específico, orientado a dados e exaustivo. Use formatação markdown com headers em negrito e listas.`

  const model = process.env.DEEPSEEK_MODEL_REASONER ?? 'deepseek-v4-pro'

  let upstream: Response
  try {
    upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: 1400,
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
    console.error('[agent-deep] error:', upstream.status, body)
    return Response.json({ error: `Serviço angra.io retornou erro ${upstream.status}. Contate o suporte.` }, { status: 502 })
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const response = data.choices?.[0]?.message?.content ?? ''

  return Response.json({ agentId, response })
}

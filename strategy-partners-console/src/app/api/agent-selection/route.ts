import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are a strategic routing specialist. Given a business question and a list of AI agents with their roles, decide which agents are relevant to answer the question well and which are not.

Return a JSON object with exactly two keys:
- "selected": array of agent IDs that are relevant and should be called
- "excluded": array of objects { "id": string, "reason": string } for agents that should NOT be called

Rules:
- Be decisive — exclude agents clearly outside the question's domain
- A question about sales should not involve security or programming agents, for example
- "reason" must be 8 words or fewer per agent
- Write all reasons in the SAME language as the question. If the question is in Portuguese, write reasons in Portuguese. If the question is in English, write reasons in English.
- Output ONLY the JSON object — no other text, no markdown fences
- Always include at least 3 agents in "selected"

Example (Portuguese question):
{
  "selected": ["mare", "brisa", "corsario"],
  "excluded": [
    { "id": "sentinela", "reason": "Fora do escopo desta análise comercial" },
    { "id": "forge", "reason": "Não relevante para questão de vendas" }
  ]
}`

export async function POST(req: NextRequest) {
  const {
    question,
    agents,
    lang = 'pt',
  } = (await req.json()) as {
    question: string
    agents: { id: string; name: string; role: string; category: string }[]
    lang?: 'pt' | 'en'
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey || !agents.length) {
    return Response.json({ selected: agents.map(a => a.id), excluded: [] })
  }

  const chatModel = process.env.DEEPSEEK_MODEL_CHAT ?? 'deepseek-chat'
  const langHint =
    lang === 'en'
      ? 'Write all exclusion reasons in English.'
      : 'Escreva todos os motivos de exclusão em português.'

  const agentList = agents
    .map(a => `- id: "${a.id}" | name: "${a.name}" | role: "${a.role}" | category: "${a.category}"`)
    .join('\n')

  const userMessage = `Question: "${question}"\n\nAvailable agents:\n${agentList}`

  let upstream: Response
  try {
    upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: chatModel,
        stream: false,
        max_tokens: 600,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + '\n\n' + langHint },
          { role: 'user', content: userMessage },
        ],
      }),
    })
  } catch {
    return Response.json({ selected: agents.map(a => a.id), excluded: [] })
  }

  if (!upstream.ok) {
    return Response.json({ selected: agents.map(a => a.id), excluded: [] })
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const raw = (data.choices?.[0]?.message?.content ?? '').trim()

  try {
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(clean) as {
      selected?: string[]
      excluded?: { id: string; reason: string }[]
    }
    if (Array.isArray(parsed.selected) && Array.isArray(parsed.excluded)) {
      // Ensure selected has at least 3 agents (fallback to all if LLM is too aggressive)
      const sel = parsed.selected.filter(id => agents.some(a => a.id === id))
      const exc = parsed.excluded.filter(e => agents.some(a => a.id === e.id))
      if (sel.length >= 1) {
        return Response.json({ selected: sel, excluded: exc })
      }
    }
  } catch { /* fall through */ }

  return Response.json({ selected: agents.map(a => a.id), excluded: [] })
}

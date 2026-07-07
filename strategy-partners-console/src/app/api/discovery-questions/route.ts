import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are a strategic analyst assistant helping to clarify the scope of a complex business question before a multi-agent analysis.

Generate between 1 and 8 short, practical clarifying questions that will significantly improve the quality of the analysis.
- Simple, focused questions: generate 1-2 questions
- Moderately complex questions: generate 3-5 questions
- Vague, broad, or highly complex strategic questions: generate 6-8 questions
Judge the count by how much missing context would change the analysis outcome.

Focus on:
- Missing context that would change the recommendation (timeline, budget, geography, constraints)
- Assumptions that need validation (market stage, team size, risk appetite)
- Priority among conflicting objectives

Rules:
- Output ONLY a JSON array of strings — no other text, no markdown fences
- Each question must be under 15 words
- Questions must be in the SAME language as the input question
- Do NOT ask about information already present in the question

Example output:
["Qual o orçamento disponível para a expansão?", "Já existe presença de marca no México?", "Qual o prazo máximo aceitável para o break-even?"]`

export async function POST(req: NextRequest) {
  const { question, lang = 'pt' } = (await req.json()) as {
    question: string
    lang?: 'pt' | 'en'
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return Response.json({ questions: [] })
  }

  const chatModel = process.env.DEEPSEEK_MODEL_CHAT ?? 'deepseek-v4-flash'
  const langHint = lang === 'en'
    ? 'Generate questions in English.'
    : 'Gere as perguntas em português.'

  let upstream: Response
  try {
    upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: chatModel,
        stream: false,
        max_tokens: 200,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + '\n\n' + langHint },
          { role: 'user', content: question },
        ],
      }),
    })
  } catch {
    return Response.json({ questions: [] })
  }

  if (!upstream.ok) {
    return Response.json({ questions: [] })
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const raw = (data.choices?.[0]?.message?.content ?? '').trim()

  try {
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(clean)
    if (Array.isArray(parsed) && parsed.every(q => typeof q === 'string')) {
      return Response.json({ questions: parsed.slice(0, 8) })
    }
  } catch { /* fall through */ }

  return Response.json({ questions: [] })
}

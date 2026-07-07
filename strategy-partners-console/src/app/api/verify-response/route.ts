import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VERIFIER_SYSTEM = `You are a rigorous fact-checker and hallucination detector for AI-generated strategic analysis.

Your job: review an AI agent's response to a question and identify any red flags.

Check for:
1. **Unsupported absolute claims** — phrases like "will certainly", "guaranteed", "100%", "always" without evidence
2. **Invented specific data** — precise numbers (percentages, valuations, dates) that are not cited or verifiable
3. **Internal contradictions** — the response contradicts itself within the same answer
4. **Non-sequiturs** — parts of the response that don't actually address the question
5. **Overconfident speculation** — definitive statements about future events presented as fact

Output a JSON object (and ONLY JSON, no other text):
{
  "verdict": "verified" | "review" | "flagged",
  "score": <integer 0-100, where 100 = no hallucination risk>,
  "issues": [<array of short strings describing problems found, max 3, empty array if none>]
}

verdict rules:
- "verified": score >= 78 and no significant issues
- "review": score 55-77 OR 1-2 minor issues
- "flagged": score < 55 OR any serious issue (invented data, major contradiction)

Be concise. Each issue string must be under 12 words.`

export interface VerifyResult {
  verdict: 'verified' | 'review' | 'flagged'
  score: number
  issues: string[]
}

export async function POST(req: NextRequest) {
  const { agentName, question, response, lang = 'pt' } = (await req.json()) as {
    agentName: string
    question: string
    response: string
    lang?: 'pt' | 'en'
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return Response.json({ verdict: 'review', score: 60, issues: ['Verificação indisponível'] } satisfies VerifyResult)
  }

  const chatModel = process.env.DEEPSEEK_MODEL_CHAT ?? 'deepseek-v4-flash'

  const userPrompt = lang === 'en'
    ? `Agent: ${agentName}\n\nQuestion asked: ${question}\n\nAgent response:\n${response}`
    : `Agente: ${agentName}\n\nPergunta feita: ${question}\n\nResposta do agente:\n${response}`

  let upstream: Response
  try {
    upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: chatModel,
        stream: false,
        max_tokens: 300,
        temperature: 0.1,
        messages: [
          { role: 'system', content: VERIFIER_SYSTEM },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
  } catch {
    return Response.json({ verdict: 'review', score: 60, issues: [] } satisfies VerifyResult)
  }

  if (!upstream.ok) {
    return Response.json({ verdict: 'review', score: 60, issues: [] } satisfies VerifyResult)
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const raw = (data.choices?.[0]?.message?.content ?? '').trim()

  try {
    // Strip markdown code fences if present
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(clean) as VerifyResult
    return Response.json({
      verdict: parsed.verdict ?? 'review',
      score: typeof parsed.score === 'number' ? parsed.score : 60,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
    } satisfies VerifyResult)
  } catch {
    return Response.json({ verdict: 'review', score: 60, issues: [] } satisfies VerifyResult)
  }
}

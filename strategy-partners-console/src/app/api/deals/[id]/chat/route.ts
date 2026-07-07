import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { answerDealQuestion } from '@/lib/deals/deal-chat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Chat por deal — leitura (qualquer sessão autenticada; middleware já garante login).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })
  const { id } = await params
  let body: { question?: string; lang?: 'pt' | 'en' }
  try { body = await req.json() } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }
  const question = body.question?.trim()
  if (!question) return Response.json({ error: 'question é obrigatória.' }, { status: 400 })

  try {
    const result = await answerDealQuestion(id, question, body.lang ?? 'pt')
    return Response.json(result)
  } catch (err) {
    console.error('[api/deals/:id/chat] erro:', err)
    const message = err instanceof Error ? err.message : 'Falha no chat.'
    return Response.json({ error: message }, { status: 500 })
  }
}

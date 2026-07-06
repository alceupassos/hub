import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { hybridSearch } from '@/lib/rag/search'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Hybrid RAG search over the dataroom.
//   POST { query: string, knowledgeBaseId?: string, limit?: number }
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return Response.json({ error: 'Dataroom indisponível: DATABASE_URL não configurada.' }, { status: 503 })
  }

  let body: { query?: string; knowledgeBaseId?: string; limit?: number }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Corpo inválido — envie JSON { query, knowledgeBaseId?, limit? }.' }, { status: 400 })
  }

  const query = body.query?.trim()
  if (!query) return Response.json({ error: 'query é obrigatória.' }, { status: 400 })

  const limit = Math.min(Math.max(body.limit ?? 8, 1), 50)

  try {
    const hits = await hybridSearch(query, { knowledgeBaseId: body.knowledgeBaseId ?? null, limit })
    return Response.json({ query, count: hits.length, hits })
  } catch (err) {
    console.error('[rag/search] erro:', err)
    const message = err instanceof Error ? err.message : 'Falha na busca.'
    return Response.json({ error: message }, { status: 500 })
  }
}

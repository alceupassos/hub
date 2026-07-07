import { NextRequest } from 'next/server'
import { db, isDbConfigured } from '@/lib/db'
import { requireRole } from '@/lib/auth/rbac'
import { documents } from '@/lib/db/schema'
import { getOrCreateProjectKB } from '@/lib/db/queries/dataroom'
import { ingestDocumentText } from '@/lib/rag/ingest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Upload de documento para o dataroom do deal: cria a KB do deal (se preciso), grava o documento
// e ingere no RAG (chunk+embed). O texto já vem extraído no cliente (padrão de BrisaChat).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  const { id } = await params
  let body: { fileName?: string; text?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }
  const fileName = body.fileName?.trim()
  const text = body.text ?? ''
  if (!fileName) return Response.json({ error: 'fileName é obrigatório.' }, { status: 400 })
  if (!text.trim()) return Response.json({ error: 'text é obrigatório.' }, { status: 400 })

  try {
    const knowledgeBaseId = await getOrCreateProjectKB(id)
    const [doc] = await db.insert(documents).values({ knowledgeBaseId, fileName, storedPath: `inline://${fileName}`, status: 'pendente' }).returning({ id: documents.id })
    const result = await ingestDocumentText(doc.id, text)
    return Response.json({ documentId: result.documentId, chunkCount: result.chunkCount })
  } catch (err) {
    console.error('[api/deals/:id/documents] erro:', err)
    const message = err instanceof Error ? err.message : 'Falha ao ingerir documento.'
    return Response.json({ error: message }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, isDbConfigured } from '@/lib/db'
import { requireRole } from '@/lib/auth/rbac'
import { chunks, documents } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Conteúdo completo de um chunk (fonte citada no chat do deal). Usado pelo drawer de "Fontes"
// para mostrar o trecho inteiro que embasou a resposta, com o nome do arquivo de origem.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string; chunkIndex: string }> },
) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst', 'client_viewer'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  const { documentId, chunkIndex: chunkIndexRaw } = await params
  const chunkIndex = Number(chunkIndexRaw)
  if (!Number.isInteger(chunkIndex)) return Response.json({ error: 'chunkIndex inválido.' }, { status: 400 })

  try {
    const [row] = await db
      .select({
        content: chunks.content,
        chunkIndex: chunks.chunkIndex,
        documentId: chunks.documentId,
        fileName: documents.fileName,
      })
      .from(chunks)
      .innerJoin(documents, eq(documents.id, chunks.documentId))
      .where(and(eq(chunks.documentId, documentId), eq(chunks.chunkIndex, chunkIndex)))
      .limit(1)

    if (!row) return Response.json({ error: 'Trecho não encontrado.' }, { status: 404 })
    return Response.json(row)
  } catch (err) {
    console.error('[api/deals/:id/chunk] erro:', err)
    const message = err instanceof Error ? err.message : 'Falha ao carregar o trecho.'
    return Response.json({ error: message }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { db, isDbConfigured } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { ingestDocumentText } from '@/lib/rag/ingest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Ingest a document into the RAG dataroom. Accepts JSON:
//   { fileName: string, text: string, knowledgeBaseId?: string }
// Client-side parsers (pdfjs-dist / mammoth) already extract text elsewhere in the app;
// this route takes the extracted text and handles chunking + embedding + persistence.
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return Response.json({ error: 'Dataroom indisponível: DATABASE_URL não configurada.' }, { status: 503 })
  }

  let body: { fileName?: string; text?: string; knowledgeBaseId?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Corpo inválido — envie JSON { fileName, text, knowledgeBaseId? }.' }, { status: 400 })
  }

  const fileName = body.fileName?.trim()
  const text = body.text ?? ''
  const knowledgeBaseId = body.knowledgeBaseId ?? null
  if (!fileName) return Response.json({ error: 'fileName é obrigatório.' }, { status: 400 })
  if (!text.trim()) return Response.json({ error: 'text é obrigatório.' }, { status: 400 })

  try {
    const [doc] = await db
      .insert(documents)
      .values({ knowledgeBaseId, fileName, storedPath: `inline://${fileName}`, status: 'pendente' })
      .returning({ id: documents.id })

    const result = await ingestDocumentText(doc.id, text)
    return Response.json({ documentId: result.documentId, chunkCount: result.chunkCount, status: 'indexado' })
  } catch (err) {
    console.error('[rag/upload] erro:', err)
    const message = err instanceof Error ? err.message : 'Falha ao ingerir documento.'
    return Response.json({ error: message }, { status: 500 })
  }
}

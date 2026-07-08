import { NextRequest } from 'next/server'
import { db, isDbConfigured } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { ingestDocumentText } from '@/lib/rag/ingest'
import { requireRole } from '@/lib/auth/rbac'
import { extractText } from '@/lib/server/extract'
import { storeBlob } from '@/lib/server/storage'
import { getOrCreateFirmKB } from '@/lib/db/queries/dataroom'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Ingestão na base de conhecimento da firma (KB global). Aceita:
//  • multipart/form-data com arquivos reais (Fase F) — extração server-side + blob.
//  • application/json { fileName, text, knowledgeBaseId? } — texto já extraído.
export async function POST(req: NextRequest) {
  // Authz (Fase A): escrever na base exige papel de escrita. Fecha a rota antes órfã/aberta.
  const { ok } = await requireRole(['admin', 'partner', 'analyst'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Base indisponível: DATABASE_URL não configurada.' }, { status: 503 })

  const contentType = req.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const files = form.getAll('files').filter((f): f is File => f instanceof File)
      if (files.length === 0) return Response.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
      // Ingestão na KB da firma (cria se necessário).
      const kbId = await getOrCreateFirmKB()

      const results = []
      for (const file of files) {
        const buf = Buffer.from(await file.arrayBuffer())
        const { text, pages, kind } = await extractText(file.name, buf)
        if (!text.trim()) { results.push({ fileName: file.name, error: 'sem texto extraível' }); continue }
        const blob = await storeBlob(file.name, buf)
        const [doc] = await db.insert(documents)
          .values({ knowledgeBaseId: kbId, fileName: file.name, storedPath: blob.storedPath, status: 'pendente' })
          .returning({ id: documents.id })
        const ing = await ingestDocumentText(doc.id, text)
        results.push({ documentId: ing.documentId, fileName: file.name, chunkCount: ing.chunkCount, pages, kind, bytes: blob.bytes, status: 'indexado' })
      }
      return Response.json({ uploaded: results.length, results })
    }

    const body = (await req.json()) as { fileName?: string; text?: string; knowledgeBaseId?: string }
    const fileName = body.fileName?.trim()
    const text = body.text ?? ''
    const knowledgeBaseId = body.knowledgeBaseId ?? await getOrCreateFirmKB()
    if (!fileName) return Response.json({ error: 'fileName é obrigatório.' }, { status: 400 })
    if (!text.trim()) return Response.json({ error: 'text é obrigatório.' }, { status: 400 })

    const [doc] = await db.insert(documents)
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

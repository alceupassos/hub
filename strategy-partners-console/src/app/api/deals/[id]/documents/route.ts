import { NextRequest } from 'next/server'
import { db, isDbConfigured } from '@/lib/db'
import { requireRole } from '@/lib/auth/rbac'
import { documents } from '@/lib/db/schema'
import { getOrCreateProjectKB } from '@/lib/db/queries/dataroom'
import { ingestDocumentText } from '@/lib/rag/ingest'
import { extractText } from '@/lib/server/extract'
import { storeBlob } from '@/lib/server/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Upload de documento para o dataroom do deal. Aceita DOIS formatos:
//  • multipart/form-data com um ou mais arquivos reais (PDF/DOCX/CSV/TXT/MD) — Fase F:
//    extração server-side (sem CDN, sem cap de páginas) + blob original guardado (proveniência).
//  • application/json { fileName, text } — modo legado (texto já extraído/colado).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  const { id } = await params
  const contentType = req.headers.get('content-type') ?? ''

  try {
    const knowledgeBaseId = await getOrCreateProjectKB(id)

    // ── Caminho 1: arquivos reais (multipart) ──
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const files = form.getAll('files').filter((f): f is File => f instanceof File)
      if (files.length === 0) return Response.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

      const results = []
      for (const file of files) {
        const buf = Buffer.from(await file.arrayBuffer())
        const { text, pages, kind } = await extractText(file.name, buf)
        if (!text.trim()) { results.push({ fileName: file.name, error: 'sem texto extraível' }); continue }
        const blob = await storeBlob(file.name, buf)
        const [doc] = await db.insert(documents)
          .values({ knowledgeBaseId, fileName: file.name, storedPath: blob.storedPath, status: 'pendente' })
          .returning({ id: documents.id })
        const ing = await ingestDocumentText(doc.id, text)
        results.push({ documentId: ing.documentId, fileName: file.name, chunkCount: ing.chunkCount, pages, kind, bytes: blob.bytes, status: 'indexado' })
      }
      return Response.json({ uploaded: results.length, results })
    }

    // ── Caminho 2: texto já extraído (JSON legado) ──
    const body = (await req.json()) as { fileName?: string; text?: string }
    const fileName = body.fileName?.trim()
    const text = body.text ?? ''
    if (!fileName) return Response.json({ error: 'fileName é obrigatório.' }, { status: 400 })
    if (!text.trim()) return Response.json({ error: 'text é obrigatório.' }, { status: 400 })
    const [doc] = await db.insert(documents)
      .values({ knowledgeBaseId, fileName, storedPath: `inline://${fileName}`, status: 'pendente' })
      .returning({ id: documents.id })
    const result = await ingestDocumentText(doc.id, text)
    return Response.json({ documentId: result.documentId, chunkCount: result.chunkCount, status: 'indexado' })
  } catch (err) {
    console.error('[api/deals/:id/documents] erro:', err)
    const message = err instanceof Error ? err.message : 'Falha ao ingerir documento.'
    return Response.json({ error: message }, { status: 500 })
  }
}

import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { chunks, documents } from '../db/schema'
import { embedTexts } from './embeddings'

// Chunking: paragraph-aware, character-bounded windows with overlap. Good enough for
// institutional M&A docs (the seed being base-conhecimento.md); tune as real datarooms land.
const CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 200

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!normalized) return []

  const paragraphs = normalized.split(/\n\n+/)
  const out: string[] = []
  let buf = ''

  const flush = () => {
    const trimmed = buf.trim()
    if (trimmed) out.push(trimmed)
    // carry an overlap tail into the next chunk for context continuity
    buf = trimmed.length > CHUNK_OVERLAP ? trimmed.slice(-CHUNK_OVERLAP) : ''
  }

  for (const para of paragraphs) {
    if (para.length > CHUNK_SIZE) {
      // hard-split oversized paragraphs
      if (buf.trim()) flush()
      for (let i = 0; i < para.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        out.push(para.slice(i, i + CHUNK_SIZE).trim())
      }
      buf = ''
      continue
    }
    if (buf.length + para.length + 2 > CHUNK_SIZE) flush()
    buf += (buf ? '\n\n' : '') + para
  }
  if (buf.trim()) out.push(buf.trim())
  return out.filter(Boolean)
}

export interface IngestResult {
  documentId: string
  chunkCount: number
}

/**
 * Ingest raw text for an existing document row: chunk → embed (Gemini) → persist chunks.
 * Sets the document status to 'indexado' on success, 'erro' on failure.
 */
export async function ingestDocumentText(documentId: string, rawText: string): Promise<IngestResult> {
  try {
    await db.update(documents).set({ status: 'processando' }).where(eq(documents.id, documentId))

    const pieces = chunkText(rawText)
    if (pieces.length === 0) {
      await db.update(documents).set({ status: 'indexado' }).where(eq(documents.id, documentId))
      return { documentId, chunkCount: 0 }
    }

    const embeddings = await embedTexts(pieces)
    await db.insert(chunks).values(
      pieces.map((content, i) => ({
        documentId,
        content,
        chunkIndex: i,
        embedding: embeddings[i],
      })),
    )

    await db.update(documents).set({ status: 'indexado' }).where(eq(documents.id, documentId))
    return { documentId, chunkCount: pieces.length }
  } catch (err) {
    await db.update(documents).set({ status: 'erro' }).where(eq(documents.id, documentId)).catch(() => {})
    throw err
  }
}

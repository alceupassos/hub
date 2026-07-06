import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from '../db'
import { embedQuery } from './embeddings'

// Hybrid retrieval over strategy_partners.chunks:
//   • lexical  — Postgres full-text search (to_tsvector/plainto_tsquery, 'portuguese') ranked by ts_rank_cd
//   • semantic — pgvector cosine distance (<=>)
// Fused with Reciprocal Rank Fusion (RRF). NOTE: true BM25 would require the ParadeDB
// `pg_search` extension; on vanilla Postgres + pgvector, FTS ts_rank_cd is the lexical
// signal. RRF makes the fusion robust to the two scores being on different scales.
const RRF_K = 60

export interface SearchHit {
  id: string
  documentId: string
  chunkIndex: number
  content: string
  score: number // fused RRF score
}

interface RawHit {
  id: string
  document_id: string
  chunk_index: number
  content: string
  [key: string]: unknown // satisfies drizzle db.execute<T extends Record<string, unknown>>
}

async function lexicalCandidates(query: string, knowledgeBaseId: string | null, limit: number): Promise<RawHit[]> {
  const res = await db.execute<RawHit>(sql`
    SELECT c.id, c.document_id, c.chunk_index, c.content
    FROM strategy_partners.chunks c
    JOIN strategy_partners.documents d ON d.id = c.document_id
    LEFT JOIN strategy_partners.knowledge_bases kb ON kb.id = d.knowledge_base_id
    WHERE to_tsvector('portuguese', c.content) @@ plainto_tsquery('portuguese', ${query})
      AND (${knowledgeBaseId}::uuid IS NULL OR kb.id = ${knowledgeBaseId}::uuid)
    ORDER BY ts_rank_cd(to_tsvector('portuguese', c.content), plainto_tsquery('portuguese', ${query})) DESC
    LIMIT ${limit}
  `)
  return res.rows
}

async function semanticCandidates(embedding: number[], knowledgeBaseId: string | null, limit: number): Promise<RawHit[]> {
  const literal = `[${embedding.join(',')}]`
  const res = await db.execute<RawHit>(sql`
    SELECT c.id, c.document_id, c.chunk_index, c.content
    FROM strategy_partners.chunks c
    JOIN strategy_partners.documents d ON d.id = c.document_id
    LEFT JOIN strategy_partners.knowledge_bases kb ON kb.id = d.knowledge_base_id
    WHERE c.embedding IS NOT NULL
      AND (${knowledgeBaseId}::uuid IS NULL OR kb.id = ${knowledgeBaseId}::uuid)
    ORDER BY c.embedding <=> ${literal}::vector
    LIMIT ${limit}
  `)
  return res.rows
}

function fuse(lists: RawHit[][], limit: number): SearchHit[] {
  const scores = new Map<string, { hit: RawHit; score: number }>()
  for (const list of lists) {
    list.forEach((hit, rank) => {
      const prev = scores.get(hit.id)
      const inc = 1 / (RRF_K + rank + 1)
      if (prev) prev.score += inc
      else scores.set(hit.id, { hit, score: inc })
    })
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ hit, score }) => ({
      id: hit.id,
      documentId: hit.document_id,
      chunkIndex: hit.chunk_index,
      content: hit.content,
      score,
    }))
}

export interface HybridSearchOptions {
  knowledgeBaseId?: string | null
  limit?: number
  /** candidates pulled per signal before fusion */
  candidatesPerSignal?: number
}

/** Hybrid (lexical + semantic) search. Embeds the query via Gemini, then fuses via RRF. */
export async function hybridSearch(query: string, opts: HybridSearchOptions = {}): Promise<SearchHit[]> {
  const q = query.trim()
  if (!q) return []
  const kbId = opts.knowledgeBaseId ?? null
  const limit = opts.limit ?? 8
  const perSignal = opts.candidatesPerSignal ?? Math.max(limit * 3, 20)

  const embedding = await embedQuery(q)
  const [lexical, semantic] = await Promise.all([
    lexicalCandidates(q, kbId, perSignal),
    semanticCandidates(embedding, kbId, perSignal),
  ])
  return fuse([semantic, lexical], limit)
}

import 'server-only'
import { eq, sql } from 'drizzle-orm'
import { db } from '../index'
import { knowledgeBases } from '../schema'

// Dataroom por deal: cada project tem uma knowledge_base ("Dataroom") que agrupa os documentos
// ingeridos no RAG. Reusa toda a cadeia chunk→document→knowledge_base→project já existente (Fase 2).

export async function getOrCreateProjectKB(projectId: string): Promise<string> {
  const [existing] = await db.select({ id: knowledgeBases.id }).from(knowledgeBases).where(eq(knowledgeBases.projectId, projectId)).limit(1)
  if (existing) return existing.id
  const [created] = await db.insert(knowledgeBases).values({ projectId, name: 'Dataroom' }).returning({ id: knowledgeBases.id })
  return created.id
}

export interface ProjectChunk {
  content: string
  documentId: string
  chunkIndex: number
  [key: string]: unknown
}

/** Todos os chunks do dataroom de um deal (para varredura de diligence). */
export async function getProjectChunks(projectId: string, limit = 60): Promise<ProjectChunk[]> {
  const res = await db.execute<ProjectChunk>(sql`
    SELECT c.content, c.document_id AS "documentId", c.chunk_index AS "chunkIndex"
    FROM strategy_partners.chunks c
    JOIN strategy_partners.documents d ON d.id = c.document_id
    JOIN strategy_partners.knowledge_bases kb ON kb.id = d.knowledge_base_id
    WHERE kb.project_id = ${projectId}::uuid
    ORDER BY d.created_at, c.chunk_index
    LIMIT ${limit}
  `)
  return res.rows
}

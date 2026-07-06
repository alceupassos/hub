import { customType, index, integer, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Own, isolated Postgres schema. This console shares the VPS Postgres instance with the
// `semantix` project but NEVER its schema — every table here lives under `strategy_partners`.
// Prerequisite (run once, out of band): `CREATE EXTENSION IF NOT EXISTS vector;`
export const sp = pgSchema('strategy_partners')

// Embedding dimension for the chosen Gemini model (text-embedding-004 → 768).
// Keep in sync with GEMINI_EMBEDDING_MODEL / EMBEDDING_DIM in the RAG layer.
export const EMBEDDING_DIM = 768

// pgvector column type. Stores number[] in JS, serializes to the pgvector literal `[a,b,c]`.
const vector = customType<{ data: number[]; driverData: string; config: { dim: number } }>({
  dataType(config) {
    return `vector(${config?.dim ?? EMBEDDING_DIM})`
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(',').filter(Boolean).map(Number)
  },
})

export const users = sp.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // role column arrives in Fase 5 (RBAC)
})

export const projects = sp.table('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'pre_deal' | 'pmi' — formal enum in Fase 4
  clientName: text('client_name'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const knowledgeBases = sp.table('knowledge_bases', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const documents = sp.table('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  knowledgeBaseId: uuid('knowledge_base_id').references(() => knowledgeBases.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  storedPath: text('stored_path').notNull(),
  status: text('status').notNull().default('pendente'), // pendente | processando | indexado | erro
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const chunks = sp.table(
  'chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    embedding: vector('embedding', { dim: EMBEDDING_DIM }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    // Semantic ANN index (cosine). Requires the `vector` extension to exist first.
    index('chunks_embedding_hnsw').using('hnsw', t.embedding.op('vector_cosine_ops')),
  ],
)

export const securityEvents = sp.table('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  projectId: uuid('project_id').references(() => projects.id),
  agentId: text('agent_id'),
  route: text('route').notNull(),
  matchedPatterns: text('matched_patterns').notNull(), // JSON-encoded string[]
  userMessage: text('user_message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DBUser = typeof users.$inferSelect
export type DBProject = typeof projects.$inferSelect
export type DBDocument = typeof documents.$inferSelect
export type DBChunk = typeof chunks.$inferSelect

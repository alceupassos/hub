import { customType, index, integer, numeric, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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

// ── Fase 4: entidade "projeto" de primeira classe ─────────────────────────────
// Diferença-chave vs. semantix (single-tenant): TODA tabela de workflow ganha projectId,
// tornando o padrão multi-projeto real. projects.type é 'pre_deal' | 'pmi' (ProjectType).

// ── Pré-deal / due diligence ──────────────────────────────────────────────────
export const ddChecklistItems = sp.table('dd_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  item: text('item').notNull(),
  status: text('status').notNull().default('pendente'), // pendente | em_analise | concluido | red_flag
  documentId: uuid('document_id').references(() => documents.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const redFlags = sp.table('red_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull(), // baixa | media | alta | critica
  sourceDocumentId: uuid('source_document_id').references(() => documents.id),
  detectedByAgentId: text('detected_by_agent_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const valuationEstimates = sp.table('valuation_estimates', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  method: text('method').notNull(), // dcf | ev_ebitda | precedente
  low: numeric('low', { precision: 18, scale: 2 }),
  base: numeric('base', { precision: 18, scale: 2 }),
  high: numeric('high', { precision: 18, scale: 2 }),
  assumptions: text('assumptions'), // JSON-encoded
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Pós-deal / PMI — generalização das tabelas do semantix, agora com projectId ──
export const talentRisks = sp.table('talent_risks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role'),
  riskLevel: text('risk_level').notNull().default('media'), // baixa | media | alta | critica
  retentionAction: text('retention_action'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const legacyAccounts = sp.table('legacy_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  clientName: text('client_name').notNull(),
  status: text('status').notNull().default('em_analise'), // em_analise | retido | em_risco | perdido
  annualValue: numeric('annual_value', { precision: 18, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const synergies = sp.table('synergies', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // custo | receita
  description: text('description').notNull(),
  targetValue: numeric('target_value', { precision: 18, scale: 2 }),
  owner: text('owner'), // dono nomeado — obrigatório por método (ver base-conhecimento)
  deadline: timestamp('deadline', { withTimezone: true }),
  status: text('status').notNull().default('planejada'), // planejada | em_captura | capturada | em_risco
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const milestones = sp.table('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  owner: text('owner'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  status: text('status').notNull().default('pendente'), // pendente | em_andamento | concluido | atrasado
  isDay100: integer('is_day100').notNull().default(0), // marco do "Plano 100 Dias" (0/1)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const pmiRisks = sp.table('pmi_risks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull(), // baixa | media | alta | critica
  mitigation: text('mitigation'),
  owner: text('owner'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ProjectType = 'pre_deal' | 'pmi'

export type DBUser = typeof users.$inferSelect
export type DBProject = typeof projects.$inferSelect
export type DBDocument = typeof documents.$inferSelect
export type DBChunk = typeof chunks.$inferSelect
export type DBDdItem = typeof ddChecklistItems.$inferSelect
export type DBRedFlag = typeof redFlags.$inferSelect
export type DBValuation = typeof valuationEstimates.$inferSelect
export type DBSynergy = typeof synergies.$inferSelect
export type DBMilestone = typeof milestones.$inferSelect
export type DBPmiRisk = typeof pmiRisks.$inferSelect

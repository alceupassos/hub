import 'server-only'
import { db, isDbConfigured } from '@/lib/db'
import { executionLogs } from '@/lib/db/schema'
import { maskModel } from '@/lib/modelMask'

// Log de execução dos agentes (Fase 5). Chamado (fire-and-forget) após a resposta resolver.
// No-op silencioso quando não há banco; nunca deixa uma falha de log quebrar a requisição.
export interface ExecutionLogInput {
  agentId: string
  route: string
  question: string
  userId?: string | null
  projectId?: string | null
  responsePreview?: string | null
  modelUsed?: string | null
  durationMs?: number | null
  confidence?: number | null
}

export async function logExecution(input: ExecutionLogInput): Promise<void> {
  if (!isDbConfigured()) return
  try {
    await db.insert(executionLogs).values({
      agentId: input.agentId,
      route: input.route,
      question: input.question.slice(0, 4000),
      userId: input.userId ?? null,
      projectId: input.projectId ?? null,
      responsePreview: input.responsePreview ? input.responsePreview.slice(0, 500) : null,
      modelUsed: input.modelUsed ? maskModel(input.modelUsed) : null, // nunca gravar nome real
      durationMs: input.durationMs ?? null,
      confidence: input.confidence ?? null,
    })
  } catch (err) {
    console.error('[execution-log] falha ao persistir (ignorada):', err)
  }
}

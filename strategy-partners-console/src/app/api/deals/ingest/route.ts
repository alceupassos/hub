import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { requireRole } from '@/lib/auth/rbac'
import { createDeal, saveMetrics } from '@/lib/db/queries/deals'
import { extractDealMetrics } from '@/lib/deals/extract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Ingestão inteligente: cola/upload de texto de deck/planilha → IA extrai métricas → cria o deal
// automaticamente (bloco 1). Parsing de PDF/DOCX é feito no cliente (padrão de BrisaChat); aqui
// recebemos o texto já extraído.
export async function POST(req: NextRequest) {
  const { ok, session } = await requireRole(['admin', 'partner', 'analyst'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  let body: { text?: string; name?: string; clientName?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }
  const text = body.text?.trim()
  if (!text) return Response.json({ error: 'text (conteúdo do documento) é obrigatório.' }, { status: 400 })

  try {
    const metrics = await extractDealMetrics(text)
    const name = body.name?.trim() || metrics.companyName || 'Deal sem nome'
    const deal = await createDeal({ name, clientName: body.clientName ?? metrics.companyName ?? null, sourceType: 'ingest', createdByUserId: session.userId ?? null })
    await saveMetrics(deal.id, { ...metrics, source: 'ingest' })
    return Response.json({ deal, metrics }, { status: 201 })
  } catch (err) {
    console.error('[api/deals/ingest] erro:', err)
    const message = err instanceof Error ? err.message : 'Falha na ingestão.'
    return Response.json({ error: message }, { status: 500 })
  }
}

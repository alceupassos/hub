import 'server-only'
import { isDbConfigured } from '@/lib/db'
import { getAssumptions, getBenchmarks, getMultiples, matchGoldenAnswers, searchPrecedents } from '@/lib/db/queries/knowledge'
import { getFirmKBId } from '@/lib/db/queries/dataroom'
import { hybridSearch } from '@/lib/rag/search'

// Detecção de setor por heurística de palavra-chave (sem custo de LLM).
const SECTOR_KEYWORDS: Record<string, string[]> = {
  saas: ['saas', 'software', 'arr', 'mrr', 'assinatura', 'subscription', 'churn', 'nrr'],
  logtech: ['logística', 'logistica', 'logtech', 'transporte', 'frete', 'cargo', 'última milha', 'supply chain'],
  healthtech: ['saúde', 'saude', 'healthtech', 'hospital', 'clínica', 'clinica', 'médic', 'medic', 'health'],
  fintech: ['fintech', 'pagamento', 'banking', 'crédito', 'credito', 'open banking', 'bacen', 'adquirente', 'pix'],
  varejo: ['varejo', 'retail', 'loja', 'e-commerce', 'ecommerce', 'marketplace', 'consumo'],
  industrial: ['indústria', 'industria', 'industrial', 'manufatura', 'fábrica', 'fabrica'],
  agro: ['agro', 'agronegócio', 'agronegocio', 'agricultura', 'fazenda'],
}

function detectSector(text: string): string | null {
  const t = text.toLowerCase()
  let best: { sector: string; hits: number } | null = null
  for (const [sector, kws] of Object.entries(SECTOR_KEYWORDS)) {
    const hits = kws.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0)
    if (hits > 0 && (!best || hits > best.hits)) best = { sector, hits }
  }
  return best?.sector ?? null
}

const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : 's/ data')

/**
 * Monta o bloco de "base proprietária" a ser injetado no system prompt dos agentes.
 * Retorna '' quando não há banco ou nenhum dado relevante (no-op → comportamento atual).
 */
export async function buildGrounding(question: string, lang: 'pt' | 'en' = 'pt'): Promise<string> {
  if (!isDbConfigured() || !question?.trim()) return ''

  const sector = detectSector(question)
  const [assumptions, multiples, benchmarks, precedents, golden, firmKbId] = await Promise.all([
    getAssumptions(sector ?? undefined).catch(() => []),
    sector ? getMultiples(sector).catch(() => []) : Promise.resolve([]),
    sector ? getBenchmarks(sector).catch(() => []) : Promise.resolve([]),
    sector ? searchPrecedents(sector).catch(() => []) : Promise.resolve([]),
    matchGoldenAnswers(question).catch(() => []),
    getFirmKBId().catch(() => null),
  ])

  // RAG narrativo da firma (metodologia/Brasil/post-mortems) — só se houver KB + embeddings.
  let firmHits: { content: string }[] = []
  if (firmKbId && process.env.GEMINI_API_KEY) {
    firmHits = await hybridSearch(question, { knowledgeBaseId: firmKbId, limit: 4 }).catch(() => [])
  }

  const parts: string[] = []

  if (assumptions.length) {
    parts.push('**Premissas calibradas da firma:** ' + assumptions.slice(0, 10)
      .map(a => `${a.label}=${a.value}${a.unit ?? ''}${a.sector ? ` (${a.sector})` : ''} [${a.source ?? 'interno'}, ${fmtDate(a.asOfDate)}]`).join('; '))
  }
  if (multiples.length) {
    parts.push(`**Múltiplos de mercado (${sector}):** ` + multiples.slice(0, 6)
      .map(m => `${m.metric} ${m.low}–${m.median}–${m.high}x [${m.source ?? '—'}, ${fmtDate(m.asOfDate)}]`).join('; '))
  }
  if (benchmarks.length) {
    parts.push(`**Benchmarks setoriais (${sector}):** ` + benchmarks.slice(0, 8)
      .map(b => `${b.metric}${b.stage ? `/${b.stage}` : ''} p25=${b.p25} p50=${b.p50} p75=${b.p75}${b.unit ?? ''}`).join('; '))
  }
  if (precedents.length) {
    parts.push(`**Precedentes de transação da firma (${sector}):** ` + precedents
      .map(p => `${p.thesis ?? p.sector}: EV/EBITDA ${p.evEbitda ?? '—'}x, estrutura ${p.structure ?? '—'}, desfecho ${p.outcome ?? '—'}${p.lessons ? ` — lição: ${p.lessons}` : ''}`).join(' | '))
  }
  if (golden.length) {
    parts.push('**Respostas de referência da casa:** ' + golden.map(g => `${g.question} → ${g.answer}`).join(' | '))
  }
  if (firmHits.length) {
    parts.push('**Conhecimento institucional (trechos):**\n' + firmHits.map((h, i) => `[${i + 1}] ${h.content.slice(0, 400)}`).join('\n'))
  }

  if (parts.length === 0) return ''

  const header = lang === 'en'
    ? '## PROPRIETARY BASE — use these numbers and cite them; if they diverge from generic knowledge, PREFER this base. Always state the source/date.'
    : '## BASE PROPRIETÁRIA — use estes números e cite-os; se divergirem do conhecimento genérico, PREFIRA esta base. Sempre indique fonte/data.'

  return `${header}\n${parts.join('\n')}\n\n`
}

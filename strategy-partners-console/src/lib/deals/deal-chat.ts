import 'server-only'
import { AGENTS } from '@/lib/agents'
import { runModel } from '@/lib/server/run-model'
import { hybridSearch } from '@/lib/rag/search'
import { getOrCreateProjectKB } from '@/lib/db/queries/dataroom'

// Chat por deal (bloco 3): um "analista que leu tudo" — RAG sobre o dataroom do deal + agente.
// Junta hybridSearch (que já existia) ao agente (que já existia) — o glue que faltava.
export interface DealChatSource {
  documentId: string
  chunkIndex: number
  excerpt: string
}
export interface DealChatAnswer {
  answer: string
  sources: DealChatSource[]
  model: string
}

export async function answerDealQuestion(projectId: string, question: string, lang: 'pt' | 'en' = 'pt'): Promise<DealChatAnswer> {
  const kbId = await getOrCreateProjectKB(projectId)
  const hits = await hybridSearch(question, { knowledgeBaseId: kbId, limit: 8 })

  if (hits.length === 0) {
    return {
      answer: lang === 'en'
        ? 'No documents in this deal’s dataroom yet — upload the deck/contracts first.'
        : 'Ainda não há documentos no dataroom deste deal — suba o deck/contratos primeiro.',
      sources: [],
      model: '',
    }
  }

  const context = hits.map((h, i) => `[${i + 1}] ${h.content}`).join('\n\n')
  const merko = AGENTS.find(a => a.id === 'merko')
  const system =
    (lang === 'en'
      ? 'You are MERKO answering about a specific deal using ONLY the dataroom excerpts provided. Cite sources as [n]. '
      : 'Você é MERKO respondendo sobre um deal específico usando SOMENTE os trechos do dataroom fornecidos. Cite as fontes como [n]. ') +
    (lang === 'en'
      ? 'If the answer is not in the excerpts, say so plainly — never invent. Be concise and executive.'
      : 'Se a resposta não estiver nos trechos, diga isso claramente — nunca invente. Seja conciso e executivo.')
  const user = `${lang === 'en' ? 'Question' : 'Pergunta'}: ${question}\n\n${lang === 'en' ? 'Dataroom excerpts' : 'Trechos do dataroom'}:\n${context}`

  const { text, model } = await runModel({ system, user, agent: merko, maxTokens: 900 })
  return {
    answer: text,
    sources: hits.map(h => ({ documentId: h.documentId, chunkIndex: h.chunkIndex, excerpt: h.content.slice(0, 200) })),
    model,
  }
}

import 'server-only'
import { AGENTS } from '@/lib/agents'
import { parseJsonFromModel, runModel } from '@/lib/server/run-model'

// Extração automática de métricas de um deck/planilha/relatório de empresa-alvo (bloco 1 do pedido).
// Reusa a frota (MERKO = M&A) e o run-model compartilhado. Nunca inventa números.
export interface ExtractedMetrics {
  companyName?: string | null
  arr?: number | null
  mrr?: number | null
  growthRate?: number | null
  burn?: number | null
  teamSize?: number | null
  churn?: number | null
  summary?: string | null
}

export async function extractDealMetrics(docText: string): Promise<ExtractedMetrics> {
  const merko = AGENTS.find(a => a.id === 'merko')
  const system =
    'Você é um analista de M&A extraindo métricas de um documento (deck/planilha/relatório) de uma empresa-alvo. ' +
    'Devolva SOMENTE um objeto JSON válido (sem comentários, sem markdown) com as chaves exatas: ' +
    'companyName (string), arr (number, receita recorrente anual), mrr (number, mensal), growthRate (number, % ao ano), ' +
    'burn (number, queima de caixa mensal), teamSize (number), churn (number, %), summary (string curta). ' +
    'Use null quando a métrica NÃO estiver no documento — nunca invente números.'
  const user = `Documento:\n\n${docText.slice(0, 12000)}`
  const { text } = await runModel({ system, user, agent: merko, maxTokens: 700 })
  return parseJsonFromModel<ExtractedMetrics>(text) ?? {}
}

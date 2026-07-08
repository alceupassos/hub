import 'server-only'

// ─────────────────────────────────────────────────────────────────────────────
// Índice de confiança REAL (Fase A · integridade).
//
// Substitui o `Math.random()` que era persistido e exibido a profissionais de M&A
// como se fosse um "dado real" — uma falha de integridade grave. O sinal aqui é
// determinístico e reflete propriedades verificáveis da resposta:
//   • Ancoragem: a resposta foi construída sobre a base proprietária (grounding)?
//   • Citações: densidade de referências a fonte/data/autoridade.
//   • Completude: a resposta é substancial e termina de forma completa?
//   • Estrutura: usa parágrafos/tabelas/listas (entregável, não frase solta)?
//   • Cautela: penaliza afirmações absolutas sem lastro (garantido/100%/sempre).
//   • Verificador: se disponível, o score do fact-checker entra na média.
//   • Injeção: se houve tentativa de injeção, a confiança é limitada.
//
// Fonte única de verdade — usada por agent-query, agent-deep, chat e síntese, e
// persistida em execution_logs.confidence, para que Inspector, cards, Síntese e
// /relatorios sejam sempre coerentes entre si.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfidenceInput {
  /** Texto da resposta do agente. Vazio → fora de escopo → confiança 0. */
  response: string
  /** Tamanho (chars) do bloco de grounding proprietário injetado no prompt. 0 = sem base. */
  groundingChars?: number
  /** Score 0-100 do verificador (/api/verify-response), se já calculado. */
  verifierScore?: number
  /** Houve detecção de tentativa de injeção nesta consulta. */
  injectionDetected?: boolean
}

const ABSOLUTE_CLAIM = /\b(garantid[oa]|100\s*%|com\s+certeza|certamente|sempre|nunca falha|guaranteed|always|never fails|risk[- ]free)\b/gi
const CITATION_CUE = /\[\d+\]|\bfonte\b|\bsource\b|Damodaran|McKinsey|CVM|CADE|BACEN|—\s*\d{4}|\b\d{4}\)/gi

function count(re: RegExp, s: string): number {
  const m = s.match(re)
  return m ? m.length : 0
}

/**
 * Retorna um inteiro 0–97 (nunca 100 — humildade epistêmica é regra da casa).
 * 0 quando a resposta é vazia (fora de escopo).
 */
export function computeConfidence(input: ConfidenceInput): number {
  const text = (input.response ?? '').trim()
  if (!text) return 0

  let score = 48 // piso: uma resposta existe, mas ainda não provou ancoragem

  // Ancoragem na base proprietária (diferencial vs. LLM puro).
  const g = input.groundingChars ?? 0
  if (g > 0) score += 8
  if (g > 400) score += 6
  if (g > 1000) score += 4

  // Densidade de citações (fonte/data/autoridade).
  score += Math.min(14, count(CITATION_CUE, text) * 2)

  // Completude do entregável.
  if (text.length > 400) score += 6
  if (text.length > 900) score += 5
  if (/[.!?…]["')\]]?$/.test(text)) score += 3 // terminou uma frase (não truncou)

  // Estrutura de entregável (títulos, listas, tabelas).
  if (/(^|\n)\s*(#{1,3}\s|[-*•]\s|\|)/.test(text)) score += 4

  // Cautela: penaliza afirmações absolutas sem lastro.
  score -= Math.min(12, count(ABSOLUTE_CLAIM, text) * 4)

  // Verificador de alucinação, se disponível: média ponderada.
  if (typeof input.verifierScore === 'number') {
    score = Math.round(score * 0.6 + input.verifierScore * 0.4)
  }

  // Tentativa de injeção → teto de confiança.
  if (input.injectionDetected) score = Math.min(score, 42)

  return Math.max(0, Math.min(97, Math.round(score)))
}

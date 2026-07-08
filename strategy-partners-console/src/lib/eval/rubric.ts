// ─────────────────────────────────────────────────────────────────────────────
// Harness de avaliação (Fase G). Pontua a saída de um agente de forma determinística,
// sem depender de um segundo LLM: verifica se a resposta (a) ancora em números da base
// (cita fonte/data), (b) mostra a equação/metodologia, (c) evita afirmações absolutas
// sem lastro, e (d) — quando um valor numérico é esperado — bate com o motor dentro de
// uma tolerância. Puro e testável; usado pelo script de eval e por CI.
// ─────────────────────────────────────────────────────────────────────────────

export interface RubricInput {
  answer: string
  /** Valor numérico esperado (ex.: WACC 0.1248) quando a pergunta é quantitativa. */
  expectedValue?: number
  /** Valor que o motor determinístico produziu para a mesma pergunta. */
  engineValue?: number
  /** Tolerância relativa para a checagem numérica (default 1%). */
  tolerance?: number
}

export interface RubricScore {
  score: number // 0..100
  anchored: boolean
  showsMethod: boolean
  cautious: boolean
  numericMatch: boolean | null // null quando não aplicável
  notes: string[]
}

const CITATION = /\[\d+\]|\bfonte\b|\bsource\b|Damodaran|McKinsey|CVM|CADE|BACEN|\b\d{4}\b/i
const METHOD = /=|fórmula|formula|WACC|EV\/EBITDA|DCF|TIR|IRR|MOIC|múltiplo|multiple|premissa|assumption/i
const ABSOLUTE = /\b(garantid[oa]|100\s*%|com certeza|sempre|nunca falha|guaranteed|always)\b/i

export function scoreAnswer(input: RubricInput): RubricScore {
  const a = (input.answer ?? '').trim()
  const notes: string[] = []

  const anchored = CITATION.test(a)
  const showsMethod = METHOD.test(a)
  const cautious = !ABSOLUTE.test(a)

  let numericMatch: boolean | null = null
  if (input.expectedValue != null && input.engineValue != null) {
    const tol = input.tolerance ?? 0.01
    const denom = Math.abs(input.expectedValue) || 1
    numericMatch = Math.abs(input.engineValue - input.expectedValue) / denom <= tol
    if (!numericMatch) notes.push(`motor=${input.engineValue} vs esperado=${input.expectedValue}`)
  }

  let score = 0
  if (anchored) score += 30; else notes.push('sem citação de fonte')
  if (showsMethod) score += 30; else notes.push('sem equação/metodologia visível')
  if (cautious) score += 15; else notes.push('afirmação absoluta sem lastro')
  if (numericMatch === true) score += 25
  else if (numericMatch === null) score += 25 // não-numérica: não penaliza
  // numericMatch === false → 0 pontos nesse quesito

  return { score, anchored, showsMethod, cautious, numericMatch, notes }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sensibilidade — data tables 2D e tornado.
//
// Ferramentas genéricas que rodam sobre qualquer função de valuation do motor
// (DCF, LBO, accretion). Usadas para as tabelas de sensibilidade e o gráfico
// tornado do Workbench (Fase E).
// ─────────────────────────────────────────────────────────────────────────────

export interface DataTable2D {
  rowLabel: string
  colLabel: string
  rowValues: number[]
  colValues: number[]
  /** matrix[r][c] = fn(rowValues[r], colValues[c]). */
  matrix: number[][]
}

/** Tabela de sensibilidade 2D (ex.: EV vs WACC×g). */
export function dataTable2D(
  rowLabel: string, rowValues: number[],
  colLabel: string, colValues: number[],
  fn: (row: number, col: number) => number,
): DataTable2D {
  const matrix = rowValues.map(r => colValues.map(c => fn(r, c)))
  return { rowLabel, colLabel, rowValues, colValues, matrix }
}

export interface TornadoFactor {
  name: string
  low: number    // resultado com o fator no cenário baixo
  high: number   // resultado com o fator no cenário alto
  swing: number  // |high − low|
}

export interface TornadoResult {
  base: number
  factors: TornadoFactor[] // ordenados por swing desc
}

export interface TornadoSpec {
  name: string
  /** roda o modelo com este fator no extremo baixo. */
  low: () => number
  /** roda o modelo com este fator no extremo alto. */
  high: () => number
}

/** Análise tornado: ranqueia fatores pelo impacto (swing) sobre o resultado. */
export function tornado(base: number, specs: TornadoSpec[]): TornadoResult {
  const factors = specs.map(s => {
    const low = s.low()
    const high = s.high()
    return { name: s.name, low, high, swing: Math.abs(high - low) }
  })
  factors.sort((a, b) => b.swing - a.swing)
  return { base, factors }
}

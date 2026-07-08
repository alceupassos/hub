import { describe, it, expect } from 'vitest'
import { buildIcMemoDocx, buildPitchDeckPptx, buildModelXlsx, type DeliverableData } from './index'

const data: DeliverableData = {
  dealName: 'Projeto Atlas', date: '2026-07-08',
  synthesis: 'Recomendação: entrada faseada. Valuation triangulado 900–1000–1100.',
  recommendation: 'go',
  footballField: [ { method: 'DCF', low: 900, base: 1000, high: 1100 }, { method: 'Comps', low: 850, base: 980, high: 1150 } ],
  lbo: { entryEV: 1000, sponsorEquity: 500, exitEV: 1400, moic: 2.4, irr: 0.24 },
  dcf: { enterpriseValue: 1000, equityValue: 700, wacc: 0.145 },
  redFlags: [ { category: 'trabalhista', description: 'Contingência ~R$4M', severity: 'alta' } ],
  assumptions: [ { label: 'WACC', value: '14,5%', source: 'Damodaran 2026' } ],
  nextSteps: [ { action: 'Confirmar QoE', owner: 'Diligence', timeline: '15 dias' } ],
}

describe('deliverables smoke', () => {
  it('docx gera buffer', async () => { const b = await buildIcMemoDocx(data); expect(b.length).toBeGreaterThan(1000) })
  it('pptx gera buffer', async () => { const b = await buildPitchDeckPptx(data); expect(b.length).toBeGreaterThan(1000) })
  it('xlsx gera buffer', async () => { const b = await buildModelXlsx(data); expect(b.length).toBeGreaterThan(1000) })
})

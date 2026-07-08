import 'server-only'
// ─────────────────────────────────────────────────────────────────────────────
// Financial model — .xlsx builder.
//
// exceljs is consumed via a default import (`import ExcelJS from 'exceljs'`),
// which esModuleInterop resolves to the module namespace so `ExcelJS.Workbook`
// works at runtime and in types. Worksheet/row/cell types are captured through
// `ReturnType<typeof wb.addWorksheet>` to stay independent of how the default
// binding exposes named types. Navy header fills, every sheet optional.
// ─────────────────────────────────────────────────────────────────────────────
import ExcelJS from 'exceljs'
import { BRAND_LIGHT_ARGB, BRAND_NAME, BRAND_NAVY_ARGB, type DeliverableData } from './types'

const WHITE_ARGB = 'FFFFFFFF'

export async function buildModelXlsx(d: DeliverableData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = BRAND_NAME
  wb.company = BRAND_NAME
  wb.created = new Date()

  type Sheet = ReturnType<typeof wb.addWorksheet>

  const styleHeader = (sheet: Sheet, rowNumber: number): void => {
    const row = sheet.getRow(rowNumber)
    row.eachCell((cell) => {
      cell.fill = { fgColor: { argb: BRAND_NAVY_ARGB }, pattern: 'solid', type: 'pattern' }
      cell.font = { bold: true, color: { argb: WHITE_ARGB } }
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
    })
    row.height = 20
  }

  const zebra = (sheet: Sheet, firstDataRow: number, lastRow: number): void => {
    for (let r = firstDataRow; r <= lastRow; r += 1) {
      if ((r - firstDataRow) % 2 === 1) {
        sheet.getRow(r).eachCell((cell) => {
          cell.fill = { fgColor: { argb: BRAND_LIGHT_ARGB }, pattern: 'solid', type: 'pattern' }
        })
      }
    }
  }

  // ── Resumo ──
  const resumo = wb.addWorksheet('Resumo')
  resumo.columns = [
    { header: 'Campo', key: 'field', width: 28 },
    { header: 'Valor', key: 'value', width: 70 },
  ]
  resumo.addRow({ field: 'Deal', value: d.dealName })
  resumo.addRow({ field: 'Data', value: d.date })
  if (d.synthesis) resumo.addRow({ field: 'Síntese', value: d.synthesis })
  if (d.recommendation) resumo.addRow({ field: 'Recomendação', value: d.recommendation })
  styleHeader(resumo, 1)
  resumo.getColumn('value').alignment = { vertical: 'top', wrapText: true }

  // ── Valuation (football field) ──
  if (d.footballField?.length) {
    const ws = wb.addWorksheet('Valuation')
    ws.columns = [
      { header: 'Método', key: 'method', width: 32 },
      { header: 'Low', key: 'low', width: 18 },
      { header: 'Base', key: 'base', width: 18 },
      { header: 'High', key: 'high', width: 18 },
    ]
    d.footballField.forEach((b) => ws.addRow({ base: b.base, high: b.high, low: b.low, method: b.method }))
    ;['low', 'base', 'high'].forEach((k) => {
      ws.getColumn(k).numFmt = '#,##0.0'
    })
    styleHeader(ws, 1)
    zebra(ws, 2, ws.rowCount)
  }

  // ── Modelo (LBO / DCF) ──
  if (d.lbo || d.dcf) {
    const ws = wb.addWorksheet('Modelo')
    ws.columns = [
      { header: 'Métrica', key: 'metric', width: 32 },
      { header: 'Valor', key: 'value', width: 22 },
      { header: 'Formato', key: 'fmt', width: 14 },
    ]
    const pushRow = (metric: string, value: number | null, fmt: 'money' | 'pct' | 'x'): void => {
      const row = ws.addRow({ fmt, metric, value })
      const cell = row.getCell('value')
      if (value == null || !Number.isFinite(value)) {
        cell.value = '—'
      } else if (fmt === 'pct') {
        cell.numFmt = '0.0%'
      } else if (fmt === 'x') {
        cell.numFmt = '0.00"x"'
      } else {
        cell.numFmt = '#,##0'
      }
    }
    if (d.lbo) {
      pushRow('LBO — Entry EV', d.lbo.entryEV, 'money')
      pushRow('LBO — Sponsor Equity', d.lbo.sponsorEquity, 'money')
      pushRow('LBO — Exit EV', d.lbo.exitEV, 'money')
      pushRow('LBO — MOIC', d.lbo.moic, 'x')
      pushRow('LBO — IRR', d.lbo.irr, 'pct')
    }
    if (d.dcf) {
      pushRow('DCF — Enterprise Value', d.dcf.enterpriseValue, 'money')
      pushRow('DCF — Equity Value', d.dcf.equityValue, 'money')
      pushRow('DCF — WACC', d.dcf.wacc, 'pct')
    }
    styleHeader(ws, 1)
    zebra(ws, 2, ws.rowCount)
  }

  // ── Premissas ──
  if (d.assumptions?.length) {
    const ws = wb.addWorksheet('Premissas')
    ws.columns = [
      { header: 'Premissa', key: 'label', width: 34 },
      { header: 'Valor', key: 'value', width: 24 },
      { header: 'Fonte', key: 'source', width: 40 },
    ]
    d.assumptions.forEach((a) => ws.addRow({ label: a.label, source: a.source ?? '—', value: a.value }))
    styleHeader(ws, 1)
    zebra(ws, 2, ws.rowCount)
  }

  // ── Red Flags ──
  if (d.redFlags?.length) {
    const ws = wb.addWorksheet('Red Flags')
    ws.columns = [
      { header: 'Categoria', key: 'category', width: 26 },
      { header: 'Severidade', key: 'severity', width: 16 },
      { header: 'Descrição', key: 'description', width: 60 },
    ]
    d.redFlags.forEach((r) => ws.addRow({ category: r.category, description: r.description, severity: r.severity }))
    ws.getColumn('description').alignment = { vertical: 'top', wrapText: true }
    styleHeader(ws, 1)
    zebra(ws, 2, ws.rowCount)
  }

  return Buffer.from(await wb.xlsx.writeBuffer())
}

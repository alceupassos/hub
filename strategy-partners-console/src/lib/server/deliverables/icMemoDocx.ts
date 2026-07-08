import 'server-only'
// ─────────────────────────────────────────────────────────────────────────────
// Investment Committee Memorandum — .docx builder.
//
// docx v9 exposes named ESM exports; no default-import interop needed here.
// Every section is rendered only when the corresponding data is present, so a
// sparse DeliverableData still yields a valid, well-formed document.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { BRAND_GREEN, BRAND_LIGHT, BRAND_NAME, BRAND_NAVY, type DeliverableData } from './types'

const fmtNum = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const fmtMoney = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : `R$ ${fmtNum(v)}`

const fmtPct = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : `${(Number(v) * 100).toFixed(1)}%`

const fmtMoic = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : `${Number(v).toFixed(2)}x`

const PCT_WIDTH = { size: 100, type: WidthType.PERCENTAGE } as const

/** A plain body cell. */
function cell(text: string, opts?: { bold?: boolean; color?: string; fill?: string }): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ bold: opts?.bold ?? false, color: opts?.color, text })],
      }),
    ],
    shading: opts?.fill ? { fill: opts.fill } : undefined,
  })
}

/** A navy header cell with white bold text. */
function headerCell(text: string): TableCell {
  return cell(text, { bold: true, color: 'FFFFFF', fill: BRAND_NAVY })
}

function table(headers: string[], rows: string[][]): Table {
  return new Table({
    rows: [
      new TableRow({ children: headers.map(headerCell), tableHeader: true }),
      ...rows.map(
        (r, i) =>
          new TableRow({
            children: r.map((c) => cell(c, { fill: i % 2 === 1 ? BRAND_LIGHT : undefined })),
          }),
      ),
    ],
    width: PCT_WIDTH,
  })
}

const heading = (text: string): Paragraph =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 120, before: 240 }, text })

const body = (text: string): Paragraph => new Paragraph({ children: [new TextRun(text)], spacing: { after: 120 } })

export async function buildIcMemoDocx(d: DeliverableData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = []

  // ── Branded title ──
  children.push(
    new Paragraph({
      children: [new TextRun({ bold: true, color: BRAND_GREEN, size: 28, text: BRAND_NAME.toUpperCase() })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ bold: true, color: BRAND_NAVY, size: 40, text: 'Investment Committee Memorandum' })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ bold: true, color: BRAND_NAVY, size: 30, text: d.dealName })],
      spacing: { after: 20 },
    }),
    new Paragraph({ children: [new TextRun({ color: '666666', italics: true, text: d.date })], spacing: { after: 200 } }),
  )

  // ── Executive Summary ──
  if (d.synthesis || d.recommendation) {
    children.push(heading('Executive Summary'))
    if (d.synthesis) children.push(body(d.synthesis))
    if (d.recommendation) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ bold: true, color: BRAND_NAVY, text: 'Recommendation: ' }),
            new TextRun(d.recommendation),
          ],
          spacing: { after: 120 },
        }),
      )
    }
  }

  // ── Valuation (football field) ──
  if (d.footballField?.length) {
    children.push(heading('Valuation — Football Field'))
    children.push(
      table(
        ['Method', 'Low', 'Base', 'High'],
        d.footballField.map((b) => [b.method, fmtMoney(b.low), fmtMoney(b.base), fmtMoney(b.high)]),
      ),
    )
  }

  // ── Financial Model (LBO + DCF) ──
  if (d.lbo || d.dcf) {
    children.push(heading('Financial Model'))
    const rows: string[][] = []
    if (d.lbo) {
      rows.push(
        ['LBO — Entry EV', fmtMoney(d.lbo.entryEV)],
        ['LBO — Sponsor Equity', fmtMoney(d.lbo.sponsorEquity)],
        ['LBO — Exit EV', fmtMoney(d.lbo.exitEV)],
        ['LBO — MOIC', fmtMoic(d.lbo.moic)],
        ['LBO — IRR', fmtPct(d.lbo.irr)],
      )
    }
    if (d.dcf) {
      rows.push(
        ['DCF — Enterprise Value', fmtMoney(d.dcf.enterpriseValue)],
        ['DCF — Equity Value', fmtMoney(d.dcf.equityValue)],
        ['DCF — WACC', fmtPct(d.dcf.wacc)],
      )
    }
    children.push(table(['Metric', 'Value'], rows))
  }

  // ── Risk Matrix (red flags) ──
  if (d.redFlags?.length) {
    children.push(heading('Risk Matrix'))
    children.push(
      table(
        ['Category', 'Severity', 'Description'],
        d.redFlags.map((r) => [r.category, r.severity, r.description]),
      ),
    )
  }

  // ── Key Assumptions ──
  if (d.assumptions?.length) {
    children.push(heading('Key Assumptions'))
    children.push(
      table(
        ['Assumption', 'Value', 'Source'],
        d.assumptions.map((a) => [a.label, a.value, a.source ?? '—']),
      ),
    )
  }

  // ── Next Steps (numbered) ──
  if (d.nextSteps?.length) {
    children.push(heading('Next Steps'))
    d.nextSteps.forEach((s, i) => {
      const meta = [s.owner ? `owner: ${s.owner}` : null, s.timeline ? `timeline: ${s.timeline}` : null]
        .filter(Boolean)
        .join(' · ')
      children.push(
        new Paragraph({
          children: [
            new TextRun({ bold: true, color: BRAND_NAVY, text: `${i + 1}. ` }),
            new TextRun(s.action),
            ...(meta ? [new TextRun({ color: '666666', italics: true, text: `  (${meta})` })] : []),
          ],
          spacing: { after: 80 },
        }),
      )
    })
  }

  if (children.length === 0) children.push(body('Sem dados disponíveis para este documento.'))

  const doc = new Document({ sections: [{ children }] })
  return await Packer.toBuffer(doc)
}

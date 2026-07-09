import 'server-only'
// ─────────────────────────────────────────────────────────────────────────────
// Term Sheet / Letter of Intent (Carta de Intenções) — .docx builder.
//
// A branded, professional, NON-BINDING term sheet generated from a negotiated
// package. Mirrors the structure/branding of icMemoDocx.ts (Strategy Partners,
// navy #0B3A78). Every section renders only when its data is present, so a
// sparse TermSheetData still yields a valid, well-formed document.
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
import { BRAND_GREEN, BRAND_LIGHT, BRAND_NAME, BRAND_NAVY } from './types'

export interface TermSheetData {
  dealName: string
  date: string
  buyerName?: string
  sellerName?: string
  price?: number
  structure?: { label: string; value: string }[]
  issues?: { label: string; settledValue: string }[]
  conditions?: string[]
  nextSteps?: string[]
}

const fmtNum = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const fmtMoney = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : `R$ ${fmtNum(v)}`

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

// Standard non-binding / exclusivity / confidentiality boilerplate (pt-BR).
const BOILERPLATE: string[] = [
  'Natureza não vinculante — Este documento tem caráter exclusivamente indicativo e reflete o entendimento preliminar das Partes acerca dos termos de uma potencial transação. Nenhuma de suas disposições cria obrigação de contratar, e a operação somente será vinculante mediante a celebração de contratos definitivos (Contrato de Compra e Venda e documentos acessórios), sujeitos à aprovação dos respectivos órgãos de governança.',
  'Exclusividade — A partir da assinatura desta Carta de Intenções e pelo prazo a ser acordado entre as Partes, o Vendedor compromete-se a negociar exclusivamente com o Comprador, abstendo-se de solicitar, estimular ou aceitar propostas concorrentes de terceiros para a mesma operação.',
  'Confidencialidade — As Partes tratarão como confidenciais os termos aqui descritos, bem como toda informação trocada durante as negociações e a diligência (due diligence), utilizando-a apenas para os fins desta potencial transação e não a divulgando a terceiros sem prévia autorização por escrito, ressalvadas as exigências legais e regulatórias.',
  'Despesas — Salvo disposição em contrário nos contratos definitivos, cada Parte arcará com seus próprios custos e despesas (incluindo assessores financeiros, jurídicos e contábeis) incorridos no âmbito desta operação.',
  'Lei aplicável — Este documento e as negociações dele decorrentes reger-se-ão pelas leis da República Federativa do Brasil.',
]

export async function buildTermSheetDocx(d: TermSheetData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = []

  // ── Branded title ──
  children.push(
    new Paragraph({
      children: [new TextRun({ bold: true, color: BRAND_GREEN, size: 28, text: BRAND_NAME.toUpperCase() })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ bold: true, color: BRAND_NAVY, size: 40, text: 'Term Sheet / Carta de Intenções' }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ bold: true, color: BRAND_GREEN, size: 24, text: 'DOCUMENTO NÃO VINCULANTE' })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ bold: true, color: BRAND_NAVY, size: 30, text: d.dealName })],
      spacing: { after: 20 },
    }),
    new Paragraph({
      children: [new TextRun({ color: '666666', italics: true, text: d.date })],
      spacing: { after: 200 },
    }),
  )

  // ── Parties ──
  if (d.buyerName || d.sellerName) {
    children.push(heading('Partes'))
    children.push(
      table(
        ['Parte', 'Identificação'],
        [
          ['Comprador', d.buyerName ?? '—'],
          ['Vendedor', d.sellerName ?? '—'],
        ],
      ),
    )
  }

  // ── Proposed price ──
  if (d.price != null && Number.isFinite(d.price)) {
    children.push(heading('Preço Proposto'))
    children.push(
      new Paragraph({
        children: [
          new TextRun({ bold: true, color: BRAND_NAVY, text: 'Valor da operação (enterprise value): ' }),
          new TextRun({ bold: true, text: fmtMoney(d.price) }),
        ],
        spacing: { after: 120 },
      }),
    )
  }

  // ── Deal structure (from structure and/or issues) ──
  const structureRows: string[][] = [
    ...(d.structure ?? []).map((s) => [s.label, s.value]),
    ...(d.issues ?? []).map((i) => [i.label, i.settledValue]),
  ]
  if (structureRows.length) {
    children.push(heading('Estrutura da Operação'))
    children.push(table(['Item', 'Termo Acordado'], structureRows))
  }

  // ── Conditions precedent ──
  if (d.conditions?.length) {
    children.push(heading('Condições Precedentes'))
    d.conditions.forEach((c, i) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ bold: true, color: BRAND_NAVY, text: `${i + 1}. ` }), new TextRun(c)],
          spacing: { after: 80 },
        }),
      )
    })
  }

  // ── Exclusivity / confidentiality boilerplate ──
  children.push(heading('Disposições Gerais'))
  BOILERPLATE.forEach((clause) => {
    const [head, ...rest] = clause.split(' — ')
    if (rest.length) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ bold: true, color: BRAND_NAVY, text: `${head} — ` }),
            new TextRun(rest.join(' — ')),
          ],
          spacing: { after: 120 },
        }),
      )
    } else {
      children.push(body(clause))
    }
  })

  // ── Next steps (numbered) ──
  if (d.nextSteps?.length) {
    children.push(heading('Próximos Passos'))
    d.nextSteps.forEach((s, i) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ bold: true, color: BRAND_NAVY, text: `${i + 1}. ` }), new TextRun(s)],
          spacing: { after: 80 },
        }),
      )
    })
  }

  // ── Signature blocks ──
  children.push(heading('Assinaturas'))
  children.push(
    new Paragraph({
      children: [new TextRun('_______________________________________')],
      spacing: { after: 40, before: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ bold: true, text: d.buyerName ?? 'Comprador' })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun('_______________________________________')],
      spacing: { after: 40, before: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ bold: true, text: d.sellerName ?? 'Vendedor' })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          color: '666666',
          italics: true,
          text: `${BRAND_NAME} — assessoria da operação. Este Term Sheet não constitui oferta vinculante.`,
        }),
      ],
      spacing: { before: 120 },
    }),
  )

  const doc = new Document({ sections: [{ children }] })
  return await Packer.toBuffer(doc)
}

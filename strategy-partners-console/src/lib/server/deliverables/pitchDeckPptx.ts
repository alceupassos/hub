import 'server-only'
// ─────────────────────────────────────────────────────────────────────────────
// Pitch deck — .pptx builder.
//
// pptxgenjs ships as a default export (CommonJS + ESM); `import pptxgen from
// 'pptxgenjs'` resolves the class via esModuleInterop. Chart types are passed as
// CHART_NAME string literals (e.g. 'bar') rather than the ChartType enum, since
// the enum member is not assignable to the string-literal union the API expects.
// Navy master background, green accents. Sparse decks skip empty slides.
// ─────────────────────────────────────────────────────────────────────────────
import pptxgen from 'pptxgenjs'
import { BRAND_GREEN, BRAND_LIGHT, BRAND_NAME, BRAND_NAVY, type DeliverableData } from './types'

const WHITE = 'FFFFFF'
const MUTED = 'C9D4E5'

const fmtNum = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const fmtMoney = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : `R$ ${fmtNum(v)}`
const fmtPct = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : `${(Number(v) * 100).toFixed(1)}%`
const fmtMoic = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '—' : `${Number(v).toFixed(2)}x`

export async function buildPitchDeckPptx(d: DeliverableData): Promise<Buffer> {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = BRAND_NAME
  pptx.company = BRAND_NAME

  // Navy master used for every content slide.
  pptx.defineSlideMaster({
    background: { color: BRAND_NAVY },
    objects: [{ rect: { x: 0, y: 0, h: 0.12, w: '100%', fill: { color: BRAND_GREEN } } }],
    title: 'NAVY',
  })

  type Slide = ReturnType<typeof pptx.addSlide>
  const contentHeading = (slide: Slide, text: string): void => {
    slide.addText(text, { bold: true, color: WHITE, fontSize: 28, h: 0.9, w: 12.3, x: 0.5, y: 0.4 })
  }

  // ── Title slide ──
  const title = pptx.addSlide({ masterName: 'NAVY' })
  title.addText(BRAND_NAME.toUpperCase(), { color: BRAND_GREEN, fontSize: 20, h: 0.5, w: 12.3, x: 0.5, y: 1.8 })
  title.addText('Investment Committee — Pitch Deck', {
    bold: true,
    color: WHITE,
    fontSize: 40,
    h: 1.2,
    w: 12.3,
    x: 0.5,
    y: 2.4,
  })
  title.addText(d.dealName, { bold: true, color: WHITE, fontSize: 28, h: 0.8, w: 12.3, x: 0.5, y: 3.7 })
  title.addText(d.date, { color: MUTED, fontSize: 16, italic: true, h: 0.5, w: 12.3, x: 0.5, y: 4.6 })

  // ── Executive summary / recommendation ──
  if (d.synthesis || d.recommendation) {
    const s = pptx.addSlide({ masterName: 'NAVY' })
    contentHeading(s, 'Executive Summary')
    let y = 1.6
    if (d.synthesis) {
      s.addText(d.synthesis, { color: MUTED, fontSize: 16, h: 3, valign: 'top', w: 12.3, x: 0.5, y })
      y = 4.8
    }
    if (d.recommendation) {
      s.addText(
        [
          { text: 'Recommendation: ', options: { bold: true, color: BRAND_GREEN } },
          { text: d.recommendation, options: { color: WHITE } },
        ],
        { fontSize: 18, h: 1, valign: 'top', w: 12.3, x: 0.5, y },
      )
    }
  }

  // ── Valuation: native bar chart of football-field base, or table fallback ──
  if (d.footballField?.length) {
    const s = pptx.addSlide({ masterName: 'NAVY' })
    contentHeading(s, 'Valuation — Football Field')
    const labels = d.footballField.map((b) => b.method)
    const bases = d.footballField.map((b) => (Number.isFinite(b.base) ? b.base : 0))
    const hasChartData = bases.some((v) => v > 0)
    if (hasChartData) {
      // 'bar' is the CHART_NAME literal (identical to pptx.ChartType.bar's runtime value)
      // but assignable to the string-literal union the API expects.
      s.addChart(
        'bar',
        [{ labels, name: 'Base (R$)', values: bases }],
        {
          barDir: 'bar',
          chartColors: [BRAND_GREEN],
          h: 5,
          showValue: true,
          w: 12.3,
          x: 0.5,
          y: 1.6,
        },
      )
    } else {
      s.addTable(
        [
          ['Method', 'Low', 'Base', 'High'].map((t) => tableHeaderCell(t)),
          ...d.footballField.map((b) => [
            bodyCell(b.method),
            bodyCell(fmtMoney(b.low)),
            bodyCell(fmtMoney(b.base)),
            bodyCell(fmtMoney(b.high)),
          ]),
        ],
        { border: { color: BRAND_LIGHT, pt: 1 }, colW: [4.8, 2.5, 2.5, 2.5], h: 4.5, w: 12.3, x: 0.5, y: 1.6 },
      )
    }
  }

  // ── KPIs: MOIC / IRR / EV big text ──
  const kpis: { label: string; value: string }[] = []
  if (d.lbo) {
    kpis.push({ label: 'MOIC', value: fmtMoic(d.lbo.moic) }, { label: 'IRR', value: fmtPct(d.lbo.irr) })
  }
  if (d.dcf) kpis.push({ label: 'Enterprise Value (DCF)', value: fmtMoney(d.dcf.enterpriseValue) })
  else if (d.lbo) kpis.push({ label: 'Entry EV (LBO)', value: fmtMoney(d.lbo.entryEV) })
  if (kpis.length) {
    const s = pptx.addSlide({ masterName: 'NAVY' })
    contentHeading(s, 'Key Metrics')
    const cardW = 12.3 / kpis.length
    kpis.forEach((k, i) => {
      const x = 0.5 + i * cardW
      s.addText(k.value, { align: 'center', bold: true, color: BRAND_GREEN, fontSize: 44, h: 1.4, w: cardW - 0.2, x, y: 2.6 })
      s.addText(k.label.toUpperCase(), { align: 'center', color: MUTED, fontSize: 16, h: 0.6, w: cardW - 0.2, x, y: 4 })
    })
  }

  // ── Risk matrix table ──
  if (d.redFlags?.length) {
    const s = pptx.addSlide({ masterName: 'NAVY' })
    contentHeading(s, 'Risk Matrix')
    s.addTable(
      [
        ['Category', 'Severity', 'Description'].map((t) => tableHeaderCell(t)),
        ...d.redFlags.map((r) => [bodyCell(r.category), bodyCell(r.severity), bodyCell(r.description)]),
      ],
      { autoPage: true, border: { color: BRAND_LIGHT, pt: 1 }, colW: [3, 2, 7.3], w: 12.3, x: 0.5, y: 1.6 },
    )
  }

  // ── Next steps ──
  if (d.nextSteps?.length) {
    const s = pptx.addSlide({ masterName: 'NAVY' })
    contentHeading(s, 'Next Steps')
    s.addText(
      d.nextSteps.map((n, i) => {
        const meta = [n.owner ? `owner: ${n.owner}` : null, n.timeline ? `timeline: ${n.timeline}` : null]
          .filter(Boolean)
          .join(' · ')
        return {
          text: `${i + 1}. ${n.action}${meta ? `  (${meta})` : ''}`,
          options: { bullet: false, color: WHITE, paraSpaceAfter: 10 },
        }
      }),
      { fontSize: 16, h: 5, valign: 'top', w: 12.3, x: 0.5, y: 1.6 },
    )
  }

  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
}

// Return type is inferred; it is structurally a pptxgenjs TableCell ({ text, options }),
// which keeps the builder independent of how the default import surfaces named types.
function tableHeaderCell(text: string) {
  return { options: { bold: true, color: 'FFFFFF', fill: { color: BRAND_NAVY }, fontSize: 12 }, text }
}

function bodyCell(text: string) {
  return { options: { color: '222222', fill: { color: 'FFFFFF' }, fontSize: 11 }, text }
}

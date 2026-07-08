// ─────────────────────────────────────────────────────────────────────────────
// Deliverables — shared data contract.
//
// A single, source-agnostic shape consumed by every document builder
// (IC memo .docx, pitch deck .pptx, financial model .xlsx). Every section is
// optional so that a partially-filled deal still produces a valid document —
// builders skip whatever is absent.
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliverableData {
  dealName: string
  date: string
  synthesis?: string
  recommendation?: string
  footballField?: { method: string; low: number; base: number; high: number }[]
  lbo?: { entryEV: number; sponsorEquity: number; exitEV: number; moic: number; irr: number | null }
  dcf?: { enterpriseValue: number; equityValue: number | null; wacc: number }
  redFlags?: { category: string; description: string; severity: string }[]
  assumptions?: { label: string; value: string; source?: string }[]
  nextSteps?: { action: string; owner?: string; timeline?: string }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand tokens — Strategy Partners.
// docx / pptxgenjs want hex WITHOUT the leading '#'; exceljs wants 8-digit ARGB.
// ─────────────────────────────────────────────────────────────────────────────

/** Navy — primary brand color (#0B3A78). Hex without '#'. */
export const BRAND_NAVY = '0B3A78'
/** Green — accent brand color (#1F9D6B). Hex without '#'. */
export const BRAND_GREEN = '1F9D6B'
/** Neutral light fill for zebra rows / labels. */
export const BRAND_LIGHT = 'F2F5FA'
/** ARGB (alpha-first) variants for exceljs cell fills. */
export const BRAND_NAVY_ARGB = `FF${BRAND_NAVY}`
export const BRAND_GREEN_ARGB = `FF${BRAND_GREEN}`
export const BRAND_LIGHT_ARGB = `FF${BRAND_LIGHT}`

export const BRAND_NAME = 'Strategy Partners'

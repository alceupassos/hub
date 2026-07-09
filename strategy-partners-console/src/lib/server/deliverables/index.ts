// ─────────────────────────────────────────────────────────────────────────────
// Deliverables — server-side document builders (IC memo, pitch deck, model).
// Barrel re-export. Each builder module is `import 'server-only'`.
// ─────────────────────────────────────────────────────────────────────────────
export {
  BRAND_GREEN,
  BRAND_GREEN_ARGB,
  BRAND_LIGHT,
  BRAND_LIGHT_ARGB,
  BRAND_NAME,
  BRAND_NAVY,
  BRAND_NAVY_ARGB,
  type DeliverableData,
} from './types'
export { buildIcMemoDocx } from './icMemoDocx'
export { buildPitchDeckPptx } from './pitchDeckPptx'
export { buildModelXlsx } from './modelXlsx'
export { buildTermSheetDocx, type TermSheetData } from './termSheetDocx'

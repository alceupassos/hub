import 'server-only'
import {
  dcf, wacc, costOfEquityCAPM,
  lbo, accretionDilution, impliedValuation,
  ppa, agioTaxBenefit, compareAssetVsStock,
  type DcfInput, type LboInput, type AccretionInput,
  type CapmInput, type WaccInput, type PpaInput, type AgioInput, type AssetVsStockInput,
} from '@/lib/finance'
import type { EngineInputs } from '@/lib/server/grounding'

// ─────────────────────────────────────────────────────────────────────────────
// Camada de tool-calling do MOTOR (Fase D).
//
// Garante que todo número de modelagem exibido é DETERMINÍSTICO — o LLM nunca faz
// aritmética. Protocolo agnóstico de provedor ("compute request"):
//   1) Quando há intenção de modelagem, injetamos FINANCE_TOOL_SPEC no system prompt.
//   2) O agente emite um ou mais blocos ```compute { ... }``` com a função e os inputs.
//   3) A rota extrai os blocos (parseComputeRequests), roda o motor (runComputeRequest)
//      e injeta o resultado EXATO (com equação + tabela) de volta na resposta.
//
// Tudo aqui é puro/testável sem LLM (ver __tests__/finance-tools.test.ts).
// ─────────────────────────────────────────────────────────────────────────────

export type ComputeKind =
  | 'wacc' | 'capm' | 'dcf' | 'lbo' | 'accretion' | 'comps' | 'ppa' | 'agio' | 'asset_vs_stock'

export interface ComputeRequest {
  kind: ComputeKind
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>
  label?: string
}

export interface ComputeOutput {
  kind: ComputeKind
  label: string
  ok: boolean
  error?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any
  markdown: string
}

/** Spec injetada no system prompt quando há intenção de modelagem. */
export const FINANCE_TOOL_SPEC = `## MOTOR DE CÁLCULO DETERMINÍSTICO (obrigatório para números)
Você NUNCA calcula de cabeça. Para qualquer valuation/estrutura, emita um bloco de cálculo e o motor
Angra devolve o número exato. Formato (pode emitir vários):

\`\`\`compute
{ "kind": "<wacc|capm|dcf|lbo|accretion|comps|ppa|agio|asset_vs_stock>", "label": "curto", "params": { ... } }
\`\`\`

Parâmetros por kind (use decimais para taxas: 0.14 = 14%):
- capm: { riskFree, beta, equityRiskPremium, countryRiskPremium?, sizePremium? }
- wacc: { costOfEquity, costOfDebt, taxRate, equityValue, debtValue }
- dcf: { fcff:[...], discountRate, terminalGrowth? | (exitMultiple & terminalMetric), netDebt?, sharesOutstanding? }
- lbo: { entryEbitda, entryMultiple, exitMultiple, holdYears, ebitdaGrowth?, taxRate, tranches:[{name,turns|amount,rate,mandatoryAmortPct?,pik?}] }
- accretion: { acquirerNetIncome, acquirerShares, acquirerSharePrice, targetNetIncome, offerValue, cashPct, cashFinancingRate, taxRate, preTaxSynergies? }
- comps: { metricName, metricValue, peerMultiples:[...] }
- ppa: { purchaseConsideration, bookNetAssets, tangibleStepUp?, tangibleStepUpLifeYears?, intangibles:[{name,fairValue,usefulLifeYears}], deferredTaxRate? }
- agio: { agio, taxRate, amortizationYears?, discountRate }
- asset_vs_stock: { purchasePrice, stepUpBase, taxRate, amortizationYears, discountRate }

Prefira as premissas da BASE PROPRIETÁRIA quando o usuário não fornecer um input. Depois do cálculo,
explique o resultado em linguagem executiva e cite a fonte/data das premissas.`

const FENCE_RE = /```compute\s*([\s\S]*?)```/gi

/** Extrai os blocos ```compute {json}``` da resposta do agente. */
export function parseComputeRequests(text: string): ComputeRequest[] {
  const out: ComputeRequest[] = []
  let m: RegExpExecArray | null
  FENCE_RE.lastIndex = 0
  while ((m = FENCE_RE.exec(text)) !== null) {
    const body = m[1].trim()
    try {
      const parsed = JSON.parse(body) as ComputeRequest | ComputeRequest[]
      if (Array.isArray(parsed)) out.push(...parsed)
      else out.push(parsed)
    } catch {
      // bloco malformado — ignora silenciosamente (o agente ainda tem sua prosa)
    }
  }
  return out
}

const fmtN = (n: number, d = 2) =>
  Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'
const fmtPct = (n: number | null | undefined, d = 2) =>
  n == null || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(d)}%`

/** Fornece defaults calibrados (da base K2) para inputs ausentes de LBO/DCF. */
function withEngineDefaults(req: ComputeRequest, inputs: EngineInputs | null): ComputeRequest {
  if (!inputs) return req
  const p = { ...req.params }
  if (req.kind === 'lbo') {
    if (p.taxRate == null) p.taxRate = inputs.taxRate
    if (p.entryMultiple == null && inputs.entryMultiple) p.entryMultiple = (inputs.entryMultiple.low + inputs.entryMultiple.high) / 2
    if (p.exitMultiple == null && inputs.exitMultiple) p.exitMultiple = (inputs.exitMultiple.low + inputs.exitMultiple.high) / 2
    if (p.holdYears == null && inputs.holdYears) p.holdYears = inputs.holdYears
    if ((!p.tranches || !p.tranches.length) && inputs.seniorTurns) {
      p.tranches = [
        { name: 'Sênior', turns: inputs.seniorTurns, rate: inputs.seniorRate ?? 0.14 },
        ...(inputs.mezzTurns ? [{ name: 'Mezanino', turns: inputs.mezzTurns, rate: inputs.mezzRate ?? 0.18 }] : []),
      ]
    }
  }
  if (req.kind === 'capm') {
    if (p.riskFree == null) p.riskFree = inputs.riskFree
    if (p.equityRiskPremium == null) p.equityRiskPremium = inputs.erpMature
    if (p.countryRiskPremium == null) p.countryRiskPremium = inputs.countryRiskPremium
    if (p.sizePremium == null) p.sizePremium = inputs.sizePremium
  }
  if (req.kind === 'agio' || req.kind === 'asset_vs_stock') {
    if (p.taxRate == null) p.taxRate = inputs.taxRate
    if (p.amortizationYears == null) p.amortizationYears = inputs.agioAmortYears
  }
  return { ...req, params: p }
}

/** Roda um compute request no motor e devolve resultado exato + markdown executivo. */
export function runComputeRequest(req: ComputeRequest, inputs: EngineInputs | null = null): ComputeOutput {
  const label = req.label ?? req.kind.toUpperCase()
  const r = withEngineDefaults(req, inputs)
  const p = r.params ?? {}
  try {
    switch (r.kind) {
      case 'capm': {
        const ke = costOfEquityCAPM(p as CapmInput)
        return ok('capm', label, { costOfEquity: ke }, `**${label} — Custo de capital próprio (CAPM)**\nKe = Rf + β·ERP + CRP + size = **${fmtPct(ke)}**`)
      }
      case 'wacc': {
        const w = wacc(p as WaccInput)
        return ok('wacc', label, w, `**${label} — WACC**\n${w.formula}\nWACC = **${fmtPct(w.wacc)}** (Ke peso ${fmtPct(w.equityWeight)}, Kd pós-imposto ${fmtPct(w.afterTaxCostOfDebt)})`)
      }
      case 'dcf': {
        const d = dcf(p as DcfInput)
        const eq = d.equityValue != null ? `\nEquity = **${fmtN(d.equityValue)}**` : ''
        const ps = d.valuePerShare != null ? ` · por ação **${fmtN(d.valuePerShare, 4)}**` : ''
        return ok('dcf', label, d, `**${label} — DCF**\n${d.steps.map(s => `- ${s}`).join('\n')}\nEnterprise Value = **${fmtN(d.enterpriseValue)}**${eq}${ps}`)
      }
      case 'lbo': {
        const l = lbo(p as LboInput)
        const a = l.attribution
        const md = `**${label} — LBO**
| Métrica | Valor |
|---|---|
| EV de entrada | ${fmtN(l.entryEV)} |
| Dívida na entrada | ${fmtN(l.totalDebtAtEntry)} |
| Cheque do sponsor | ${fmtN(l.sponsorEquity)} |
| EV de saída | ${fmtN(l.exitEV)} |
| Dívida líquida na saída | ${fmtN(l.exitNetDebt)} |
| **MOIC** | **${fmtN(l.moic)}x** |
| **TIR (IRR)** | **${fmtPct(l.irr)}** |

Atribuição de retorno: crescimento de EBITDA ${fmtN(a.ebitdaGrowth)} · expansão de múltiplo ${fmtN(a.multipleExpansion)} · desalavancagem ${fmtN(a.deleveraging)}.`
        return ok('lbo', label, l, md)
      }
      case 'accretion': {
        const ac = accretionDilution(p as AccretionInput)
        return ok('accretion', label, ac, `**${label} — Accretion/Dilution**\nEPS adquirente ${fmtN(ac.acquirerEPS, 4)} → pró-forma ${fmtN(ac.proFormaEPS, 4)} = **${ac.verdict.toUpperCase()} ${fmtPct(ac.accretionDilution)}**\nSinergia pré-imposto de breakeven: ${fmtN(ac.breakevenPreTaxSynergies)}`)
      }
      case 'comps': {
        const v = impliedValuation(p.metricName ?? 'métrica', p.metricValue, p.peerMultiples ?? [])
        return ok('comps', label, v, `**${label} — Comparáveis (${v.metric})**\nMúltiplos pares p25/p50/p75 = ${fmtN(v.multipleStats.p25)}/${fmtN(v.multipleStats.median)}/${fmtN(v.multipleStats.p75)}x\nEV implícito: **${fmtN(v.low)} – ${fmtN(v.base)} – ${fmtN(v.high)}**`)
      }
      case 'ppa': {
        const pp = ppa(p as PpaInput)
        return ok('ppa', label, pp, `**${label} — PPA / Goodwill**\n${pp.steps.map(s => `- ${s}`).join('\n')}\nGoodwill = **${fmtN(pp.goodwill)}** · D&A incremental/ano = ${fmtN(pp.annualIncrementalDA)}`)
      }
      case 'agio': {
        const g = agioTaxBenefit(p as AgioInput)
        return ok('agio', label, g, `**${label} — Benefício do ágio (Brasil)**\nEscudo fiscal anual ${fmtN(g.annualTaxShield)} por ${g.amortizationYears} anos → PV = **${fmtN(g.presentValueTaxShield)}**\n${g.note}`)
      }
      case 'asset_vs_stock': {
        const c = compareAssetVsStock(p as AssetVsStockInput)
        return ok('asset_vs_stock', label, c, `**${label} — Asset vs Stock deal**\nEscudo fiscal (asset) PV = **${fmtN(c.assetDealTaxShieldPV)}** vs stock = ${fmtN(c.stockDealTaxShieldPV)}\n${c.recommendation}`)
      }
      default:
        return { kind: r.kind, label, ok: false, error: 'kind desconhecido', markdown: '' }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro no cálculo'
    return { kind: r.kind, label, ok: false, error: msg, markdown: `**${label}** — não foi possível calcular: ${msg}` }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ok(kind: ComputeKind, label: string, result: any, markdown: string): ComputeOutput {
  return { kind, label, ok: true, result, markdown }
}

/**
 * Executa todos os blocos ```compute``` de uma resposta e devolve:
 *  - `augmented`: a resposta com os blocos substituídos por seus resultados exatos;
 *  - `outputs`: os resultados estruturados (para logging/UI).
 */
export function executeComputeBlocks(text: string, inputs: EngineInputs | null = null): {
  augmented: string
  outputs: ComputeOutput[]
} {
  const requests = parseComputeRequests(text)
  if (requests.length === 0) return { augmented: text, outputs: [] }

  const outputs = requests.map(req => runComputeRequest(req, inputs))
  let idx = 0
  const augmented = text.replace(FENCE_RE, () => {
    const o = outputs[idx++]
    return o ? `\n\n> 🧮 **Cálculo determinístico (motor Angra)**\n${o.markdown}\n` : ''
  })
  return { augmented, outputs }
}

import { NextRequest } from 'next/server'
import {
  focusSelection,
  capSelected,
  MAX_SELECTED,
  type AgentLite,
  type Recommendation,
} from '@/lib/server/agentFocus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are a strategic routing specialist. Given a business question and a list of AI agents with their roles, decide which agents are relevant to answer the question well and which are not, and recommend the highest-leverage agents to activate for THIS specific challenge.

Return a JSON object with exactly three keys:
- "selected": array of agent IDs that are relevant and should be called
- "excluded": array of objects { "id": string, "reason": string } for agents that should NOT be called
- "recommendations": array of objects { "agentId": string, "reason": string } — the subset of "selected" that most moves the needle for THIS challenge, each with a concise POSITIVE justification of why this specialist matters here (e.g. detected regulatory risk → "risco regulatório BACen/CVM no caminho crítico"; detected debt → "estrutura de capital e custo de dívida")

Rules:
- Assemble a FOCUSED team: 3 to 6 agents in "selected" — the smallest set that fully covers THIS challenge. A boutique deploys the right specialists, never the whole firm. NEVER select everyone.
- Be decisive — exclude every agent clearly outside the question's domain
- A question about sales should not involve security or programming agents, for example
- "recommendations" must reference only agent IDs that are also in "selected", ordered by relevance, at most 6 entries
- Each "reason" (excluded and recommendations) must be 12 words or fewer
- A recommendation reason states WHY the agent is useful for this challenge, not why others are excluded
- Write all reasons in the SAME language as the question. If the question is in Portuguese, write reasons in Portuguese. If the question is in English, write reasons in English.
- NEVER mention any language model, provider, or technology name in any reason
- Output ONLY the JSON object — no other text, no markdown fences
- Always include at least 3 agents in "selected"

Example (Portuguese question):
{
  "selected": ["mare", "brisa", "corsario", "asten"],
  "excluded": [
    { "id": "sentinela", "reason": "Fora do escopo desta análise comercial" },
    { "id": "forge", "reason": "Não relevante para questão de vendas" }
  ],
  "recommendations": [
    { "agentId": "asten", "reason": "estrutura de capital e custo de dívida" },
    { "agentId": "corsario", "reason": "qualificação de pipeline e ICP" }
  ]
}`

// ── Model-name masking (safety net) ───────────────────────────────────────────
// Reasons describe business domains, but never let a provider/model name reach the UI —
// coherent with IDENTITY_GUARD and src/lib/modelMask.ts (technology is confidential).
const MODEL_NAME_RE =
  /\b(deepseek(?:[\w.-]+)?|claude(?:[\s-][\w.]+)?|gpt[\w.-]*|opus|sonnet|haiku|fable|anthropic|openai|llama[\w.-]*|mistral[\w.-]*|gemini[\w.-]*|grok[\w.-]*|large\s+language\s+models?|language\s+models?|\bllm\b|transformer)\b/gi

function maskNames(s: string): string {
  return s.replace(MODEL_NAME_RE, '').replace(/\s{2,}/g, ' ').trim()
}

// ── Heuristic fallback ─────────────────────────────────────────────────────────
// Keyword → agent recommendations, used when the model is unavailable or returns none.
// Reasons are positive justifications ("why this specialist for this challenge").
const HEURISTIC_RULES: { id: string; test: RegExp; reason: { pt: string; en: string } }[] = [
  {
    id: 'guardiao',
    test: /regulat[óo]ri|bacen|cvm|lgpd|compliance|anvisa|regula[çc][ãa]o|licenciament|privacidad|data\s+protection|privacy/i,
    reason: { pt: 'risco regulatório/LGPD no caminho crítico', en: 'regulatory/LGPD risk on the critical path' },
  },
  {
    id: 'jurista',
    test: /contrato|contract|cl[áa]usula|clause|jur[íi]dic|legal|term\s?sheet|lit[íi]g/i,
    reason: { pt: 'revisão contratual e exposição jurídica', en: 'contract review and legal exposure' },
  },
  {
    id: 'asten',
    test: /d[íi]vida|debt|alavanc|leverage|capital\s+de\s+giro|working\s+capital|custo\s+de\s+capital|financiament|juros|interest|fluxo\s+de\s+caixa|cash\s?flow|estrutura\s+de\s+capital|ebitda|valuation/i,
    reason: { pt: 'estrutura de capital e custo de dívida', en: 'capital structure and cost of debt' },
  },
  {
    id: 'merko',
    test: /aquisi[çc]|fus[ãa]o|merger|m&a|\bdeal\b|sell-?side|buy-?side|reestrutura[çc]/i,
    reason: { pt: 'estruturação de deal e valuation de M&A', en: 'deal structuring and M&A valuation' },
  },
  {
    id: 'auditor',
    test: /due\s+diligence|auditoria|\baudit\b|red\s?flag|qualidade\s+de\s+earnings|conting[êe]nci|passivo\s+oculto/i,
    reason: { pt: 'due diligence e detecção de red flags', en: 'due diligence and red-flag detection' },
  },
  {
    id: 'contabil',
    test: /cont[áa]bil|concilia|fechamento|balan[çc]o|accounting|reconcil/i,
    reason: { pt: 'conciliação contábil e fechamento', en: 'accounting reconciliation and close' },
  },
  {
    id: 'sentinela',
    test: /seguran[çc]a|security|amea[çc]a|threat|ataque|attack|vulnerab|cyber|breach|invas/i,
    reason: { pt: 'inteligência de ameaças e superfície de ataque', en: 'threat intelligence and attack surface' },
  },
  {
    id: 'vigia',
    test: /anomal|intrus|monitorament|fraude|fraud|detec[çc][ãa]o\s+de/i,
    reason: { pt: 'detecção de anomalias e intrusões', en: 'anomaly and intrusion detection' },
  },
  {
    id: 'corsario',
    test: /vendas|sales|prospec|\blead\b|pipeline|\bicp\b|outbound|qualifica[çc]/i,
    reason: { pt: 'prospecção e qualificação de pipeline', en: 'prospecting and pipeline qualification' },
  },
  {
    id: 'negociador',
    test: /negocia|obje[çc]|fechamento|closing|desconto|discount|proposta\s+comercial/i,
    reason: { pt: 'negociação, objeções e fechamento', en: 'negotiation, objections and closing' },
  },
  {
    id: 'forja',
    test: /c[óo]digo|software|programa[çc]|desenvolv|develop|\bapi\b|backend|frontend|feature|\bbug\b/i,
    reason: { pt: 'engenharia e geração de código', en: 'engineering and code generation' },
  },
  {
    id: 'arquiteto',
    test: /arquitetura|architecture|escalab|scalab|design\s+t[ée]cnic|microservi[çc]|sistema\s+distribu/i,
    reason: { pt: 'arquitetura e design técnico do sistema', en: 'system architecture and technical design' },
  },
  {
    id: 'estaleiro',
    test: /devops|infra|deploy|\bcloud\b|kubernetes|docker|ci\/?cd|terraform/i,
    reason: { pt: 'infraestrutura, IaC e pipelines de deploy', en: 'infrastructure, IaC and deploy pipelines' },
  },
  {
    id: 'pesquisador',
    test: /pesquisa|research|mercado|market|concorr[êe]nci|competit|benchmark|tend[êe]nci|\btrend\b/i,
    reason: { pt: 'research de mercado e inteligência competitiva', en: 'market research and competitive intelligence' },
  },
  {
    id: 'novae',
    test: /novo\s+neg[óo]cio|new\s+business|growth|crescimento|\bmvp\b|startup|expans|go-?to-?market|\bokr\b/i,
    reason: { pt: 'novos negócios, growth e validação', en: 'new business, growth and validation' },
  },
  {
    id: 'tycen',
    test: /execu[çc]|\bpmo\b|turnaround|100\s+dias|integra[çc][ãa]o|roadmap|milestone|transforma[çc]/i,
    reason: { pt: 'execução, PMO e turnaround operacional', en: 'execution, PMO and operational turnaround' },
  },
  {
    id: 'redator',
    test: /conte[úu]do|\bcontent\b|marketing|\bcopy\b|artigo|\bblog\b|\bseo\b|editorial/i,
    reason: { pt: 'produção de conteúdo e marketing editorial', en: 'content production and editorial marketing' },
  },
  {
    id: 'interprete',
    test: /tradu|translat|localiza[çc]|multil[íi]ngu/i,
    reason: { pt: 'tradução e localização multilíngue', en: 'multilingual translation and localization' },
  },
]

function heuristicRecommendations(
  question: string,
  agents: AgentLite[],
  lang: 'pt' | 'en',
): Recommendation[] {
  const present = new Set(agents.map(a => a.id))
  const recs: Recommendation[] = []
  for (const rule of HEURISTIC_RULES) {
    if (recs.length >= 6) break
    if (present.has(rule.id) && rule.test.test(question)) {
      recs.push({ agentId: rule.id, reason: rule.reason[lang] })
    }
  }
  return recs
}

export async function POST(req: NextRequest) {
  const {
    question,
    agents,
    lang = 'pt',
  } = (await req.json()) as {
    question: string
    agents: AgentLite[]
    lang?: 'pt' | 'en'
  }

  const q = question ?? ''
  const roster = agents ?? []
  const heuristic = heuristicRecommendations(q, roster, lang)
  const heurIds = heuristic.map(r => r.agentId)

  // Focused fallback — a small relevant team, never the whole roster. Everyone
  // not on the team goes to the opt-in column (no negative "excluded" reason).
  const focused = () => {
    const { selected, recommendations } = focusSelection(roster, heuristic)
    const selSet = new Set(selected)
    const excluded = roster.filter(a => !selSet.has(a.id)).map(a => ({ id: a.id, reason: '' }))
    return Response.json({ selected, excluded, recommendations })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey || !roster.length) return focused()

  const chatModel = process.env.DEEPSEEK_MODEL_CHAT ?? 'deepseek-chat'
  const langHint =
    lang === 'en'
      ? 'Write all reasons in English.'
      : 'Escreva todos os motivos em português.'

  const agentList = agents
    .map(a => `- id: "${a.id}" | name: "${a.name}" | role: "${a.role}" | category: "${a.category}"`)
    .join('\n')

  const userMessage = `Question: "${question}"\n\nAvailable agents:\n${agentList}`

  let upstream: Response
  try {
    upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: chatModel,
        stream: false,
        max_tokens: 800,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + '\n\n' + langHint },
          { role: 'user', content: userMessage },
        ],
      }),
    })
  } catch {
    return focused()
  }

  if (!upstream.ok) return focused()

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const raw = (data.choices?.[0]?.message?.content ?? '').trim()

  try {
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(clean) as {
      selected?: string[]
      excluded?: { id: string; reason: string }[]
      recommendations?: { agentId: string; reason: string }[]
    }
    if (Array.isArray(parsed.selected) && Array.isArray(parsed.excluded)) {
      const rawSel = parsed.selected.filter(id => agents.some(a => a.id === id))
      if (rawSel.length >= 1) {
        // Recommendations first (they order the focus), then cap the team so the
        // model can never hand back the whole firm.
        const recIds = Array.isArray(parsed.recommendations)
          ? parsed.recommendations.filter(r => r && typeof r.agentId === 'string').map(r => r.agentId)
          : []
        const sel = capSelected(rawSel, recIds, heurIds, roster)
        const selSet = new Set(sel)
        // Everyone off the focused team becomes opt-in. Keep the model's negative
        // reason only when it's still relevant (agent was in the model's excluded list).
        const excReason = new Map(
          parsed.excluded
            .filter(e => agents.some(a => a.id === e.id))
            .map(e => [e.id, maskNames(e.reason ?? '')] as const),
        )
        const exc = roster
          .filter(a => !selSet.has(a.id))
          .map(a => ({ id: a.id, reason: excReason.get(a.id) ?? '' }))
        // Recommendations must reference the focused team; mask names; drop empties; cap.
        let recs = Array.isArray(parsed.recommendations)
          ? parsed.recommendations
              .filter(r => r && typeof r.agentId === 'string' && selSet.has(r.agentId))
              .map(r => ({ agentId: r.agentId, reason: maskNames(r.reason ?? '') }))
              .filter(r => r.reason.length > 0)
              .slice(0, MAX_SELECTED)
          : []
        if (recs.length === 0) recs = heuristic.filter(r => selSet.has(r.agentId))
        return Response.json({ selected: sel, excluded: exc, recommendations: recs })
      }
    }
  } catch { /* fall through */ }

  return focused()
}

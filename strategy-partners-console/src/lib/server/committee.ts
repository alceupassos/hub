import 'server-only'
import { AGENTS } from '@/lib/agents'
import { runModel, parseJsonFromModel } from '@/lib/server/run-model'
import { buildGrounding } from '@/lib/server/grounding'

// ─────────────────────────────────────────────────────────────────────────────
// Sala de Comitê de Investimento (Y1). Simula a DELIBERAÇÃO dos 5 principais sobre
// um mandato: cada um toma uma posição, o comitê debate as divergências e VOTA
// (go/no_go/watch) com justificativa e dissidências registradas — o ritual real
// de um IC. É uma deliberação estruturada (uma chamada), não 15 idas ao modelo:
// rápido, auditável e ancorado na base proprietária (grounding).
// ─────────────────────────────────────────────────────────────────────────────

export type Vote = 'go' | 'no_go' | 'watch'

export interface MemberPosition {
  agentId: string
  agentName: string
  role: string
  stance: string      // posição de abertura (1-2 frases)
  vote: Vote
  rationale: string   // justificativa do voto
}

export interface DebatePoint {
  topic: string
  tension: string     // a divergência
  positions: string   // quem defende o quê
}

export interface CommitteeResult {
  mandate: string
  decision: Vote
  decisionHeadline: string
  members: MemberPosition[]
  debate: DebatePoint[]
  dissents: string[]      // votos vencidos / ressalvas
  conditions: string[]    // condições precedentes para o go
  tally: { go: number; no_go: number; watch: number }
  model: string
}

const PRINCIPAIS = ['merko', 'asten', 'novae', 'tycen'] // CAIO é o chair (não vota; força consenso)

const CHAIR_ROLE = {
  pt: `Você é CAIO, presidente do Comitê de Investimento da Strategy Partners. Conduza uma DELIBERAÇÃO
realista entre os 4 sócios do comitê sobre o mandato abaixo. Cada sócio tem um viés profissional:
- MERKO (M&A): valuation, estrutura de deal, contingências, walk-away.
- ASTEN (Corporate Finance): custo de capital, estrutura de capital, retorno vs. WACC.
- NOVAE (Growth): tese de crescimento, mercado, unit economics.
- TYCEN (Transformação/PMI): execução, integração, risco de captura de sinergia.
Faça-os DIVERGIR de forma realista (um comitê nunca é unânime por acaso). Ao final, cada um VOTA
go / no_go / watch com justificativa, e você registra a decisão do comitê, dissidências e condições.`,
  en: `You are CAIO, chair of Strategy Partners' Investment Committee. Run a realistic DELIBERATION
among the 4 committee partners on the mandate below. Each has a professional bias:
- MERKO (M&A): valuation, deal structure, contingencies, walk-away.
- ASTEN (Corporate Finance): cost of capital, capital structure, return vs. WACC.
- NOVAE (Growth): growth thesis, market, unit economics.
- TYCEN (Transformation/PMI): execution, integration, synergy-capture risk.
Make them DIVERGE realistically (a committee is never unanimous by accident). At the end each VOTES
go / no_go / watch with a rationale, and you record the committee decision, dissents and conditions.`,
}

function jsonSpec(lang: 'pt' | 'en'): string {
  const votes = lang === 'en'
    ? `"vote" is one of "go" | "no_go" | "watch"`
    : `"vote" é um de "go" | "no_go" | "watch"`
  return `${lang === 'en' ? 'Return ONLY a JSON object' : 'Retorne SOMENTE um objeto JSON'} (${votes}):
{
  "decision": "go|no_go|watch",
  "decisionHeadline": "${lang === 'en' ? 'one decisive sentence' : 'uma frase decisiva'}",
  "members": [
    { "agentId": "merko", "stance": "...", "vote": "go|no_go|watch", "rationale": "..." },
    { "agentId": "asten", "stance": "...", "vote": "...", "rationale": "..." },
    { "agentId": "novae", "stance": "...", "vote": "...", "rationale": "..." },
    { "agentId": "tycen", "stance": "...", "vote": "...", "rationale": "..." }
  ],
  "debate": [ { "topic": "...", "tension": "...", "positions": "..." } ],
  "dissents": ["..."],
  "conditions": ["..."]
}`
}

interface RawResult {
  decision?: string
  decisionHeadline?: string
  members?: { agentId?: string; stance?: string; vote?: string; rationale?: string }[]
  debate?: { topic?: string; tension?: string; positions?: string }[]
  dissents?: string[]
  conditions?: string[]
}

const asVote = (v: string | undefined): Vote => (v === 'go' || v === 'no_go' || v === 'watch' ? v : 'watch')

export async function deliberate(mandate: string, lang: 'pt' | 'en' = 'pt'): Promise<CommitteeResult> {
  const caio = AGENTS.find(a => a.id === 'caio')
  const grounding = await buildGrounding(mandate, lang) // base proprietária (números/precedentes)
  const system = CHAIR_ROLE[lang] + grounding

  const user = `${lang === 'en' ? 'Mandate' : 'Mandato'}: "${mandate}"\n\n${jsonSpec(lang)}`

  const { text, model } = await runModel({ system, user, agent: caio, maxTokens: 3000 })
  const raw = parseJsonFromModel<RawResult>(text)

  const nameOf = (id: string) => AGENTS.find(a => a.id === id)?.name ?? id.toUpperCase()
  const roleOf = (id: string) => AGENTS.find(a => a.id === id)?.role ?? ''

  const members: MemberPosition[] = (raw?.members ?? [])
    .filter(m => m.agentId && PRINCIPAIS.includes(m.agentId))
    .map(m => ({
      agentId: m.agentId!,
      agentName: nameOf(m.agentId!),
      role: roleOf(m.agentId!),
      stance: m.stance ?? '',
      vote: asVote(m.vote),
      rationale: m.rationale ?? '',
    }))

  // Fallback: se o modelo não devolveu membros, cria placeholders neutros (nunca quebra a UI).
  const finalMembers = members.length
    ? members
    : PRINCIPAIS.map(id => ({ agentId: id, agentName: nameOf(id), role: roleOf(id), stance: '', vote: 'watch' as Vote, rationale: '' }))

  const tally = { go: 0, no_go: 0, watch: 0 }
  for (const m of finalMembers) tally[m.vote]++

  // Decisão do comitê: a do chair se veio; senão o voto majoritário.
  const majority: Vote = tally.go >= tally.no_go && tally.go >= tally.watch ? 'go'
    : tally.no_go >= tally.watch ? 'no_go' : 'watch'

  return {
    mandate,
    decision: raw?.decision ? asVote(raw.decision) : majority,
    decisionHeadline: raw?.decisionHeadline ?? '',
    members: finalMembers,
    debate: (raw?.debate ?? []).map(d => ({ topic: d.topic ?? '', tension: d.tension ?? '', positions: d.positions ?? '' })),
    dissents: raw?.dissents ?? [],
    conditions: raw?.conditions ?? [],
    tally,
    model,
  }
}

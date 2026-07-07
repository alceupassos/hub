import 'server-only'
import { AGENTS } from '@/lib/agents'
import { parseJsonFromModel, runModel } from '@/lib/server/run-model'
import { getProjectChunks } from '@/lib/db/queries/dataroom'
import { addDdItems, addRedFlags } from '@/lib/db/queries/due-diligence'

// Diligence autônoma (bloco 3): agentes especialistas leem o dataroom do deal e populam
// red_flags + dd_checklist_items (tabelas da Fase 4). Reusa RAG (chunks) + frota + run-model.
const SEVERITIES = ['baixa', 'media', 'alta', 'critica']

interface DiligenceOutput {
  redFlags?: { category: string; description: string; severity: string }[]
  checklist?: { category: string; item: string }[]
}

export interface DiligenceResult {
  redFlagsAdded: number
  checklistAdded: number
  model: string
  emptyDataroom: boolean
}

export async function runAutonomousDiligence(projectId: string): Promise<DiligenceResult> {
  const chunks = await getProjectChunks(projectId, 60)
  if (chunks.length === 0) {
    return { redFlagsAdded: 0, checklistAdded: 0, model: '', emptyDataroom: true }
  }

  const corpus = chunks.map(c => c.content).join('\n\n---\n\n').slice(0, 16000)
  const auditor = AGENTS.find(a => a.id === 'auditor') ?? AGENTS.find(a => a.id === 'merko')

  const system =
    'Você é a equipe de due diligence lendo o dataroom de uma empresa-alvo. A partir dos trechos de documentos, ' +
    'identifique RED FLAGS (riscos concretos) e itens de CHECKLIST de diligência a verificar. Devolva SOMENTE JSON válido: ' +
    '{ "redFlags": [{ "category": "financeiro|juridico|operacional|comercial|cultura", "description": "...", "severity": "baixa|media|alta|critica" }], ' +
    '"checklist": [{ "category": "...", "item": "..." }] }. Baseie-se apenas no que os documentos sustentam — não invente. ' +
    'Se um documento sugerir contingência trabalhista/fiscal, passivo oculto ou concentração de receita, marque como red flag.'
  const user = `Trechos do dataroom:\n\n${corpus}`

  const { text, model } = await runModel({ system, user, agent: auditor, maxTokens: 1400 })
  const parsed = parseJsonFromModel<DiligenceOutput>(text) ?? {}

  const redFlags = (parsed.redFlags ?? [])
    .filter(f => f.description)
    .map(f => ({
      category: f.category || 'geral',
      description: f.description,
      severity: SEVERITIES.includes(f.severity) ? f.severity : 'media',
      detectedByAgentId: auditor?.id ?? 'auditor',
    }))
  const checklist = (parsed.checklist ?? [])
    .filter(c => c.item)
    .map(c => ({ category: c.category || 'geral', item: c.item, status: 'pendente' }))

  await addRedFlags(projectId, redFlags)
  await addDdItems(projectId, checklist)

  return { redFlagsAdded: redFlags.length, checklistAdded: checklist.length, model, emptyDataroom: false }
}

import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/rbac'
import {
  buildIcMemoDocx,
  buildPitchDeckPptx,
  buildModelXlsx,
  buildTermSheetDocx,
  type DeliverableData,
  type TermSheetData,
} from '@/lib/server/deliverables'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Gera o entregável da boutique (IC memo / deck / modelo / term sheet) a partir dos dados da análise.
//   POST ?format=docx|pptx|xlsx      body: DeliverableData
//   POST ?format=termsheet (.docx)   body: TermSheetData (pacote negociado → Carta de Intenções não vinculante)
// O cliente monta o DeliverableData com o que está na tela (síntese + saídas do motor +
// football field + red flags). Sem dependência de um deal específico — funciona também
// a partir da síntese da frota no console principal.
export async function POST(req: NextRequest) {
  const { ok } = await requireRole(['admin', 'partner', 'analyst', 'client_viewer'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })

  const format = (new URL(req.url).searchParams.get('format') ?? 'docx').toLowerCase()
  let data: DeliverableData
  try {
    data = (await req.json()) as DeliverableData
  } catch {
    return Response.json({ error: 'Corpo inválido — envie o DeliverableData em JSON.' }, { status: 400 })
  }
  if (!data?.dealName) return Response.json({ error: 'dealName é obrigatório.' }, { status: 400 })

  try {
    let buffer: Buffer
    let contentType: string
    let ext: string
    if (format === 'termsheet') {
      buffer = await buildTermSheetDocx(data as unknown as TermSheetData)
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ext = 'docx'
    } else if (format === 'pptx') {
      buffer = await buildPitchDeckPptx(data)
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ext = 'pptx'
    } else if (format === 'xlsx') {
      buffer = await buildModelXlsx(data)
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ext = 'xlsx'
    } else {
      buffer = await buildIcMemoDocx(data)
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ext = 'docx'
    }
    const safeName = data.dealName.replace(/[^\w.-]+/g, '_').slice(0, 60) || 'entregavel'
    const filename =
      format === 'termsheet'
        ? `StrategyPartners_TermSheet_${safeName}.${ext}`
        : `StrategyPartners_${safeName}.${ext}`
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[api/deliverable] erro:', err)
    const message = err instanceof Error ? err.message : 'Falha ao gerar o entregável.'
    return Response.json({ error: message }, { status: 500 })
  }
}

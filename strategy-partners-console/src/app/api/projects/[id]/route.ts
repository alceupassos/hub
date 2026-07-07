import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { deleteProject, getProject } from '@/lib/db/queries/projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) {
    return Response.json({ error: 'Indisponível: DATABASE_URL não configurada.' }, { status: 503 })
  }
  const { id } = await params
  try {
    const project = await getProject(id)
    if (!project) return Response.json({ error: 'Projeto não encontrado.' }, { status: 404 })
    return Response.json({ project })
  } catch (err) {
    console.error('[api/projects/:id] GET erro:', err)
    return Response.json({ error: 'Falha ao carregar projeto.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) {
    return Response.json({ error: 'Indisponível: DATABASE_URL não configurada.' }, { status: 503 })
  }
  const { id } = await params
  try {
    await deleteProject(id)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[api/projects/:id] DELETE erro:', err)
    return Response.json({ error: 'Falha ao remover projeto.' }, { status: 500 })
  }
}

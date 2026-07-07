import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { createProject, getProjects } from '@/lib/db/queries/projects'
import type { ProjectType } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_TYPES: ProjectType[] = ['pre_deal', 'pmi']

export async function GET() {
  if (!isDbConfigured()) {
    // Sem banco: devolve lista vazia para a UI cair no fallback de demonstração.
    return Response.json({ projects: [], dbConfigured: false })
  }
  try {
    const projects = await getProjects()
    return Response.json({ projects, dbConfigured: true })
  } catch (err) {
    console.error('[api/projects] GET erro:', err)
    return Response.json({ error: 'Falha ao carregar projetos.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return Response.json({ error: 'Criação de projeto indisponível: DATABASE_URL não configurada.' }, { status: 503 })
  }
  let body: { name?: string; type?: string; clientName?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Corpo inválido — envie JSON { name, type, clientName? }.' }, { status: 400 })
  }
  const name = body.name?.trim()
  const type = body.type as ProjectType | undefined
  if (!name) return Response.json({ error: 'name é obrigatório.' }, { status: 400 })
  if (!type || !VALID_TYPES.includes(type)) {
    return Response.json({ error: "type deve ser 'pre_deal' ou 'pmi'." }, { status: 400 })
  }
  try {
    const project = await createProject({ name, type, clientName: body.clientName ?? null })
    return Response.json({ project }, { status: 201 })
  } catch (err) {
    console.error('[api/projects] POST erro:', err)
    return Response.json({ error: 'Falha ao criar projeto.' }, { status: 500 })
  }
}

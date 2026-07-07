import { NextRequest } from 'next/server'
import { isDbConfigured } from '@/lib/db'
import { requireRole } from '@/lib/auth/rbac'
import { createThesis, listTheses } from '@/lib/db/queries/deals'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isDbConfigured()) return Response.json({ theses: [], dbConfigured: false })
  return Response.json({ theses: await listTheses(), dbConfigured: true })
}

export async function POST(req: NextRequest) {
  const { ok, session } = await requireRole(['admin', 'partner', 'analyst'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })
  let body: { name?: string; description?: string; criteria?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }
  if (!body.name?.trim()) return Response.json({ error: 'name é obrigatório.' }, { status: 400 })
  const thesis = await createThesis({ name: body.name.trim(), description: body.description ?? null, criteria: body.criteria ?? null, createdByUserId: session.userId ?? null })
  return Response.json({ thesis }, { status: 201 })
}

import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/rbac'
import { isDbConfigured } from '@/lib/db'
import { createUser, listUsers } from '@/lib/db/queries/admin'
import type { UserRole } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLES: UserRole[] = ['admin', 'partner', 'analyst', 'client_viewer']

export async function GET() {
  const { ok } = await requireRole(['admin'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ users: [], dbConfigured: false })
  return Response.json({ users: await listUsers(), dbConfigured: true })
}

export async function POST(req: NextRequest) {
  const { ok } = await requireRole(['admin'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  let body: { email?: string; name?: string; password?: string; role?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }

  const email = body.email?.trim()
  const name = body.name?.trim()
  const password = body.password
  const role = body.role as UserRole | undefined
  if (!email || !name || !password) return Response.json({ error: 'email, name e password são obrigatórios.' }, { status: 400 })
  if (!role || !ROLES.includes(role)) return Response.json({ error: 'role inválido.' }, { status: 400 })
  if (password.length < 8) return Response.json({ error: 'Senha deve ter ao menos 8 caracteres.' }, { status: 400 })

  try {
    const user = await createUser({ email, name, password, role })
    return Response.json({ user }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/users] POST erro:', err)
    return Response.json({ error: 'Falha ao criar usuário (email já existe?).' }, { status: 500 })
  }
}

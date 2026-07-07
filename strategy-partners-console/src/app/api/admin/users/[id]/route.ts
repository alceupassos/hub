import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/rbac'
import { isDbConfigured } from '@/lib/db'
import { setUserActive, setUserRole } from '@/lib/db/queries/admin'
import type { UserRole } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLES: UserRole[] = ['admin', 'partner', 'analyst', 'client_viewer']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ok } = await requireRole(['admin'])
  if (!ok) return Response.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  const { id } = await params
  let body: { role?: string; active?: boolean }
  try { body = await req.json() } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }

  try {
    if (typeof body.active === 'boolean') await setUserActive(id, body.active)
    if (body.role) {
      if (!ROLES.includes(body.role as UserRole)) return Response.json({ error: 'role inválido.' }, { status: 400 })
      await setUserRole(id, body.role as UserRole)
    }
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/users/:id] PATCH erro:', err)
    return Response.json({ error: 'Falha ao atualizar usuário.' }, { status: 500 })
  }
}

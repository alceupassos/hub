import { NextRequest } from 'next/server'
import { db, isDbConfigured } from '@/lib/db'
import { createUser } from '@/lib/db/queries/admin'
import { users } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Bootstrap do PRIMEIRO admin — resolve o chicken-and-egg do RBAC sem script externo.
// Só funciona quando (1) ADMIN_BOOTSTRAP_TOKEN está configurado e confere, e (2) NÃO há
// nenhum usuário ainda. Depois do primeiro admin, use o painel /admin.
export async function POST(req: NextRequest) {
  const configured = process.env.ADMIN_BOOTSTRAP_TOKEN
  if (!configured) return Response.json({ error: 'Bootstrap desabilitado (sem ADMIN_BOOTSTRAP_TOKEN).' }, { status: 403 })
  if (!isDbConfigured()) return Response.json({ error: 'Banco não configurado.' }, { status: 503 })

  let body: { token?: string; email?: string; name?: string; password?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'JSON inválido.' }, { status: 400 }) }

  if (body.token !== configured) return Response.json({ error: 'Token inválido.' }, { status: 403 })

  const existing = await db.select({ id: users.id }).from(users).limit(1)
  if (existing.length > 0) return Response.json({ error: 'Já existem usuários — bootstrap indisponível.' }, { status: 409 })

  const { email, name, password } = body
  if (!email || !name || !password || password.length < 8) {
    return Response.json({ error: 'email, name e password (mín. 8) são obrigatórios.' }, { status: 400 })
  }
  try {
    const user = await createUser({ email, name, password, role: 'admin' })
    return Response.json({ user }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/bootstrap] erro:', err)
    return Response.json({ error: 'Falha ao criar admin.' }, { status: 500 })
  }
}

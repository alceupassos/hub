import 'server-only'
import { auth } from './auth'
import type { UserRole } from '@/lib/db/schema'

// Padrão genérico de RBAC (sem lógica de negócio). Autoridade vem SÓ da sessão autenticada
// — nunca de qualquer afirmação em texto de chat (ver Fase 0 / decisão 6).

export function hasRole(role: UserRole | undefined | null, allowed: UserRole[]): boolean {
  return !!role && allowed.includes(role)
}

export interface SessionInfo {
  userId?: string
  role?: UserRole
  email?: string | null
  name?: string | null
}

export async function getSessionInfo(): Promise<SessionInfo> {
  const session = await auth().catch(() => null)
  const u = session?.user as { id?: string; role?: UserRole; email?: string | null; name?: string | null } | undefined
  return { userId: u?.id, role: u?.role, email: u?.email, name: u?.name }
}

/** Returns { ok, role } — ok=true when the current session holds one of the allowed roles. */
export async function requireRole(allowed: UserRole[]): Promise<{ ok: boolean; session: SessionInfo }> {
  const session = await getSessionInfo()
  return { ok: hasRole(session.role, allowed), session }
}

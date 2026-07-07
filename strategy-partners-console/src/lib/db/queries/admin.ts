import 'server-only'
import bcrypt from 'bcryptjs'
import { desc, eq } from 'drizzle-orm'
import { db } from '../index'
import { executionLogs, securityEvents, users, type UserRole } from '../schema'

// ── Usuários ──────────────────────────────────────────────────────────────────
export async function listUsers() {
  return db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, active: users.active, createdAt: users.createdAt })
    .from(users)
    .orderBy(desc(users.createdAt))
}

export async function createUser(input: { email: string; name: string; password: string; role: UserRole }) {
  const passwordHash = await bcrypt.hash(input.password, 10)
  const [row] = await db
    .insert(users)
    .values({ email: input.email.trim().toLowerCase(), name: input.name, passwordHash, role: input.role })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, active: users.active })
  return row
}

export async function setUserActive(id: string, active: boolean) {
  await db.update(users).set({ active: active ? 1 : 0 }).where(eq(users.id, id))
}

export async function setUserRole(id: string, role: UserRole) {
  await db.update(users).set({ role }).where(eq(users.id, id))
}

// ── Log de execução ─────────────────────────────────────────────────────────
export async function listExecutionLogs(limit = 100) {
  return db.select().from(executionLogs).orderBy(desc(executionLogs.createdAt)).limit(limit)
}

// ── Eventos de segurança (Fase 0/2) ───────────────────────────────────────────
export async function listSecurityEvents(limit = 100) {
  return db.select().from(securityEvents).orderBy(desc(securityEvents.createdAt)).limit(limit)
}

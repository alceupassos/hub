import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { authConfig } from './auth.config'
import { db, isDbConfigured } from '@/lib/db'
import { users } from '@/lib/db/schema'

// Full config with the Credentials provider (Node-only: bcrypt + node-postgres).
// Imported by the /api/auth/[...nextauth] route handler and server components — never by
// the edge middleware (that uses auth.config.ts only).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!isDbConfigured()) return null
        const email = String(creds?.email ?? '').trim().toLowerCase()
        const password = String(creds?.password ?? '')
        if (!email || !password) return null

        const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1)
        if (!u || u.active !== 1) return null

        const ok = await bcrypt.compare(password, u.passwordHash)
        if (!ok) return null

        return { id: u.id, email: u.email, name: u.name, role: u.role }
      },
    }),
  ],
})

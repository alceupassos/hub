import type { NextAuthConfig } from 'next-auth'

// Edge-safe base config (NO database / bcrypt imports — this must be importable from
// middleware, which runs on the edge). The Credentials provider lives in auth.ts, which
// pulls in pg + bcrypt and runs only in the Node.js route handler / server components.
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // role/id carried onto the JWT at sign-in
        token.role = (user as { role?: string }).role
        token.uid = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        ;(session.user as { role?: string }).role = token.role as string | undefined
        ;(session.user as { id?: string }).id = token.uid as string | undefined
      }
      return session
    },
  },
}

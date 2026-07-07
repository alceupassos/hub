import { handlers } from '@/lib/auth/auth'

// NextAuth catch-all (signin/callback/session/csrf). The explicit /api/auth/verify and
// /api/auth/logout routes (legacy daily-code auth) take precedence over this catch-all,
// so both auth systems coexist during the soft cutover (decisão 7).
export const runtime = 'nodejs'
export const { GET, POST } = handlers

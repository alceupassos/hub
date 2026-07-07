import { handlers } from '@/lib/auth/auth'

// NextAuth catch-all (signin/callback/session/csrf). NextAuth v5 owns ALL of /api/auth/* at
// runtime — a sibling static route like /api/auth/verify is still shadowed by this catch-all
// (returns UnknownAction). Por isso o login legado por código diário vive em /api/access/*
// (verify/logout), fora do domínio do NextAuth. Os dois sistemas coexistem no corte suave (decisão 7).
export const runtime = 'nodejs'
export const { GET, POST } = handlers

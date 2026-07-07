import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// /api/admin/bootstrap é público (protegido pelo próprio ADMIN_BOOTSTRAP_TOKEN + só funciona sem
// usuários) — precisa ser acessível para criar o 1º admin antes de qualquer sessão existir.
const PUBLIC_PREFIXES = ['/login', '/land', '/api/auth', '/api/access', '/api/admin/bootstrap']

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

// Soft cutover (decisão 7): a sessão NextAuth e o código diário legado convivem atrás da flag
// LEGACY_DAILY_CODE_AUTH (ligada por padrão) até todos os usuários reais estarem migrados.
// Nunca fazer corte direto sem a migração completa.
function legacyEnabled(): boolean {
  return process.env.LEGACY_DAILY_CODE_AUTH !== 'false'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 1) Sessão NextAuth (edge-safe; getToken retorna null sem AUTH_SECRET/sem token).
  let hasSession = false
  if (process.env.AUTH_SECRET) {
    try {
      const token = await getToken({ req: request, secret: process.env.AUTH_SECRET })
      hasSession = Boolean(token)
    } catch {
      hasSession = false
    }
  }

  // 2) Fallback legado: cookie do código diário.
  const legacyOk =
    legacyEnabled() && request.cookies.get('sp_access')?.value === getTodayBR()

  if (hasSession || legacyOk) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.webp|.*\\.svg|.*\\.html|.*\\.js|.*\\.css|.*\\.png|.*\\.jpg|.*\\.ico).*)',
  ],
}

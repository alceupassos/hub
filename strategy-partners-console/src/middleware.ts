import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// /api/admin/bootstrap é público (protegido pelo próprio ADMIN_BOOTSTRAP_TOKEN + só funciona sem
// usuários) — precisa ser acessível para criar o 1º admin antes de qualquer sessão existir.
const PUBLIC_PREFIXES = ['/login', '/land', '/api/auth', '/api/access', '/api/admin/bootstrap']

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

// Fase A · segurança: o código diário legado foi APOSENTADO. NextAuth é o único caminho.
// A flag continua existindo só como escape hatch de migração controlada, mas agora está
// DESLIGADA por padrão (precisa ser explicitamente 'true'). Mesmo ligada, `validateCode`
// em `src/lib/server/codes.ts` sempre nega — não há mais tabela de códigos.
function legacyEnabled(): boolean {
  return process.env.LEGACY_DAILY_CODE_AUTH === 'true'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 1) Sessão NextAuth (edge-safe; getToken retorna null sem AUTH_SECRET/sem token).
  //    Atrás de um proxy HTTPS→HTTP (nginx termina TLS; o app ouve HTTP interno), o NextAuth
  //    GRAVA o cookie como `__Secure-authjs.session-token`, mas o getToken pode procurar o nome
  //    SEM o prefixo (por ver a requisição interna como HTTP) — mismatch que autentica mas não
  //    mantém a sessão. Tentamos os DOIS nomes (secureCookie true/false) para ser resiliente.
  let hasSession = false
  if (process.env.AUTH_SECRET) {
    for (const secureCookie of [true, false]) {
      try {
        const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie })
        if (token) { hasSession = true; break }
      } catch {
        // tenta o outro nome de cookie
      }
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

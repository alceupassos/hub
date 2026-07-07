import { NextRequest, NextResponse } from 'next/server'
import { validateCode, getTodayKey } from '@/lib/server/codes'

function getMidnightExpiry(): Date {
  const now = new Date()
  const br = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const midnight = new Date(br)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)
  const diffMs = midnight.getTime() - br.getTime()
  return new Date(Date.now() + diffMs)
}

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ ok: false, message: 'Código inválido' }, { status: 400 })
    }

    const valid = validateCode(code)
    if (!valid) {
      return NextResponse.json({ ok: false, message: 'Código incorreto' }, { status: 401 })
    }

    const today = getTodayKey()
    const expires = getMidnightExpiry()

    const res = NextResponse.json({ ok: true })
    res.cookies.set('sp_access', today, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      expires,
      secure: process.env.NODE_ENV === 'production',
    })
    return res
  } catch {
    return NextResponse.json({ ok: false, message: 'Erro interno' }, { status: 500 })
  }
}

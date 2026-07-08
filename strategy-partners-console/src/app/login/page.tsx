'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  // Autenticação: NextAuth (email + senha, RBAC). O código diário legado foi aposentado (Fase A).
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function fail(msg: string) {
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')

    if (!email.trim() || !password) return
    setLoading(true)
    try {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (res?.ok) {
        setSuccess(true)
        setTimeout(() => router.push(next), 700)
      } else {
        fail('Email ou senha incorretos')
        setPassword('')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; }

        .login-root {
          min-height: 100vh;
          background: linear-gradient(160deg, #040d1f 0%, #0a2350 60%, #0d1f40 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          position: relative;
          overflow: hidden;
        }

        .login-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(ellipse at 30% 20%, rgba(29, 79, 154, 0.25) 0%, transparent 60%),
                            radial-gradient(ellipse at 70% 80%, rgba(10, 47, 99, 0.3) 0%, transparent 50%);
          pointer-events: none;
        }

        .login-card {
          position: relative;
          width: 100%;
          max-width: 420px;
          margin: 0 24px;
          padding: 48px 44px 44px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          backdrop-filter: blur(12px);
        }

        .login-logo {
          display: block;
          margin: 0 auto 36px;
          filter: brightness(0) invert(1);
          opacity: 0.92;
          max-width: 180px;
          height: auto;
        }

        .login-headline {
          margin: 0 0 8px;
          font-family: 'Newsreader', Georgia, serif;
          font-weight: 500;
          font-size: 32px;
          line-height: 1.05;
          color: #eef2f8;
          letter-spacing: -0.02em;
        }

        .login-sub {
          margin: 0 0 32px;
          color: rgba(238, 242, 248, 0.55);
          font-size: 14px;
          line-height: 1.5;
        }

        .login-label {
          display: block;
          margin-bottom: 8px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(238, 242, 248, 0.45);
        }

        .login-input {
          width: 100%;
          padding: 14px 16px;
          font-family: 'Space Grotesk', monospace;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          text-align: center;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 3px;
          color: #eef2f8;
          outline: none;
          transition: border-color 0.15s;
          caret-color: #c9a24a;
        }

        .login-input:focus {
          border-color: rgba(201, 162, 74, 0.6);
          background: rgba(255, 255, 255, 0.08);
        }

        .login-input::placeholder {
          color: rgba(238, 242, 248, 0.2);
          letter-spacing: 0.08em;
        }

        .login-input.shake {
          animation: shake 0.5s ease;
          border-color: rgba(181, 70, 47, 0.7);
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }

        .login-error {
          margin-top: 10px;
          font-size: 12px;
          color: rgba(181, 70, 47, 0.9);
          text-align: center;
          min-height: 18px;
        }

        .login-btn {
          margin-top: 24px;
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #0a2f63, #1d4f9a);
          border: 1px solid rgba(201, 162, 74, 0.4);
          border-radius: 3px;
          color: #eef2f8;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }

        .login-btn:hover:not(:disabled) { opacity: 0.88; }
        .login-btn:active:not(:disabled) { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .login-btn.success {
          background: linear-gradient(135deg, #1a5c38, #2e7d52);
          border-color: rgba(46, 125, 82, 0.6);
        }

        .login-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 11px;
          color: rgba(238, 242, 248, 0.25);
          letter-spacing: 0.05em;
        }

        .login-root.fade-out {
          animation: fadeOut 0.6s ease forwards;
        }

        @keyframes fadeOut {
          to { opacity: 0; transform: scale(1.01); }
        }
      `}</style>

      <div className={`login-root${success ? ' fade-out' : ''}`}>
        <div className="login-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/strategy-partners-logo.svg"
            alt="Strategy Partners"
            className="login-logo"
          />

          <h1 className="login-headline">Acesso restrito.</h1>
          <p className="login-sub">
            Entre com seu email e senha corporativos.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="email-input">Email</label>
            <input
              ref={inputRef}
              id="email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@strategypartners.com.br"
              autoComplete="email"
              disabled={loading || success}
              className={`login-input${shake ? ' shake' : ''}`}
              style={{ textTransform: 'none', textAlign: 'left', letterSpacing: 'normal', fontSize: 15 }}
            />
            <label className="login-label" htmlFor="password-input" style={{ marginTop: 14 }}>Senha</label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading || success}
              className="login-input"
              style={{ textTransform: 'none', textAlign: 'left', letterSpacing: '0.1em', fontSize: 15 }}
            />

            <div className="login-error">{error}</div>

            <button
              type="submit"
              disabled={!email || !password || loading || success}
              className={`login-btn${success ? ' success' : ''}`}
            >
              {success ? 'Acesso autorizado' : loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>

          <p className="login-footer">
            Strategy Partners · Plataforma executiva de IA
          </p>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

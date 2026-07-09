'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import {
  MessageSquare, Folder, Grid3X3, BarChart2, Book, Settings, Plus, ChevronDown,
  ChevronRight, Circle, ShieldCheck, Sparkles, KanbanSquare, Users, LogOut,
  Calculator, Scale, Activity, Handshake, Landmark, LineChart, CalendarRange, Gavel, Crosshair, Radar,
} from 'lucide-react'
import { AGENTS_BY_CATEGORY } from '@/lib/agents'
import type { Agent } from '@/lib/types'
import { useLang } from '@/lib/lang'
import { useAgentConfig } from '@/lib/agent-config'
import { getT, CATEGORY_T } from '@/lib/i18n'
import { APP_VERSION } from '@/lib/version'

const CATEGORY_ORDER = ['chat', 'vendas', 'segurança', 'financeiro', 'programação', 'conhecimento']

function AgentRow({ agent, active }: { agent: Agent; active: boolean }) {
  const [open, setOpen] = useState(false)
  const { getDisplayName } = useAgentConfig()
  const displayName = getDisplayName(agent.id)
  const href = `/chat?agent=${agent.id}`

  return (
    <div>
      <div
        className={`w-full flex items-center gap-[9px] px-[10px] py-[5px] rounded-[7px] text-[12px] transition-colors cursor-pointer select-none ${
          active
            ? 'text-ink-0 font-medium bg-active-bg'
            : 'text-ink-4 hover:bg-hover-bg'
        }`}
        onClick={() => setOpen(v => !v)}
      >
        <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 ring-1 ring-border-base">
          <Image
            src={agent.avatar}
            alt={displayName}
            fill
            className="object-cover"
            sizes="20px"
          />
        </div>
        <span className="flex-1 truncate">{displayName}</span>
        <ChevronRight
          size={10}
          strokeWidth={2}
          className={`shrink-0 text-ink-7 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
      </div>

      {open && (
        <div
          className="mx-[10px] mb-[4px] mt-[2px] rounded-[6px] px-[10px] py-[8px] border border-border-div"
          style={{ background: 'var(--color-hover-bg, rgba(0,0,0,0.04))' }}
        >
          {/* Header */}
          <div className="flex items-center gap-[7px] mb-[6px]">
            <div className="relative w-[22px] h-[22px] rounded-full overflow-hidden shrink-0 ring-1 ring-border-base">
              <Image src={agent.avatar} alt={displayName} fill className="object-cover" sizes="22px" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-ink-0 leading-tight truncate">{displayName}</p>
              <p className="font-mono text-[9px] text-ink-7 leading-tight truncate">{agent.modelAlias}</p>
            </div>
          </div>

          {/* Role */}
          <p className="text-[10px] text-ink-6 mb-[6px] italic leading-tight">{agent.role}</p>

          {/* Specs */}
          {agent.specs && agent.specs.length > 0 && (
            <ul className="space-y-[4px]">
              {agent.specs.map((spec, i) => (
                <li key={i} className="flex items-start gap-[5px] text-[10.5px] text-ink-4 leading-snug">
                  <Circle size={4} className="mt-[4px] shrink-0" style={{ fill: agent.dot, color: agent.dot }} />
                  <span>{spec}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Chat CTA */}
          <Link
            href={href}
            className="mt-[8px] flex items-center justify-center gap-[5px] w-full py-[4px] rounded-[5px] text-[10px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: agent.barColor }}
            onClick={e => e.stopPropagation()}
          >
            <MessageSquare size={10} />
            Abrir chat
          </Link>
        </div>
      )}
    </div>
  )
}

function NavContent() {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const activeAgent = searchParams.get('agent')
  const { lang, setLang } = useLang()
  const { isEnabled } = useAgentConfig()
  const t = getT(lang)
  const catT = CATEGORY_T[lang]

  // Papel da sessão NextAuth — o item Admin só aparece para role 'admin' (RBAC real também
  // é aplicado no servidor; esconder no menu é apenas UX).
  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => setRole(d?.user?.role ?? null))
      .catch(() => {})
  }, [])

  // Logout dos DOIS sistemas de auth (corte suave): NextAuth (signout) + código diário (sp_access).
  async function logout() {
    try {
      const csrf = await fetch('/api/auth/csrf').then(r => r.json()).then(d => d?.csrfToken).catch(() => null)
      if (csrf) {
        await fetch('/api/auth/signout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ csrfToken: csrf, callbackUrl: '/login', json: 'true' }),
        }).catch(() => {})
      }
      await fetch('/api/access/logout', { method: 'POST' }).catch(() => {})
    } finally {
      window.location.href = '/login'
    }
  }

  const navItems = [
    { icon: MessageSquare, label: t.conversations, href: '/', matchPaths: ['/', '/chat'] },
    { icon: Users,         label: t.fleet,         href: '/frota',        matchPaths: ['/frota'] },
    { icon: Gavel,         label: t.committee,     href: '/comite',       matchPaths: ['/comite'] },
    { icon: Radar,         label: t.commandTower,  href: '/torre',        matchPaths: ['/torre'] },
    { icon: Sparkles,      label: t.dealflow,      href: '/dealflow',     matchPaths: ['/dealflow'] },
    { icon: KanbanSquare,  label: t.pipeline,      href: '/pipeline',     matchPaths: ['/pipeline'] },
    { icon: Folder,        label: t.projects,      href: '/projetos',     matchPaths: ['/projetos'] },
    { icon: Calculator,    label: t.modeling,      href: '/modelagem',    matchPaths: ['/modelagem'] },
    { icon: Scale,         label: t.roiCompare,    href: '/comparativo',  matchPaths: ['/comparativo'] },
    { icon: Handshake,     label: t.negotiation,   href: '/negociacao',   matchPaths: ['/negociacao'] },
    { icon: Crosshair,     label: t.inflection,    href: '/inflexao',     matchPaths: ['/inflexao'] },
    { icon: CalendarRange, label: t.timeline,      href: '/cronograma',   matchPaths: ['/cronograma'] },
    { icon: Landmark,      label: t.advDebt,       href: '/advisory?tab=divida',       matchPaths: ['/advisory'], matchTab: 'divida' },
    { icon: LineChart,     label: t.advReview,     href: '/advisory?tab=revisao',      matchPaths: ['/advisory'], matchTab: 'revisao' },
    { icon: CalendarRange, label: t.advPlan,       href: '/advisory?tab=planejamento', matchPaths: ['/advisory'], matchTab: 'planejamento' },
    { icon: Grid3X3,       label: t.agentsNav,     href: '/modelos',      matchPaths: ['/modelos'] },
    { icon: BarChart2,     label: t.reports,       href: '/relatorios',   matchPaths: ['/relatorios'] },
    { icon: Book,          label: t.knowledge,     href: '/conhecimento', matchPaths: ['/conhecimento'] },
    { icon: Sparkles,      label: t.novidades,     href: '/novidades',    matchPaths: ['/novidades'] },
    { icon: Settings,      label: t.configNav,     href: '/config',       matchPaths: ['/config'] },
    ...(role === 'admin'
      ? [
          { icon: ShieldCheck, label: 'Admin', href: '/admin', matchPaths: ['/admin'] },
          { icon: Activity, label: lang === 'en' ? 'Diagnostics' : 'Diagnóstico', href: '/admin/diagnostico', matchPaths: ['/admin/diagnostico'] },
        ]
      : []),
  ]

  return (
    <nav className="flex flex-col w-[244px] shrink-0 h-full border-r border-border-base bg-surface px-[14px] py-[18px]">
      {/* Logo + language toggle */}
      <div className="px-[6px] pb-[14px] pt-[2px] flex items-end justify-between">
        <Image
          src="/strategy-partners-logo.svg"
          alt="Strategy Partners"
          width={142}
          height={52}
          priority
        />
        <div className="flex gap-[2px] mb-[2px]">
          {(['en', 'pt'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-[6px] py-[2px] rounded text-[9px] font-mono font-semibold uppercase tracking-wider transition-colors ${
                lang === l
                  ? 'bg-accent text-white'
                  : 'text-ink-7 hover:text-ink-4 hover:bg-hover-bg'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* New session button */}
      <Link
        href="/"
        className="w-full flex items-center justify-center gap-[10px] px-[10px] py-2 rounded-lg bg-accent text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
      >
        <Plus size={14} strokeWidth={2.2} />
        {t.newSession}
      </Link>

      <div className="mt-4 flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">
        {/* Workspace */}
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-6 px-[10px] mb-1">
            {t.workspace}
          </p>
          {navItems.map(({ icon: Icon, label, href, matchPaths, matchTab }) => {
            const pathActive = matchPaths.some(p =>
              p === '/' ? pathname === p : pathname.startsWith(p)
            )
            // Itens que compartilham a rota /advisory se distinguem pelo ?tab= atual.
            const active = matchTab
              ? pathname.startsWith('/advisory') && (searchParams.get('tab') ?? 'divida') === matchTab
              : pathActive
            return (
              <Link
                key={label}
                href={href}
                className={`w-full flex items-center gap-[11px] px-[10px] py-[7px] rounded-[7px] text-[12.5px] transition-colors ${
                  active
                    ? 'text-accent bg-accent-soft font-medium'
                    : 'text-ink-4 hover:bg-hover-bg'
                }`}
              >
                <Icon size={15} strokeWidth={1.6} />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Agents — all by category, with expandable spec panels */}
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-6 px-[10px] mb-1 flex items-center gap-1">
            {t.agentsNav}
            <ChevronDown size={10} strokeWidth={2} className="text-ink-6" />
          </p>

          {CATEGORY_ORDER.filter(cat => AGENTS_BY_CATEGORY[cat]?.some(a => isEnabled(a.id))).map(cat => (
            <div key={cat} className="mb-1">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ink-7 px-[10px] py-[3px] mt-1">
                {catT[cat] ?? cat}
              </p>

              {AGENTS_BY_CATEGORY[cat].filter(a => isEnabled(a.id)).map(agent => (
                <AgentRow
                  key={agent.id}
                  agent={agent}
                  active={pathname === '/chat' && activeAgent === agent.id}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border-div pt-3 flex items-center gap-[10px]">
        <div className="w-[30px] h-[30px] rounded-[7px] bg-accent flex items-center justify-center text-white text-[10.5px] font-semibold shrink-0">
          {(role ?? 'SP').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-ink-0 truncate">Strategy Partners</p>
          <p className="font-mono text-[10px] text-ink-6 truncate">
            {role ? `Sessão · ${role}` : 'Acesso autorizado'} · <Link href="/novidades" className="hover:text-accent">v{APP_VERSION}</Link>
          </p>
        </div>
        <button
          onClick={logout}
          aria-label={lang === 'en' ? 'Sign out' : 'Sair'}
          title={lang === 'en' ? 'Sign out' : 'Sair'}
          className="w-[28px] h-[28px] flex items-center justify-center rounded-md text-ink-6 hover:text-red-600 hover:bg-hover-bg transition-colors shrink-0"
        >
          <LogOut size={15} strokeWidth={1.7} />
        </button>
      </div>
    </nav>
  )
}

export function NavSidebar() {
  return (
    <Suspense
      fallback={
        <nav className="flex flex-col w-[244px] shrink-0 h-full border-r border-border-base bg-surface" />
      }
    >
      <NavContent />
    </Suspense>
  )
}

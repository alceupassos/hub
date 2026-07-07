'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, ScrollText, ShieldAlert } from 'lucide-react'

const TABS = [
  { href: '/admin', label: 'Usuários', icon: Users, exact: true },
  { href: '/admin/logs', label: 'Log de Execução', icon: ScrollText, exact: false },
  { href: '/admin/security', label: 'Eventos de Segurança', icon: ShieldAlert, exact: false },
]

export function AdminTabs() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 border-b border-border-base px-8 bg-surface">
      {TABS.map(t => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link key={t.href} href={t.href}
            className={`flex items-center gap-1.5 px-3 py-3 text-[12.5px] border-b-2 -mb-px transition-colors ${active ? 'border-accent text-accent font-medium' : 'border-transparent text-ink-5 hover:text-ink-0'}`}>
            <t.icon size={14} strokeWidth={1.7} />
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}

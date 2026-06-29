'use client'
import Link from 'next/link'
import Image from 'next/image'
import { NavSidebar } from '@/components/NavSidebar'
import { AGENTS, AGENTS_BY_CATEGORY } from '@/lib/agents'
import { useLang } from '@/lib/lang'
import { getT } from '@/lib/i18n'

const CATEGORY_ORDER = ['chat', 'vendas', 'segurança', 'financeiro', 'programação', 'conhecimento']

const CATEGORY_LABEL_EN: Record<string, string> = {
  chat:         'Chat & Triage',
  vendas:       'Sales',
  segurança:    'Security',
  financeiro:   'Finance',
  programação:  'Engineering',
  conhecimento: 'Knowledge & Strategy',
}

const CATEGORY_LABEL_PT: Record<string, string> = {
  chat:         'Chat & Atendimento',
  vendas:       'Vendas',
  segurança:    'Segurança',
  financeiro:   'Financeiro',
  programação:  'Programação',
  conhecimento: 'Conhecimento & Estratégia',
}

export default function ModelosPage() {
  const { lang } = useLang()
  const t = getT(lang)
  const catLabels = lang === 'en' ? CATEGORY_LABEL_EN : CATEGORY_LABEL_PT

  const activeCount = AGENTS.filter(a => a.active).length

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-ink-0">{t.fleetTitle}</h1>
            <p className="text-[12px] text-ink-5 mt-0.5">{t.activeCount(activeCount, AGENTS.length)}</p>
          </div>
          <div className="flex items-center gap-2 bg-surface border border-border-soft rounded-[8px] px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[12px] text-ink-3">{t.fleetOnline}</span>
          </div>
        </div>

        <div className="px-8 py-6 space-y-8">
          {CATEGORY_ORDER.filter(cat => AGENTS_BY_CATEGORY[cat]?.length).map(cat => (
            <section key={cat}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-6 mb-3 flex items-center gap-2">
                {catLabels[cat] ?? cat}
                <span className="text-ink-7 font-normal normal-case tracking-normal">
                  ({AGENTS_BY_CATEGORY[cat].length})
                </span>
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {AGENTS_BY_CATEGORY[cat].map(agent => (
                  <Link
                    key={agent.id}
                    href={`/chat?agent=${agent.id}`}
                    className="group flex items-center gap-3 bg-surface border border-border-card rounded-[10px] px-4 py-3 hover:border-border-hover hover:shadow-sm transition-all"
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-border-base group-hover:ring-accent/30 transition-all">
                      <Image
                        src={agent.avatar}
                        alt={agent.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-medium text-ink-0 truncate">{agent.name}</p>
                        <span
                          className="w-[6px] h-[6px] rounded-full shrink-0"
                          style={{ backgroundColor: agent.active ? agent.dot : '#9CA3AF' }}
                        />
                      </div>
                      <p className="text-[11px] text-ink-5 truncate">{agent.role}</p>
                      <p className="font-mono text-[9.5px] text-ink-7 mt-0.5">{agent.modelAlias}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

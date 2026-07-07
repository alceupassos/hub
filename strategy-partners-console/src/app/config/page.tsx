'use client'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { NavSidebar } from '@/components/NavSidebar'
import { AgentConfigCard } from '@/components/AgentConfigCard'
import { AGENTS_BY_CATEGORY } from '@/lib/agents'
import { useAgentConfig } from '@/lib/agent-config'
import { useLang } from '@/lib/lang'
import { getT, CATEGORY_T } from '@/lib/i18n'

const CATEGORY_ORDER = ['chat', 'vendas', 'segurança', 'financeiro', 'programação', 'conhecimento']
const TOTAL_AGENTS = Object.values(AGENTS_BY_CATEGORY).reduce((n, list) => n + list.length, 0)

export default function ConfigPage() {
  const { lang } = useLang()
  const t = getT(lang)
  const catT = CATEGORY_T[lang]
  const { enabledCount, enableAll, disableAll } = useAgentConfig()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[17px] font-semibold text-ink-0">{t.configTitle}</h1>
            <p className="text-[12px] text-ink-5 mt-0.5">{t.enabledOfTotal(enabledCount, TOTAL_AGENTS)}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-surface border border-border-input rounded-[8px] px-3 py-2 text-ink-5">
              <Search size={13} strokeWidth={1.6} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t.searchAgents}
                className="text-[12.5px] bg-transparent outline-none placeholder:text-ink-6 w-[160px]"
              />
            </div>
            <button
              onClick={enableAll}
              className="px-[10px] py-[7px] rounded-lg border border-border-input text-[11.5px] text-ink-4 hover:bg-hover-bg transition-colors whitespace-nowrap"
            >
              {t.enableAll}
            </button>
            <button
              onClick={disableAll}
              className="px-[10px] py-[7px] rounded-lg border border-border-input text-[11.5px] text-ink-4 hover:bg-hover-bg transition-colors whitespace-nowrap"
            >
              {t.disableAll}
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-8">
          {CATEGORY_ORDER.map(cat => {
            const agents = (AGENTS_BY_CATEGORY[cat] ?? []).filter(a => {
              if (!q) return true
              return (
                a.name.toLowerCase().includes(q) ||
                a.role.toLowerCase().includes(q) ||
                a.modelAlias.toLowerCase().includes(q)
              )
            })
            if (agents.length === 0) return null

            return (
              <section key={cat}>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-6 mb-3">
                  {catT[cat] ?? cat}
                  <span className="text-ink-7 font-normal normal-case tracking-normal ml-2">({agents.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {agents.map(agent => (
                    <AgentConfigCard key={agent.id} agent={agent} lang={lang} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}

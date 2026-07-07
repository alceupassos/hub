'use client'
import { useEffect, useState } from 'react'
import { NavSidebar } from '@/components/NavSidebar'
import { AGENTS } from '@/lib/agents'
import { BarChart2, MessageSquare, Zap, TrendingUp } from 'lucide-react'
import { useLang } from '@/lib/lang'
import { useAgentConfig } from '@/lib/agent-config'
import { getT } from '@/lib/i18n'

interface Stats {
  totalSessions: number
  avgLatencyMs: number | null
  reasoningPct: number
  topAgents: { agentId: string; sessions: number }[]
}

const DEMO_TOP = [
  { name: 'Consul', sessions: 312 },
  { name: 'NOVAE', sessions: 248 },
  { name: 'TYCEN', sessions: 201 },
  { name: 'MERKO', sessions: 187 },
  { name: 'Counsel', sessions: 134 },
]

const nameOf = (id: string) => AGENTS.find(a => a.id === id)?.name ?? id

export default function RelatoriosPage() {
  const { lang } = useLang()
  const { isEnabled } = useAgentConfig()
  const t = getT(lang)
  const [stats, setStats] = useState<Stats | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(d => {
      if (d.stats) { setStats(d.stats); setLive(true) }
    }).catch(() => {})
  }, [])

  const activeAgents = AGENTS.filter(a => isEnabled(a.id)).length

  // Top agents: real (execution_logs) ou demo
  const topRaw = stats?.topAgents?.length
    ? stats.topAgents.map(a => ({ name: nameOf(a.agentId), sessions: a.sessions }))
    : DEMO_TOP
  const maxSessions = Math.max(...topRaw.map(a => a.sessions), 1)
  const TOP_AGENTS = topRaw.map(a => ({ ...a, pct: Math.round((a.sessions / maxSessions) * 100) }))

  const METRICS = [
    { label: t.totalSessions,  value: stats ? stats.totalSessions.toLocaleString('pt-BR') : '1.284', delta: live ? '' : '+12%', icon: MessageSquare, color: '#0B3A78' },
    { label: t.agentsActive,   value: String(activeAgents), delta: `${t.of} ${AGENTS.length}`, icon: Zap, color: '#10B981' },
    { label: t.avgLatency,     value: stats?.avgLatencyMs != null ? `${(stats.avgLatencyMs / 1000).toFixed(2)}s` : '1.42s', delta: live ? '' : '-8%', icon: TrendingUp, color: '#F97316' },
    { label: t.reasoningUsed,  value: stats ? `${stats.reasoningPct}%` : '23%', delta: t.ofSessions, icon: BarChart2, color: '#8B5CF6' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border-base bg-surface px-8 py-5">
          <h1 className="text-[17px] font-semibold text-ink-0">{t.pageReports}</h1>
          <p className="text-[12px] text-ink-5 mt-0.5">{live ? (lang === 'en' ? 'Live data from execution logs' : 'Dados reais dos logs de execução') : `${t.reportSubtitle} · ${lang === 'en' ? 'demo' : 'demonstração'}`}</p>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS.map(m => (
              <div key={m.label} className="bg-surface border border-border-card rounded-[10px] p-5">
                <div
                  className="w-9 h-9 rounded-[8px] flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${m.color}20` }}
                >
                  <m.icon size={16} strokeWidth={1.6} style={{ color: m.color }} />
                </div>
                <p className="text-[22px] font-semibold text-ink-0">{m.value}</p>
                <p className="text-[11.5px] text-ink-5 mt-0.5">{m.label}</p>
                <p className="text-[11px] font-mono text-ink-6 mt-1">{m.delta}</p>
              </div>
            ))}
          </div>

          <div className="bg-surface border border-border-card rounded-[10px] p-5">
            <h2 className="text-[13px] font-semibold text-ink-0 mb-4">{t.topAgents}</h2>
            <div className="space-y-3">
              {TOP_AGENTS.map((agent, i) => (
                <div key={agent.name} className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-ink-6 w-4 text-right">{i + 1}</span>
                  <span className="text-[13px] text-ink-2 w-28">{agent.name}</span>
                  <div className="flex-1 h-[6px] bg-track rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${agent.pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-ink-5 w-12 text-right">{agent.sessions}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

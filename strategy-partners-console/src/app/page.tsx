'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NavSidebar } from '@/components/NavSidebar'
import { ConsoleHeader } from '@/components/ConsoleHeader'
import { ComparareView, FleetVitalsBar } from '@/components/ComparareView'
import { SinteseView } from '@/components/SinteseView'
import { TimelineView } from '@/components/TimelineView'
import { ComposerBar } from '@/components/ComposerBar'
import { Inspector } from '@/components/Inspector'
import { AGENTS } from '@/lib/agents'
import type { Tab, Model } from '@/lib/types'
import { useLang } from '@/lib/lang'
import { getT } from '@/lib/i18n'
import { EntryVideoModal } from '@/components/EntryVideoModal'

function agentsToModels(agents: typeof AGENTS): Model[] {
  return agents.map(a => ({
    id: a.id,
    name: a.name,
    dot: a.dot,
    barColor: a.barColor,
    stance: a.category,
    text: a.role,
    conf: 0,
    dur: 0,
    on: a.active,
  }))
}

export default function ConsolePage() {
  const [tab, setTab] = useState<Tab>('comparar')
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [models, setModels] = useState<Model[]>(agentsToModels(AGENTS))
  const { lang } = useLang()
  const t = getT(lang)

  // ── Maestro Mode state ────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false)
  const [liveQuestion, setLiveQuestion] = useState('')
  const [agentTexts, setAgentTexts] = useState<Record<string, string>>({})
  const [agentLoading, setAgentLoading] = useState<Record<string, boolean>>({})
  const [agentConf, setAgentConf] = useState<Record<string, number>>({})
  const [agentModels, setAgentModels] = useState<Record<string, string>>({})
  const [synthesis, setSynthesis] = useState('')
  const [synthLoading, setSynthLoading] = useState(false)
  const [participatingIds, setParticipatingIds] = useState<string[]>([])
  const [sessionHistory, setSessionHistory] = useState<
    { avgConf: number; agentCount: number; ts: number }[]
  >([])

  const activeModels = models.filter(m => m.on)
  const activeCount = activeModels.length

  const toggleModel = (id: string) =>
    setModels(prev => prev.map(m => (m.id === id ? { ...m, on: !m.on } : m)))

  const toggleInspector = () => setInspectorOpen(prev => !prev)

  async function handleMaestroQuery(q: string) {
    if (!q.trim() || isRunning || activeModels.length === 0) return
    setIsRunning(true)
    setTab('comparar')
    setLiveQuestion(q)
    setAgentTexts({})
    setAgentConf({})
    setAgentModels({})
    setSynthesis('')

    const ids = activeModels.map(m => m.id)
    setParticipatingIds(ids)
    setAgentLoading(Object.fromEntries(ids.map(id => [id, true])))

    // Parallel queries — each resolves independently to update cards as they arrive
    const responses = await Promise.all(
      ids.map(async (agentId) => {
        try {
          const res = await fetch('/api/agent-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId, question: q, lang }),
          })
          const data = (await res.json()) as { response?: string; confidence?: number; model?: string }
          setAgentLoading(prev => ({ ...prev, [agentId]: false }))
          setAgentTexts(prev => ({ ...prev, [agentId]: data.response ?? '' }))
          setAgentConf(prev => ({ ...prev, [agentId]: data.confidence ?? 75 }))
          if (data.model) setAgentModels(prev => ({ ...prev, [agentId]: data.model! }))
          const agentName = activeModels.find(m => m.id === agentId)?.name ?? agentId
          return { agentId, agentName, response: data.response ?? '' }
        } catch {
          setAgentLoading(prev => ({ ...prev, [agentId]: false }))
          return { agentId, agentName: agentId, response: '' }
        }
      }),
    )

    // Maestro synthesis
    setSynthLoading(true)
    try {
      const synRes = await fetch('/api/maestro-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, agentResponses: responses.filter(r => r.response), lang }),
      })
      const synData = (await synRes.json()) as { synthesis?: string }
      setSynthesis(synData.synthesis ?? '')
      // Record session in Fleet Vitals history
      const allConfs = Object.values(agentConf)
      if (allConfs.length > 0) {
        const avg = allConfs.reduce((s, v) => s + v, 0) / allConfs.length
        setSessionHistory(prev => [
          ...prev,
          { avgConf: avg, agentCount: ids.length, ts: Date.now() },
        ])
      }
    } catch {}
    setSynthLoading(false)
    setIsRunning(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <EntryVideoModal />
      <NavSidebar />

      {/* Center column */}
      <div className="flex flex-1 flex-col min-w-0">
        <ConsoleHeader
          tab={tab}
          setTab={setTab}
          inspectorOpen={inspectorOpen}
          toggleInspector={toggleInspector}
        />

        {/* Quick navigation strip */}
        <div className="shrink-0 flex items-center gap-[2px] px-[18px] py-[5px] border-b border-border-div bg-surface">
          {[
            { href: '/modelos',      label: t.fleetTitle },
            { href: '/projetos',     label: t.pageProjects },
            { href: '/relatorios',   label: t.pageReports },
            { href: '/conhecimento', label: t.pageKnowledge },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-mono text-[10.5px] text-ink-7 hover:text-ink-3 hover:bg-hover-bg px-[8px] py-[3px] rounded-[5px] transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        <FleetVitalsBar sessionHistory={sessionHistory} />

        <div className="flex-1 overflow-y-auto p-[18px]">
          <div className="max-w-[900px] mx-auto">
            {tab === 'comparar' && (
              <ComparareView
                activeModels={activeModels}
                activeCount={activeCount}
                t={t}
                liveQuestion={liveQuestion || undefined}
                agentTexts={agentTexts}
                agentLoading={agentLoading}
                agentConf={agentConf}
                agentModels={agentModels}
                synthesis={synthesis || undefined}
                synthLoading={synthLoading}
                participatingIds={participatingIds.length ? participatingIds : undefined}
              />
            )}
            {tab === 'sintese' && <SinteseView activeModels={activeModels} t={t} />}
            {tab === 'timeline' && <TimelineView activeModels={activeModels} t={t} />}
          </div>
        </div>

        <ComposerBar
          activeModels={activeModels}
          activeCount={activeCount}
          onSubmit={handleMaestroQuery}
          isRunning={isRunning}
        />
      </div>

      <Inspector
        open={inspectorOpen}
        models={models}
        activeCount={activeCount}
        toggleModel={toggleModel}
        toggleInspector={toggleInspector}
      />
    </div>
  )
}

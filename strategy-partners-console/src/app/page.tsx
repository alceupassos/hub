'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { NavSidebar } from '@/components/NavSidebar'
import { ConsoleHeader } from '@/components/ConsoleHeader'
import { ComparareView, FleetVitalsBar } from '@/components/ComparareView'
import { SinteseView } from '@/components/SinteseView'
import { TimelineView } from '@/components/TimelineView'
import { ComposerBar } from '@/components/ComposerBar'
import { Inspector } from '@/components/Inspector'
import { AgentSelectionModal } from '@/components/AgentSelectionModal'
import { SwarmModal } from '@/components/SwarmModal'
import { AGENTS } from '@/lib/agents'
import type { Agent } from '@/lib/types'
import type { Tab, Model, VerifyResult, VerifyState, AgentSelectionResult } from '@/lib/types'
import { useLang } from '@/lib/lang'
import { useAgentConfig } from '@/lib/agent-config'
import { getT } from '@/lib/i18n'

// fetch com timeout — garante que uma requisição travada não deixe a análise pendurada para sempre
async function fetchWithTimeout(input: string, init: RequestInit, ms = 45000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(input, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

function agentToModel(a: Agent, getName: (id: string) => string): Model {
  return {
    id: a.id,
    name: getName(a.id),
    dot: a.dot,
    barColor: a.barColor,
    stance: a.category,
    text: a.role,
    conf: 0,
    dur: 0,
    on: a.active, // inicia ativo só quem tem active:true (os 5 principais)
  }
}

function agentsToModels(agents: Agent[], getName: (id: string) => string): Model[] {
  return agents.map(a => agentToModel(a, getName))
}

export default function ConsolePage() {
  const [tab, setTab] = useState<Tab>('comparar')
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const { lang } = useLang()
  const { enabledAgents, getDisplayName, getPersonaOverride } = useAgentConfig()
  const [models, setModels] = useState<Model[]>(() => agentsToModels(enabledAgents, getDisplayName))
  const t = getT(lang)

  // Reconcile the transient per-query "on" toggles against the persisted /config roster:
  // keep existing on/off state for agents that remain enabled, add newly-enabled ones as
  // "on" by default, drop ones that got disabled, and pick up renames.
  useEffect(() => {
    setModels(prev =>
      enabledAgents.map(a => {
        const existing = prev.find(m => m.id === a.id)
        return existing ? { ...existing, name: getDisplayName(a.id) } : agentToModel(a, getDisplayName)
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledAgents, getDisplayName])

  // ── Maestro Mode state ────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false)
  const [showSwarm, setShowSwarm] = useState(false)
  const [liveQuestion, setLiveQuestion] = useState('')
  const [agentTexts, setAgentTexts] = useState<Record<string, string>>({})
  const [agentLoading, setAgentLoading] = useState<Record<string, boolean>>({})
  const [agentConf, setAgentConf] = useState<Record<string, number>>({})
  const [agentModels, setAgentModels] = useState<Record<string, string>>({})
  const [synthesis, setSynthesis] = useState('')
  const [synthLoading, setSynthLoading] = useState(false)
  const [participatingIds, setParticipatingIds] = useState<string[]>([])
  const [agentTimings, setAgentTimings] = useState<Record<string, number>>({})
  const [agentVerify, setAgentVerify] = useState<Record<string, VerifyState>>({})
  const [sessionHistory, setSessionHistory] = useState<
    { avgConf: number; agentCount: number; ts: number }[]
  >([])

  // ── Discovery Questions state ─────────────────────────────────────────────
  const [discoveryMode, setDiscoveryMode] = useState(true)
  const [discoveryPhase, setDiscoveryPhase] = useState<'idle' | 'loading' | 'answering' | 'done'>('idle')
  const [discoveryQuestions, setDiscoveryQuestions] = useState<string[]>([])
  const [pendingQuestion, setPendingQuestion] = useState('')

  // ── Agent Selection state ─────────────────────────────────────────────────
  const [selectionPhase, setSelectionPhase] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [agentSelection, setAgentSelection] = useState<AgentSelectionResult | null>(null)
  const [enrichedPending, setEnrichedPending] = useState('')

  const activeModels = models.filter(m => m.on)
  const activeCount = activeModels.length

  const toggleModel = (id: string) =>
    setModels(prev => prev.map(m => (m.id === id ? { ...m, on: !m.on } : m)))

  const toggleInspector = () => setInspectorOpen(prev => !prev)

  function buildEnrichedQuestion(original: string, questions: string[], answers: string[]): string {
    if (!questions.length) return original
    const qa = questions.map((q, i) => `${q}\n${answers[i] ?? ''}`).join('\n\n')
    return `${original}\n\n---\nContexto adicional:\n${qa}`
  }

  async function handleComposerSubmit(q: string) {
    if (!discoveryMode) {
      await handleMaestroQuery(q)
      return
    }
    setPendingQuestion(q)
    setDiscoveryPhase('loading')
    setDiscoveryQuestions([])
    try {
      const res = await fetch('/api/discovery-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, lang }),
      })
      const data = (await res.json()) as { questions?: string[] }
      const qs = data.questions ?? []
      if (qs.length === 0) {
        // No questions generated — run directly
        setDiscoveryPhase('idle')
        await handleMaestroQuery(q)
      } else {
        setDiscoveryQuestions(qs)
        setDiscoveryPhase('answering')
      }
    } catch {
      setDiscoveryPhase('idle')
      await handleMaestroQuery(q)
    }
  }

  async function handleDiscoveryComplete(answers: string[]) {
    const enriched = buildEnrichedQuestion(pendingQuestion, discoveryQuestions, answers)
    setEnrichedPending(enriched)
    setDiscoveryPhase('done')

    setSelectionPhase('loading')
    try {
      const res = await fetch('/api/agent-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: enriched,
          agents: activeModels.map(m => {
            const a = AGENTS.find(ag => ag.id === m.id)
            return { id: m.id, name: m.name, role: a?.role ?? '', category: a?.category ?? '' }
          }),
          lang,
        }),
      })
      const data = (await res.json()) as AgentSelectionResult
      setAgentSelection(data)
      setSelectionPhase('ready')
    } catch {
      setAgentSelection({ selected: activeModels.map(m => m.id), excluded: [] })
      setSelectionPhase('ready')
    }
  }

  async function handleSelectionConfirm(finalIds: string[]) {
    setSelectionPhase('idle')
    setAgentSelection(null)
    setDiscoveryPhase('idle')
    await handleMaestroQuery(enrichedPending, pendingQuestion, finalIds)
  }

  async function handleMaestroQuery(q: string, displayQ?: string, overrideIds?: string[]) {
    if (!q.trim() || isRunning || activeModels.length === 0) return
    setIsRunning(true)
    setShowSwarm(true) // abre o modal de execução ao vivo
    setTab('comparar')
    setLiveQuestion(displayQ ?? q)
    setAgentTexts({})
    setAgentConf({})
    setAgentModels({})
    setAgentTimings({})
    setAgentVerify({})
    setSynthesis('')

    const ids = overrideIds ?? activeModels.map(m => m.id)
    setParticipatingIds(ids)
    setAgentLoading(Object.fromEntries(ids.map(id => [id, true])))

    // Parallel queries — each resolves independently to update cards as they arrive
    const responses = await Promise.all(
      ids.map(async (agentId) => {
        const t0 = Date.now()
        try {
          const res = await fetchWithTimeout('/api/agent-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId, question: q, lang, personaOverride: getPersonaOverride(agentId) }),
          })
          const data = (await res.json()) as { response?: string; confidence?: number; model?: string }
          const elapsed = (Date.now() - t0) / 1000
          const agentName = activeModels.find(m => m.id === agentId)?.name ?? agentId
          const agentResponse = data.response ?? ''
          setAgentLoading(prev => ({ ...prev, [agentId]: false }))
          setAgentTimings(prev => ({ ...prev, [agentId]: elapsed }))
          setAgentTexts(prev => ({ ...prev, [agentId]: agentResponse }))
          setAgentConf(prev => ({ ...prev, [agentId]: data.confidence ?? 75 }))
          if (data.model) setAgentModels(prev => ({ ...prev, [agentId]: data.model! }))

          // Fire double-check in background (non-blocking)
          if (agentResponse) {
            setAgentVerify(prev => ({
              ...prev,
              [agentId]: { verdict: 'review', score: 60, issues: [], loading: true },
            }))
            fetch('/api/verify-response', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agentName, question: q, response: agentResponse, lang }),
            })
              .then(r => r.json())
              .then((v: VerifyResult) => {
                setAgentVerify(prev => ({
                  ...prev,
                  [agentId]: { ...v, loading: false },
                }))
              })
              .catch(() => {
                setAgentVerify(prev => ({
                  ...prev,
                  [agentId]: { verdict: 'review', score: 60, issues: [], loading: false },
                }))
              })
          }

          return { agentId, agentName, response: agentResponse }
        } catch {
          // Timeout/erro: NUNCA deixar o agente girando. Encerra o card com estado claro.
          const agentName = activeModels.find(m => m.id === agentId)?.name ?? agentId
          const elapsed = (Date.now() - t0) / 1000
          setAgentLoading(prev => ({ ...prev, [agentId]: false }))
          setAgentTimings(prev => ({ ...prev, [agentId]: elapsed }))
          setAgentTexts(prev => ({ ...prev, [agentId]: prev[agentId] || (lang === 'en' ? '⚠ No response in time. Try again or refine the question.' : '⚠ Sem resposta a tempo. Tente novamente ou refine a pergunta.') }))
          setAgentConf(prev => ({ ...prev, [agentId]: prev[agentId] ?? 0 }))
          return { agentId, agentName, response: '' }
        }
      }),
    )

    // Maestro synthesis — timeout generoso (payload grande com N agentes) e fallback claro:
    // a síntese NUNCA fica pendurada; se falhar/vazia, mostra mensagem em vez do placeholder eterno.
    setSynthLoading(true)
    const answered = responses.filter(r => r.response)
    const fallbackSyn = lang === 'en'
      ? '> The consolidated synthesis could not be generated this time. The individual agent analyses above remain valid — refine the question or run again to retry.'
      : '> A síntese consolidada não pôde ser gerada desta vez. As análises individuais dos agentes acima permanecem válidas — refine a pergunta ou rode novamente para tentar de novo.'
    try {
      if (answered.length === 0) {
        setSynthesis(fallbackSyn)
      } else {
        const synRes = await fetchWithTimeout('/api/maestro-synthesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, agentResponses: answered, lang }),
        }, 120000)
        const synData = (await synRes.json()) as { synthesis?: string }
        setSynthesis(synData.synthesis?.trim() ? synData.synthesis : fallbackSyn)
      }
      const allConfs = Object.values(agentConf)
      if (allConfs.length > 0) {
        const avg = allConfs.reduce((s, v) => s + v, 0) / allConfs.length
        setSessionHistory(prev => [...prev, { avgConf: avg, agentCount: ids.length, ts: Date.now() }])
      }
    } catch {
      setSynthesis(fallbackSyn)
    } finally {
      setSynthLoading(false)
      setIsRunning(false)
    }
  }

  function handleExport() {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    let content = ''
    let filename = ''

    if (tab === 'sintese') {
      filename = `sintese-${now}.md`
      content = [
        `# Síntese Estratégica — Maestro`,
        `**Pergunta:** ${liveQuestion || '(sem pergunta)'}`,
        `**Gerado em:** ${now}`,
        `**Agentes consultados:** ${activeModels.map(m => m.name).join(', ')}`,
        '',
        synthesis || '(síntese ainda não gerada)',
      ].join('\n')
    } else if (tab === 'timeline') {
      filename = `timeline-${now}.md`
      const rows = activeModels
        .map(m => `| ${m.name} | ${agentTimings[m.id] != null ? agentTimings[m.id].toFixed(2) + 's' : '—'} |`)
        .join('\n')
      content = [
        `# Timeline de Execução Paralela`,
        `**Pergunta:** ${liveQuestion || '(sem pergunta)'}`,
        `**Gerado em:** ${now}`,
        '',
        '| Agente | Tempo de resposta |',
        '|--------|-------------------|',
        rows,
      ].join('\n')
    } else {
      filename = `comparacao-${now}.md`
      const sections = activeModels.map(m => [
        `## ${m.name}`,
        agentTexts[m.id] || '(sem resposta)',
      ].join('\n')).join('\n\n')
      content = [
        `# Comparação de Agentes`,
        `**Pergunta:** ${liveQuestion || '(sem pergunta)'}`,
        `**Gerado em:** ${now}`,
        '',
        sections,
        '',
        '---',
        '',
        '## Síntese — Maestro',
        synthesis || '(síntese ainda não gerada)',
      ].join('\n')
    }

    const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">

      {selectionPhase === 'ready' && agentSelection && (
        <AgentSelectionModal
          selected={agentSelection.selected}
          excluded={agentSelection.excluded}
          allAgents={enabledAgents}
          lang={lang}
          onConfirm={handleSelectionConfirm}
          onCancel={() => { setSelectionPhase('idle'); setDiscoveryPhase('idle') }}
        />
      )}

      <SwarmModal
        open={showSwarm}
        onClose={() => setShowSwarm(false)}
        models={models}
        participatingIds={participatingIds}
        agentLoading={agentLoading}
        agentTimings={agentTimings}
        agentTexts={agentTexts}
        synthLoading={synthLoading}
        synthesis={synthesis}
        question={liveQuestion}
      />

      {/* Reabrir o modal de execução enquanto roda */}
      {isRunning && !showSwarm && (
        <button
          onClick={() => setShowSwarm(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-accent text-white text-[12px] font-medium px-4 py-2.5 rounded-full shadow-lg hover:opacity-90"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          {lang === 'en' ? 'Live execution' : 'Execução ao vivo'}
        </button>
      )}

      <NavSidebar />

      {/* Center column */}
      <div className="flex flex-1 flex-col min-w-0">
        <ConsoleHeader
          tab={tab}
          setTab={setTab}
          inspectorOpen={inspectorOpen}
          toggleInspector={toggleInspector}
          onExport={handleExport}
          discoveryMode={discoveryMode}
          onToggleDiscovery={() => setDiscoveryMode(v => !v)}
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

        <div className="flex-1 min-h-0 overflow-y-auto p-[18px]">
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
                agentVerify={agentVerify}
                synthesis={synthesis || undefined}
                synthLoading={synthLoading}
                participatingIds={participatingIds.length ? participatingIds : undefined}
              />
            )}
            {tab === 'sintese' && (
              <SinteseView
                activeModels={activeModels}
                agentConf={agentConf}
                question={liveQuestion}
                synthesis={synthesis}
                synthLoading={synthLoading}
                t={t}
              />
            )}
            {tab === 'timeline' && (
              <TimelineView
                activeModels={activeModels}
                agentTimings={agentTimings}
                question={liveQuestion}
                t={t}
              />
            )}
          </div>
        </div>

        <ComposerBar
          activeModels={activeModels}
          activeCount={activeCount}
          onSubmit={handleComposerSubmit}
          isRunning={isRunning}
          discoveryPhase={discoveryPhase}
          discoveryQuestions={discoveryQuestions}
          onDiscoveryComplete={handleDiscoveryComplete}
          selectionLoading={selectionPhase === 'loading'}
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

'use client'
import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import { AGENTS } from './agents'
import type { Agent } from './types'

// v2: invalida config antiga persistida (que deixava todos ativos) → aplica o novo default
// (só os 5 principais ativos). Bump this key whenever the default roster changes.
const STORAGE_KEY = 'sp-agent-config-v2'

interface StoredConfig {
  enabled: string[]
  names: Record<string, string>
  descriptions: Record<string, string>
}

interface AgentConfigCtx {
  isEnabled: (id: string) => boolean
  toggleAgent: (id: string) => void
  enableAll: () => void
  disableAll: () => void
  enabledAgents: Agent[]
  enabledCount: number
  getDisplayName: (id: string) => string
  setAgentName: (id: string, name: string) => void
  resetAgentName: (id: string) => void
  getPersonaOverride: (id: string) => string | undefined
  setPersonaOverride: (id: string, text: string) => void
  resetPersonaOverride: (id: string) => void
  hydrated: boolean
}

const ALL_IDS = AGENTS.map(a => a.id)
const NAME_BY_ID: Record<string, string> = Object.fromEntries(AGENTS.map(a => [a.id, a.name]))

const defaultCtx: AgentConfigCtx = {
  isEnabled: () => true,
  toggleAgent: () => {},
  enableAll: () => {},
  disableAll: () => {},
  enabledAgents: AGENTS,
  enabledCount: AGENTS.length,
  getDisplayName: (id: string) => NAME_BY_ID[id] ?? id,
  setAgentName: () => {},
  resetAgentName: () => {},
  getPersonaOverride: () => undefined,
  setPersonaOverride: () => {},
  resetPersonaOverride: () => {},
  hydrated: false,
}

const AgentConfigContext = createContext<AgentConfigCtx>(defaultCtx)

export function AgentConfigProvider({ children }: { children: ReactNode }) {
  // Default: every agent enabled, no renames/description overrides — deterministic on
  // server and first client render so hydration never mismatches (localStorage is only
  // read in the effect below).
  const [enabled, setEnabledState] = useState<Set<string>>(() => new Set(ALL_IDS))
  const [names, setNamesState] = useState<Record<string, string>>({})
  const [descriptions, setDescriptionsState] = useState<Record<string, string>>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StoredConfig>
        const validEnabled = Array.isArray(parsed.enabled)
          ? parsed.enabled.filter(id => ALL_IDS.includes(id))
          : ALL_IDS
        const validNames =
          parsed.names && typeof parsed.names === 'object'
            ? Object.fromEntries(Object.entries(parsed.names).filter(([id]) => ALL_IDS.includes(id)))
            : {}
        const validDescriptions =
          parsed.descriptions && typeof parsed.descriptions === 'object'
            ? Object.fromEntries(Object.entries(parsed.descriptions).filter(([id]) => ALL_IDS.includes(id)))
            : {}
        setEnabledState(new Set(validEnabled))
        setNamesState(validNames)
        setDescriptionsState(validDescriptions)
      }
    } catch {
      // Corrupted storage — keep the all-enabled, no-overrides default.
    }
    setHydrated(true)
  }, [])

  function persist(nextEnabled: Set<string>, nextNames: Record<string, string>, nextDescriptions: Record<string, string>) {
    setEnabledState(nextEnabled)
    setNamesState(nextNames)
    setDescriptionsState(nextDescriptions)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: [...nextEnabled], names: nextNames, descriptions: nextDescriptions }),
    )
  }

  function toggleAgent(id: string) {
    setEnabledState(prevEnabled => {
      const next = new Set(prevEnabled)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: [...next], names, descriptions }))
      return next
    })
  }

  function enableAll() {
    persist(new Set(ALL_IDS), names, descriptions)
  }

  function disableAll() {
    persist(new Set(), names, descriptions)
  }

  function setAgentName(id: string, name: string) {
    const trimmed = name.trim()
    const nextNames = { ...names }
    if (trimmed && trimmed !== NAME_BY_ID[id]) nextNames[id] = trimmed
    else delete nextNames[id]
    persist(enabled, nextNames, descriptions)
  }

  function resetAgentName(id: string) {
    const nextNames = { ...names }
    delete nextNames[id]
    persist(enabled, nextNames, descriptions)
  }

  function setPersonaOverride(id: string, text: string) {
    const trimmed = text.trim()
    const nextDescriptions = { ...descriptions }
    if (trimmed) nextDescriptions[id] = trimmed
    else delete nextDescriptions[id]
    persist(enabled, names, nextDescriptions)
  }

  function resetPersonaOverride(id: string) {
    const nextDescriptions = { ...descriptions }
    delete nextDescriptions[id]
    persist(enabled, names, nextDescriptions)
  }

  const enabledAgents = useMemo(() => AGENTS.filter(a => enabled.has(a.id)), [enabled])
  const getDisplayName = (id: string) => names[id] ?? NAME_BY_ID[id] ?? id
  const getPersonaOverride = (id: string) => descriptions[id]

  const value = useMemo<AgentConfigCtx>(
    () => ({
      isEnabled: (id: string) => enabled.has(id),
      toggleAgent,
      enableAll,
      disableAll,
      enabledAgents,
      enabledCount: enabledAgents.length,
      getDisplayName,
      setAgentName,
      resetAgentName,
      getPersonaOverride,
      setPersonaOverride,
      resetPersonaOverride,
      hydrated,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, names, descriptions, enabledAgents, hydrated],
  )

  return <AgentConfigContext.Provider value={value}>{children}</AgentConfigContext.Provider>
}

export function useAgentConfig(): AgentConfigCtx {
  return useContext(AgentConfigContext)
}

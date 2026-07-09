'use client'
import { useCallback, useEffect, useState } from 'react'

// Lightweight client-side preferences (localStorage-backed booleans). No provider —
// each hook instance keeps itself in sync via the `storage` event so a toggle in one
// place (e.g. a settings panel) is reflected wherever the flag is read.

const KEY = {
  /** Orchestrator suggests activating extra specialists for the challenge. Default OFF. */
  agentSuggestions: 'sp-pref-agent-suggestions',
} as const

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  const raw = window.localStorage.getItem(key)
  if (raw === '1') return true
  if (raw === '0') return false
  return fallback
}

function useBoolPref(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(fallback)

  useEffect(() => {
    setValue(readBool(key, fallback))
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(readBool(key, fallback))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, fallback])

  const set = useCallback(
    (v: boolean) => {
      setValue(v)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, v ? '1' : '0')
        // Notify same-tab listeners (the native 'storage' event only fires cross-tab).
        window.dispatchEvent(new StorageEvent('storage', { key }))
      }
    },
    [key],
  )

  return [value, set]
}

/** Whether the orchestrator proposes extra specialists for the challenge. Default OFF. */
export function useAgentSuggestionsPref(): [boolean, (v: boolean) => void] {
  return useBoolPref(KEY.agentSuggestions, false)
}

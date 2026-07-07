'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Circle, Pencil, RotateCcw, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import type { Agent } from '@/lib/types'
import type { Lang } from '@/lib/lang'
import { useAgentConfig } from '@/lib/agent-config'
import { getT } from '@/lib/i18n'
import { AGENTS } from '@/lib/agents'
import { splitPersonaText } from '@/lib/personaSections'
import { Switch } from './ui/Switch'

interface Props {
  agent: Agent
  lang: Lang
}

export function AgentConfigCard({ agent, lang }: Props) {
  const {
    isEnabled, toggleAgent, getDisplayName, setAgentName, resetAgentName,
    getPersonaOverride, setPersonaOverride, resetPersonaOverride,
  } = useAgentConfig()
  const t = getT(lang)
  const enabled = isEnabled(agent.id)
  const displayName = getDisplayName(agent.id)
  const isRenamed = displayName !== agent.name
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(displayName)

  function commit() {
    setAgentName(agent.id, draft)
    setEditing(false)
  }

  // ── Full persona description editor ─────────────────────────────────────────
  const override = getPersonaOverride(agent.id)
  const [descOpen, setDescOpen] = useState(false)
  const [descLoading, setDescLoading] = useState(false)
  const [descError, setDescError] = useState(false)
  const [original, setOriginal] = useState<string | null>(null)
  const [draftDesc, setDraftDesc] = useState(override ?? '')

  async function openDescription() {
    setDescOpen(true)
    if (original !== null) return
    setDescLoading(true)
    setDescError(false)
    try {
      const personaIndex = AGENTS.findIndex(a => a.id === agent.id)
      const res = await fetch(`/personas/PERSONA${personaIndex + 1}.md`)
      if (!res.ok) throw new Error('not ok')
      const raw = await res.text()
      const { editable } = splitPersonaText(raw)
      setOriginal(editable)
      if (!override) setDraftDesc(editable)
    } catch {
      setDescError(true)
      setOriginal('')
    } finally {
      setDescLoading(false)
    }
  }

  function saveDescription() {
    setPersonaOverride(agent.id, draftDesc)
  }

  function cancelDescriptionEdit() {
    setDraftDesc(override ?? original ?? '')
  }

  function restoreDescription() {
    resetPersonaOverride(agent.id)
    setDraftDesc(original ?? '')
  }

  return (
    <div
      className={`bg-surface border border-border-card rounded-[10px] p-[14px] flex flex-col gap-[10px] transition-opacity ${
        enabled ? '' : 'opacity-50'
      }`}
    >
      <div className="flex items-start gap-[10px]">
        <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-border-base">
          <Image src={agent.avatar} alt={agent.name} fill className="object-cover" sizes="36px" />
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-[4px]">
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') setEditing(false)
                }}
                onBlur={commit}
                placeholder={agent.name}
                className="w-full text-[13px] font-semibold text-ink-0 bg-transparent border-b border-accent outline-none"
              />
              <button onMouseDown={e => e.preventDefault()} onClick={commit} className="text-accent shrink-0">
                <Check size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-[5px]">
              <p className="text-[13px] font-semibold text-ink-0 truncate">{displayName}</p>
              <button
                onClick={() => {
                  setDraft(displayName)
                  setEditing(true)
                }}
                title={t.renameAgent}
                className="shrink-0 text-ink-7 hover:text-accent transition-colors"
              >
                <Pencil size={11} />
              </button>
              {isRenamed && (
                <button
                  onClick={() => resetAgentName(agent.id)}
                  title={t.resetName}
                  className="shrink-0 text-ink-7 hover:text-accent transition-colors"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>
          )}
          <p className="font-mono text-[9.5px] text-ink-7 leading-tight truncate">
            {agent.modelAlias}
            {isRenamed ? ` · ${agent.name}` : ''}
          </p>
        </div>

        <Switch checked={enabled} onCheckedChange={() => toggleAgent(agent.id)} ariaLabel={agent.name} />
      </div>

      <p className="text-[11px] text-ink-6 italic leading-snug">{agent.role}</p>

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

      {/* Full persona description — editable, feeds the real system prompt */}
      <div className="border-t border-border-div pt-[8px]">
        <button
          onClick={() => (descOpen ? setDescOpen(false) : openDescription())}
          className="flex items-center gap-[4px] text-[10.5px] font-medium text-accent hover:opacity-80 transition-opacity"
        >
          {descOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {descOpen ? t.hideFullDescription : t.showFullDescription}
          {override && <span className="font-mono text-[9px] text-ink-7">●</span>}
        </button>

        {descOpen && (
          <div className="mt-[8px] flex flex-col gap-[6px]">
            {descLoading ? (
              <p className="text-[10.5px] text-ink-6 py-2">…</p>
            ) : (
              <>
                {descError && (
                  <p className="flex items-center gap-[5px] text-[10px] text-amber-600">
                    <AlertTriangle size={11} className="shrink-0" />
                    {t.descriptionLoadError}
                  </p>
                )}
                <textarea
                  value={draftDesc}
                  onChange={e => setDraftDesc(e.target.value)}
                  rows={10}
                  className="w-full text-[11px] leading-[1.5] text-ink-1 bg-app-bg border border-border-input rounded-[7px] px-[10px] py-[8px] outline-none focus:border-accent resize-y font-mono"
                />
                <p className="text-[9.5px] text-ink-7 leading-snug">{t.descriptionSavedHint}</p>
                <div className="flex items-center gap-[6px]">
                  <button
                    onClick={saveDescription}
                    className="px-[10px] py-[5px] rounded-[6px] bg-accent text-white text-[10.5px] font-medium hover:opacity-90 transition-opacity"
                  >
                    {t.saveDescription}
                  </button>
                  <button
                    onClick={cancelDescriptionEdit}
                    className="px-[10px] py-[5px] rounded-[6px] border border-border-input text-[10.5px] text-ink-4 hover:bg-hover-bg transition-colors"
                  >
                    {t.cancelEdit}
                  </button>
                  {override && (
                    <button
                      onClick={restoreDescription}
                      className="ml-auto flex items-center gap-[4px] text-[10.5px] text-ink-6 hover:text-accent transition-colors"
                    >
                      <RotateCcw size={11} />
                      {t.restoreOriginalDescription}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

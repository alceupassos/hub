'use client'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/lang'

interface FleetAgent {
  id: string
  name: string
  dot?: string
}

interface Props {
  activeModels: FleetAgent[]
  /** If provided, overrides the internal mount-based timer (ms). */
  elapsedMs?: number
}

const STEPS: Record<'pt' | 'en', string[]> = {
  pt: [
    'Reunindo respostas do time',
    'Cruzando riscos',
    'Triangulando valuation',
    'Redigindo o memorando',
  ],
  en: [
    'Gathering the team responses',
    'Cross-checking risks',
    'Triangulating valuation',
    'Drafting the memorandum',
  ],
}

const COPY = {
  pt: { synth: 'sintetizando', heading: 'O time está trabalhando' },
  en: { synth: 'synthesizing', heading: 'The team is at work' },
} as const

/**
 * SynthesisPulse — reassuring animated indicator shown WHILE the multi-agent
 * synthesis is loading. Shows the participating agents lighting up in sequence,
 * an indeterminate shimmer bar (no fake %), an elapsed-time counter and a
 * rotating set of step captions. Pure CSS, respects prefers-reduced-motion.
 */
export function SynthesisPulse({ activeModels, elapsedMs }: Props) {
  const { lang } = useLang()
  const L = lang === 'en' ? 'en' : 'pt'

  // Internal timer (started on mount) unless a value is passed in.
  const startRef = useRef<number>(Date.now())
  const [internalMs, setInternalMs] = useState(0)
  useEffect(() => {
    if (elapsedMs != null) return
    startRef.current = Date.now()
    const id = setInterval(() => setInternalMs(Date.now() - startRef.current), 250)
    return () => clearInterval(id)
  }, [elapsedMs])

  const ms = elapsedMs != null ? elapsedMs : internalMs
  const seconds = Math.floor(ms / 1000)

  // Rotate the reassuring caption every ~3.2s.
  const steps = STEPS[L]
  const [stepIdx, setStepIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStepIdx(i => (i + 1) % steps.length), 3200)
    return () => clearInterval(id)
  }, [steps.length])

  const agents = activeModels.length > 0 ? activeModels : [{ id: '—', name: '…', dot: '#98A1B0' }]

  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <style>{styles}</style>

      {/* Heading + elapsed counter */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="sp-orbit" aria-hidden="true">
            <span className="sp-orbit-core" />
            <span className="sp-orbit-ring" />
          </span>
          <span className="text-[12px] font-medium text-ink-2">{COPY[L].heading}</span>
        </div>
        <span className="font-mono text-[10.5px] text-ink-6 tabular-nums">
          {COPY[L].synth}… {seconds}s
        </span>
      </div>

      {/* Fleet agents lighting up in sequence */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        {agents.map((m, i) => (
          <span
            key={m.id}
            className="sp-agent flex items-center gap-[5px]"
            style={{ ['--sp-i' as string]: i, ['--sp-dot' as string]: m.dot || '#0B3A78' }}
          >
            <span className="sp-agent-dot w-[6px] h-[6px] rounded-full shrink-0" />
            <span className="sp-agent-name text-[11.5px] text-ink-4">{m.name}</span>
          </span>
        ))}
      </div>

      {/* Indeterminate shimmer bar — does NOT claim a fake % */}
      <div className="sp-track" aria-hidden="true">
        <div className="sp-track-fill" />
      </div>

      {/* Rotating reassuring caption */}
      <div className="h-[16px] overflow-hidden">
        <p key={stepIdx} className="sp-caption text-[11.5px] text-ink-5 leading-[16px]">
          {steps[stepIdx]}
          <span className="sp-caption-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      </div>
    </div>
  )
}

const styles = `
/* Orbit mark */
.sp-orbit { position: relative; display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; }
.sp-orbit-core { width: 6px; height: 6px; border-radius: 9999px; background: var(--color-accent, #0B3A78); }
.sp-orbit-ring { position: absolute; inset: 0; border-radius: 9999px; border: 1.5px solid transparent; border-top-color: var(--color-accent-over, #9DBDEB); }

/* Fleet agents: dim, then pulse "alive" in a staggered sweep */
.sp-agent-dot { background: var(--sp-dot); opacity: 0.35; }
.sp-agent-name { opacity: 0.55; }

/* Indeterminate shimmer track */
.sp-track { position: relative; height: 4px; width: 100%; border-radius: 9999px; background: var(--color-active-bg, #F4F5F7); overflow: hidden; }
.sp-track-fill { position: absolute; top: 0; height: 100%; width: 40%; border-radius: 9999px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent, #0B3A78) 55%, transparent), var(--color-accent, #0B3A78), color-mix(in srgb, var(--color-accent, #0B3A78) 55%, transparent), transparent);
  left: -40%; }

/* Caption fade/slide */
.sp-caption { transform: none; opacity: 1; }
.sp-caption-dots span { opacity: 0.4; }

@keyframes sp-spin { to { transform: rotate(360deg); } }
@keyframes sp-agent-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
@keyframes sp-agent-name-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@keyframes sp-sweep {
  0% { left: -45%; }
  100% { left: 105%; }
}
@keyframes sp-caption-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes sp-dot-blink {
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
}

@media (prefers-reduced-motion: no-preference) {
  .sp-orbit-ring { animation: sp-spin 1.4s linear infinite; }
  .sp-agent-dot { animation: sp-agent-pulse 2.4s ease-in-out infinite; animation-delay: calc(var(--sp-i) * 0.28s); }
  .sp-agent-name { animation: sp-agent-name-pulse 2.4s ease-in-out infinite; animation-delay: calc(var(--sp-i) * 0.28s); }
  .sp-track-fill { animation: sp-sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
  .sp-caption { animation: sp-caption-in 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
  .sp-caption-dots span { animation: sp-dot-blink 1.2s ease-in-out infinite; }
  .sp-caption-dots span:nth-child(2) { animation-delay: 0.16s; }
  .sp-caption-dots span:nth-child(3) { animation-delay: 0.32s; }
}

/* Reduced motion: static, legible fallback (no motion, full opacity) */
@media (prefers-reduced-motion: reduce) {
  .sp-agent-dot, .sp-agent-name, .sp-caption-dots span { opacity: 1; }
  .sp-track-fill { left: 0; width: 100%;
    background: color-mix(in srgb, var(--color-accent, #0B3A78) 45%, transparent); }
}
`

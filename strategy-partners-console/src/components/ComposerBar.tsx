'use client'
import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import type { Model } from '@/lib/types'
import { useLang } from '@/lib/lang'
import { getT } from '@/lib/i18n'

interface Props {
  activeModels: Model[]
  activeCount: number
  onSubmit?: (q: string) => void
  isRunning?: boolean
}

export function ComposerBar({ activeModels, activeCount, onSubmit, isRunning }: Props) {
  const { lang } = useLang()
  const t = getT(lang)
  const [value, setValue] = useState('')

  function submit() {
    const q = value.trim()
    if (!q || isRunning) return
    onSubmit?.(q)
    setValue('')
  }

  return (
    <div className="border-t border-border-base bg-app-bg px-[18px] py-[15px] shrink-0">
      <div className="max-w-[900px] mx-auto">
        <div className="bg-surface border border-border-input rounded-[10px] px-[15px] py-[7px] flex items-center gap-[11px]">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            disabled={isRunning}
            placeholder={isRunning ? t.maestroRunning : t.refineQ}
            className="flex-1 text-[13.5px] text-ink-0 placeholder:text-ink-6 bg-transparent outline-none disabled:opacity-50"
          />

          {/* Agent chip */}
          <div className="flex items-center gap-[6px] border border-border-base rounded-[7px] px-[8px] py-[4px] shrink-0">
            <div className="flex -space-x-[3px]">
              {activeModels.slice(0, 4).map(m => (
                <span
                  key={m.id}
                  className="w-[8px] h-[8px] rounded-full ring-1 ring-white"
                  style={{ backgroundColor: m.dot }}
                />
              ))}
            </div>
            <span className="font-mono text-[10.5px] text-ink-5">{t.agentCount(activeCount)}</span>
          </div>

          {/* Send */}
          <button
            onClick={submit}
            disabled={isRunning || !value.trim()}
            className="w-[35px] h-[35px] rounded-lg bg-accent flex items-center justify-center text-white hover:opacity-90 transition-opacity shrink-0 disabled:opacity-40"
            aria-label={t.export}
          >
            {isRunning
              ? <Loader2 size={16} strokeWidth={2} className="animate-spin" />
              : <ArrowRight size={16} strokeWidth={2} />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
